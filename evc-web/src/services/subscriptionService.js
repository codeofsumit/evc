import { httpGet, httpPost, request } from './http';

export async function downloadReceipt(paymentId) {
  const path = `subscription/${paymentId}/receipt`;
  return request('GET', path, null, null, 'blob');
}

export async function changeSubscriptionRecurring(id, recurring) {
  return httpPost(`subscription/${id}/recurring`, {recurring});
}

export async function getMyCurrentSubscription() {
  return httpGet(`subscription`);
}

export async function listMySubscriptionHistory() {
  return httpGet(`subscription/history`);
}

export async function listUserSubscriptionHistory(userId) {
  return httpGet(`/user/${userId}/subscription`);
}

export async function provisionSubscription(payload) {
  return httpPost(`subscription`, payload);
}

export async function confirmSubscriptionPayment(paymentId, payload) {
  return httpPost(`subscription/payment/${paymentId}/confirm`, payload);
}

export async function calculatePaymentDetail(type, preferToUseCredit) {
  return httpPost(`subscription/preview`, { type, preferToUseCredit });
}

export async function fetchStripeCheckoutSession() {
  return httpGet(`/checkout/stripe/session`);
}