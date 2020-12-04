import { httpGet, httpPost, httpDelete } from './http';


export async function cancelSubscription(id) {
  return httpPost(`subscription/${id}/cancel`);
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

export async function commitSubscription(id, payload) {
  return httpPost(`subscription/${id}/commit`, payload);
}

export async function confirmSubscriptionPayment(paymentId, payload) {
  return httpPost(`subscription/payment/${paymentId}/confirm`, payload);
}

export async function calculatePaymentDetail(type, symbols?, preferToUseBalance) {
  return httpPost(`subscription/calc`, { type, symbols, preferToUseBalance });
}

export async function fetchStripeCheckoutSession() {
  return httpGet(`/checkout/stripe/session`);
}