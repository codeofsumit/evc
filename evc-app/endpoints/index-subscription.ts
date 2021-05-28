import { getManager, getRepository, getConnection, In, Not, IsNull } from 'typeorm';
import { Subscription } from '../src/entity/Subscription';
import { SubscriptionStatus } from '../src/types/SubscriptionStatus';
import { UserCreditTransaction } from '../src/entity/UserCreditTransaction';
import { SubscriptionType } from '../src/types/SubscriptionType';
import { Payment } from '../src/entity/Payment';
import { User } from '../src/entity/User';
import { PaymentStatus } from '../src/types/PaymentStatus';
import * as moment from 'moment';
import { getNewSubscriptionPaymentInfo } from '../src/utils/getNewSubscriptionPaymentInfo';
import { Role } from '../src/types/Role';
import { start } from './jobStarter';
import { enqueueEmail } from '../src/services/emailService';
import { EmailTemplateType } from '../src/types/EmailTemplateType';
import { UserAllAliveSubscriptionWithProfile } from '../src/entity/views/UserAllAliveSubscriptionWithProfile';
import { EmailRequest } from '../src/types/EmailRequest';
import { getEmailRecipientName } from '../src/utils/getEmailRecipientName';
import { PaymentMethod } from '../src/types/PaymentMethod';
import { SysLog } from '../src/entity/SysLog';
import { assert } from '../src/utils/assert';
import { chargeStripeForCardPayment } from '../src/services/stripeService';
import { getUtcNow } from '../src/utils/getUtcNow';
import { RevertableCreditTransaction } from '../src/entity/views/RevertableCreditTransaction';
import { notExistsQuery } from '../src/utils/existsQuery';
import { UserCurrentSubscription } from '../src/entity/views/UserCurrentSubscription';
import { getSubscriptionPrice } from '../src/utils/getSubscriptionPrice';

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

async function enqueueEmailTasks(template: EmailTemplateType, list: UserAllAliveSubscriptionWithProfile[]) {
  for (const subscriptionInfo of list) {
    const emailReq: EmailRequest = {
      to: subscriptionInfo.email,
      template: template,
      shouldBcc: true,
      vars: {
        toWhom: getEmailRecipientName(subscriptionInfo),
        subscriptionId: subscriptionInfo.subscriptionId,
        subscriptionType: getSubscriptionName(subscriptionInfo.type),
        start: moment(subscriptionInfo.start).format('D MMM YYYY'),
        end: moment(subscriptionInfo.end).format('D MMM YYYY'),
      }
    };
    await enqueueEmail(emailReq);
  }
}

async function enqueueRecurringSucceededEmail(activeOne: UserAllAliveSubscriptionWithProfile, payment: Payment, price: number) {
  const emailReq: EmailRequest = {
    to: activeOne.email,
    template: EmailTemplateType.SubscriptionRecurringAutoPaySucceeded,
    shouldBcc: true,
    vars: {
      toWhom: getEmailRecipientName(activeOne),
      subscriptionId: activeOne.subscriptionId,
      subscriptionType: getSubscriptionName(activeOne.type),
      start: moment(payment.start).format('D MMM YYYY'),
      end: moment(payment.end).format('D MMM YYYY'),
      paidAmount: price,
      creditDeduction: 0
    }
  };
  await enqueueEmail(emailReq);
}

async function enqueueRecurringFailedEmail(activeOne: UserAllAliveSubscriptionWithProfile, payment: Payment, price: number) {
  const emailReq: EmailRequest = {
    to: activeOne.email,
    template: EmailTemplateType.SubscriptionRecurringAutoPayFailed,
    shouldBcc: true,
    vars: {
      toWhom: getEmailRecipientName(activeOne),
      subscriptionId: activeOne.subscriptionId,
      subscriptionType: getSubscriptionName(activeOne.type),
      start: moment(payment.start).format('D MMM YYYY'),
      end: moment(payment.end).format('D MMM YYYY'),
      paidAmount: price,
      creditDeduction: 0
    }
  };
  await enqueueEmail(emailReq);
}

async function expireSubscriptions() {
  const tran = getConnection().createQueryRunner();

  try {
    await tran.startTransaction();
    const list = await getRepository(UserAllAliveSubscriptionWithProfile)
      .createQueryBuilder()
      .where('"end" < CURRENT_DATE')
      .getMany();

    if (list.length) {
      // Set subscriptions to be expired
      const subscriptionIds = list.map(x => x.subscriptionId);
      await tran.manager.update(Subscription, subscriptionIds, { status: SubscriptionStatus.Expired });

      // Set user's role to Free
      const userIds = list.map(x => x.userId);
      await tran.manager.update(User, userIds, { role: Role.Free })
    }

    tran.commitTransaction();

    enqueueEmailTasks(EmailTemplateType.SubscriptionExpired, list);
  } catch {
    tran.rollbackTransaction();
  }
}


async function sendAlertForNonRecurringExpiringSubscriptions() {
  const list = await getRepository(UserAllAliveSubscriptionWithProfile)
    .createQueryBuilder()
    .where('recurring = FALSE')
    .andWhere(`"end" - CURRENT_DATE = ANY(ARRAY[1, 3, 7])`)
    .getMany();

  enqueueEmailTasks(EmailTemplateType.SubscriptionExpiring, list);
}

async function getPreviousPaymentInfo(subscription: Subscription) {
  // TODO: Call API to pay by card
  const lastPaidPayment = await getManager()
    .getRepository(Payment)
    .findOne({
      where: {
        subscriptionId: subscription.id,
        status: PaymentStatus.Paid,
        stripeCustomerId: Not(IsNull()),
        stripePaymentMethodId: Not(IsNull()),
      },
      order: {
        paidAt: 'DESC'
      }
    });
  const { stripeCustomerId, stripePaymentMethodId, geo } = lastPaidPayment || {};

  assert(stripeCustomerId, 500, `Cannot get previous stripeCustomerId for subscription ${subscription.id}`)
  assert(stripePaymentMethodId, 500, `Cannot get previous stripePaymentMethodId for subscription ${subscription.id}`)
  assert(geo, 500, `Cannot get previous geo for subscription ${subscription.id}`)

  return { stripeCustomerId, stripePaymentMethodId, geo };
}

async function renewRecurringSubscription(targetSubscription: UserAllAliveSubscriptionWithProfile) {
  const { subscriptionId, userId, type } = targetSubscription;
  const subscription = await getRepository(Subscription).findOne({
    id: subscriptionId,
    recurring: true,
  });

  const tran = getConnection().createQueryRunner();
  const price = getSubscriptionPrice(type);

  const { stripeCustomerId, stripePaymentMethodId, geo } = await getPreviousPaymentInfo(subscription);

  const startDate = moment(targetSubscription.end).add(1, 'day').toDate();
  const endDate = moment(startDate).add(1, type === SubscriptionType.UnlimitedYearly ? 'year' : 'month').add(-1, 'day').toDate();
  const payment = new Payment();
  payment.subscription = subscription;
  payment.creditTransaction = null;
  payment.userId = userId;
  payment.start = startDate;
  payment.end = endDate
  payment.amount = price;
  payment.method = PaymentMethod.Card;
  payment.status = PaymentStatus.Pending;
  payment.stripeCustomerId = stripeCustomerId;
  payment.stripePaymentMethodId = stripePaymentMethodId;
  payment.auto = true;
  payment.geo = geo;

  const rawResponse = await chargeStripeForCardPayment(payment, false);
  assert(rawResponse.status === 'succeeded', 500, `Failed to auto charge stripe for subscription ${subscription.id}`);
  payment.rawResponse = rawResponse;
  payment.status = PaymentStatus.Paid;
  payment.paidAt = getUtcNow();

  subscription.status = SubscriptionStatus.Alive;
  subscription.end = endDate;

  try {
    await tran.startTransaction();

    await tran.manager.save(payment);
    await tran.manager.save(subscription);
    await tran.manager.update(User, subscription.userId, { role: Role.Member });

    await tran.commitTransaction();
    await enqueueRecurringSucceededEmail(targetSubscription, payment, price);
  } catch (err) {
    await tran.rollbackTransaction();
    await enqueueRecurringFailedEmail(targetSubscription, payment, price);
  }
}

async function handleRecurringPayments() {
  const list = await getRepository(UserAllAliveSubscriptionWithProfile)
    .createQueryBuilder()
    .where('recurring = TRUE')
    .andWhere('"end" <= CURRENT_DATE')
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
  const list = await getRepository(RevertableCreditTransaction).find({});
  if (!list.length) {
    return;
  }

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
    m.update(Subscription, { id: In(subscriptionIds) }, { status: SubscriptionStatus.Timeout });
  });
}

async function revokeUnpaidUsersRole() {
  await getManager().transaction(async m => {
    const users = await m
      .createQueryBuilder()
      .from(User, 'u')
      .where(`role = '${Role.Member}'`)
      .andWhere(`"deletedAt" IS NULL`)
      .andWhere(
        notExistsQuery(
          getRepository(UserCurrentSubscription)
            .createQueryBuilder('s')
            .where(`u.id = s."userId"`)
        )
      )
      .select('id')
      .execute();

    if (users.length) {
      const userIds = users.map(u => u.id);
      await m.update(User, userIds, { role: Role.Free });
    }
  })
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

  console.log('Starting revoking unpaid users');
  await revokeUnpaidUsersRole();
  console.log('Finished revoking unpaid users');

  console.log('Starting reverting timed out subscriptions');
  await timeoutProvisioningSubscriptions();
  console.log('Finished reverting timed out subscriptions');
}, { daemon: false });