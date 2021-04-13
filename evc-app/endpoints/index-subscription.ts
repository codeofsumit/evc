import { Connection, getManager, getRepository, LessThan, getConnection, In } from 'typeorm';
import errorToJson from 'error-to-json';
import { connectDatabase } from '../src/db';
import { Subscription } from '../src/entity/Subscription';
import { SubscriptionStatus } from '../src/types/SubscriptionStatus';
import { UserCreditTransaction } from '../src/entity/UserCreditTransaction';
import { SubscriptionType } from '../src/types/SubscriptionType';
import { Payment } from '../src/entity/Payment';
import { User } from '../src/entity/User';
import { PaymentStatus } from '../src/types/PaymentStatus';
import * as moment from 'moment';
import { calculateNewSubscriptionPaymentDetail } from '../src/utils/calculateNewSubscriptionPaymentDetail';
import { Role } from '../src/types/Role';
import { start } from './jobStarter';
import { enqueueEmail } from '../src/services/emailService';
import { EmailTemplateType } from '../src/types/EmailTemplateType';
import { AliveSubscriptionInformation } from '../src/entity/views/AliveSubscriptionInformation';
import { EmailRequest } from '../src/types/EmailRequest';
import { getEmailRecipientName } from '../src/utils/getEmailRecipientName';
import { PaymentMethod } from '../src/types/PaymentMethod';
import { logError } from '../src/utils/logger';
import { SysLog } from '../src/entity/SysLog';
import { assert } from '../src/utils/assert';
import { chargeStripeForPayment } from '../src/services/stripeService';
import { getUtcNow } from '../src/utils/getUtcNow';
import { RevertableCreditTransactionInformation } from '../src/entity/views/RevertableCreditTransactionInformation';

const JOB_NAME = 'daily-subscription';

function getSubscriptionName(type: SubscriptionType) {
  switch (type) {
    case SubscriptionType.Free:
      return 'Free'
    case SubscriptionType.UnlimitedMontly:
      return 'Pro Member Monthly'
    case SubscriptionType.UnlimitedYearly:
      return 'Pro Member Annually'
    default:
      assert(false, 500, `Unsupported subscription type ${type}`);
  }
};

async function enqueueEmailTasks(template: EmailTemplateType, list: AliveSubscriptionInformation[]) {
  for (const item of list) {
    const emailReq: EmailRequest = {
      to: item.email,
      template: template,
      shouldBcc: true,
      vars: {
        toWhom: getEmailRecipientName(item),
        subscriptionId: item.subscriptionId,
        subscriptionType: getSubscriptionName(item.subscriptionType),
        start: moment(item.start).format('D MMM YYYY'),
        end: moment(item.end).format('D MMM YYYY'),
      }
    };
    await enqueueEmail(emailReq);
  }
}

async function enqueueRecurringSucceededEmail(info: AliveSubscriptionInformation, subscription: Subscription, paidAmount: number, creditDeduction: number) {
  const emailReq: EmailRequest = {
    to: info.email,
    template: EmailTemplateType.SubscriptionRecurringAutoPaySucceeded,
    shouldBcc: true,
    vars: {
      toWhom: getEmailRecipientName(info),
      subscriptionId: info.subscriptionId,
      subscriptionType: getSubscriptionName(info.subscriptionType),
      start: moment(subscription.start).format('D MMM YYYY'),
      end: moment(subscription.end).format('D MMM YYYY'),
      paidAmount,
      creditDeduction
    }
  };
  await enqueueEmail(emailReq);
}

async function enqueueRecurringFailedEmail(info: AliveSubscriptionInformation, subscription: Subscription, paidAmount: number, creditDeduction: number) {
  const emailReq: EmailRequest = {
    to: info.email,
    template: EmailTemplateType.SubscriptionRecurringAutoPayFailed,
    shouldBcc: true,
    vars: {
      toWhom: getEmailRecipientName(info),
      subscriptionId: info.subscriptionId,
      subscriptionType: getSubscriptionName(info.subscriptionType),
      start: moment(subscription.start).format('D MMM YYYY'),
      end: moment(subscription.end).format('D MMM YYYY'),
      paidAmount,
      creditDeduction
    }
  };
  await enqueueEmail(emailReq);
}

async function expireSubscriptions() {
  const tran = getConnection().createQueryRunner();

  try {
    await tran.startTransaction();
    const list = await getRepository(AliveSubscriptionInformation)
      .createQueryBuilder()
      .where('"end" < now()')
      .getMany();

    if (list.length) {
      // Set subscriptions to be expired
      const subscriptionIds = list.map(x => x.subscriptionId);
      await tran.manager.getRepository(Subscription).update(subscriptionIds, { status: SubscriptionStatus.Expired });

      // Set user's role to Free
      const userIds = list.map(x => x.userId);
      await tran.manager.getRepository(User).update(userIds, { role: Role.Free })
    }

    tran.commitTransaction();

    enqueueEmailTasks(EmailTemplateType.SubscriptionExpired, list);
  } catch {
    tran.rollbackTransaction();
  }
}


async function sendAlertForNonRecurringExpiringSubscriptions() {
  const list = await getRepository(AliveSubscriptionInformation)
    .createQueryBuilder()
    .where('recurring = FALSE')
    .andWhere(`now() between "end" - "alertDays" * INTERVAL '1 day' and "end"`)
    .getMany();

  enqueueEmailTasks(EmailTemplateType.SubscriptionExpiring, list);
}

async function getPreviousStripePaymentInfo(subscription: Subscription) {
  // TODO: Call API to pay by card
  const lastPaidPayment = await getManager().getRepository(Payment).findOne({
    where: {
      subscriptionId: subscription.id,
      status: PaymentStatus.Paid,
    },
    order: {
      paidAt: 'DESC'
    }
  });
  const { stripeCustomerId, stripePaymentMethodId } = lastPaidPayment;
  return { stripeCustomerId, stripePaymentMethodId };
}

function extendSubscriptionEndDate(subscription: Subscription) {
  const { end, type } = subscription;
  let newEnd = end;
  switch (type) {
    case SubscriptionType.UnlimitedMontly:
      newEnd = moment(end).add(1, 'month').toDate();
      break;
    case SubscriptionType.UnlimitedYearly:
      newEnd = moment(end).add(12, 'month').toDate();
    default:
      throw new Error(`Unkonwn subscription type ${type}`);
  }

  subscription.end = newEnd;
  subscription.status = SubscriptionStatus.Alive;
}

async function renewRecurringSubscription(info: AliveSubscriptionInformation) {
  const { subscriptionId, userId } = info;
  const subscription = await getRepository(Subscription).findOne(subscriptionId)

  const tran = getConnection().createQueryRunner();
  const { creditDeductAmount, additionalPay } = await calculateNewSubscriptionPaymentDetail(
    userId,
    subscription.type,
    true
  );
  const { stripeCustomerId, stripePaymentMethodId } = await getPreviousStripePaymentInfo(subscription);
  assert(stripeCustomerId, 500, `Cannot get previous stripeCustomerId for subscription ${subscription.id}`)
  assert(stripePaymentMethodId, 500, `Cannot get previous stripePaymentMethodId for subscription ${subscription.id}`)

  let creditTransaction: UserCreditTransaction = null;
  if (creditDeductAmount) {
    creditTransaction = new UserCreditTransaction();
    creditTransaction.userId = userId;
    creditTransaction.amount = -1 * creditDeductAmount;
    creditTransaction.type = 'recurring';
  }

  const payment = new Payment();
  payment.subscription = subscription;
  payment.userId = userId;
  payment.creditTransaction = creditTransaction;
  payment.amount = additionalPay;
  payment.method = additionalPay ? PaymentMethod.Card : PaymentMethod.Credit;
  payment.status = PaymentStatus.Pending;
  payment.stripeCustomerId = stripeCustomerId;
  payment.stripePaymentMethodId = stripePaymentMethodId;
  payment.auto = true;

  if (additionalPay) {
    const rawResponse = await chargeStripeForPayment(payment, false);
    assert(rawResponse.status === 'succeeded', 500, `Failed to auto charge stripe for subscription ${subscription.id}`);
    payment.rawResponse = rawResponse;
  }
  payment.status = PaymentStatus.Paid;
  payment.paidAt = getUtcNow();

  extendSubscriptionEndDate(subscription);

  try {
    await tran.startTransaction();

    if (creditDeductAmount) {
      await tran.manager.save(creditTransaction);
    }
    await tran.manager.save(payment);
    await tran.manager.save(subscription);

    await tran.commitTransaction();
    await enqueueRecurringSucceededEmail(info, subscription, additionalPay, creditDeductAmount);
  } catch (err) {
    await tran.rollbackTransaction();
    await enqueueRecurringFailedEmail(info, subscription, additionalPay, creditDeductAmount);
  }
}

async function handleRecurringPayments() {
  const list = await getRepository(AliveSubscriptionInformation)
    .createQueryBuilder()
    .where('recurring = TRUE')
    .andWhere('"end" <= now()')
    // .leftJoinAndSelect('payments', 'payment')
    .getMany();

  for (const item of list) {
    try {
      await renewRecurringSubscription(item);
    } catch (err) {
      const sysLog = new SysLog();
      sysLog.level = 'autopay_falied';
      sysLog.message = 'Recurring auto pay failed';
      sysLog.req = item;
      await getRepository(SysLog).insert(sysLog);
    }
  }
}

async function timeoutProvisioningSubscriptions() {
  const list = await getRepository(RevertableCreditTransactionInformation).find({});
  const creditTransactions = list.map(x => {
    const entity = new UserCreditTransaction();
    entity.userId = x.userId;
    entity.revertedCreditTransactionId = x.creditTransactionId;
    entity.amount = -1 * x.amount;
    entity.type = 'revert';
    return entity;
  });

  const subscriptionIds = list.map(x => x.subscriptionId);

  await getManager().transaction(async m => {
    await m.save(creditTransactions);
    m.update(Subscription, {id: In(subscriptionIds)}, {status: SubscriptionStatus.Timeout});
  });
}

start(JOB_NAME, async () => {
  console.log('Starting recurring payments');
  await handleRecurringPayments();
  console.log('Finished recurring payments');

  console.log('Starting alerting expiring subscriptions');
  await sendAlertForNonRecurringExpiringSubscriptions();
  console.log('Finished alerting expiring subscriptions');

  console.log('Starting expiring subscriptions');
  await expireSubscriptions();
  console.log('Finished expiring subscriptions');

  console.log('Starting expiring subscriptions');
  await timeoutProvisioningSubscriptions();
  console.log('Finished expiring subscriptions');
}, { daemon: false });