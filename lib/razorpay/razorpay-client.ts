// qr-menu/lib/razorpay/razorpay-client.ts
import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * Create a one-time order (for payment).
 * amount is in smallest currency unit (e.g. INR paise)
 */
export async function createOrder(amount: number, currency = 'INR', receipt?: string) {
  const opts = {
    amount, // integer: paise for INR (e.g. Rs 100 -> 10000)
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1,
  };
  return await razorpay.orders.create(opts);
}

/**
 * (Optional) Create a subscription when you have created a plan in Razorpay dashboard.
 * plan_id example: "plan_XXXXXX"
 */
export async function createSubscription(planId: string, totalCount?: number) {
  const opts: any = {
    plan_id: planId,
    customer_notify: 1,
  };
  if (totalCount) opts.total_count = totalCount;
  return await razorpay.subscriptions.create(opts);
}
