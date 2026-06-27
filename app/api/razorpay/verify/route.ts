import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(req: Request) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan_id,
      mode, // 'upgrade' | 'extend'
    } = await req.json();

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature ||
      !plan_id
    ) {
      return NextResponse.json(
        { error: 'Missing payment data' },
        { status: 400 }
      );
    }

    // 🔐 Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 🔑 Fetch restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select(
        'id, subscription_plan, subscription_cycle, subscription_started_at, subscription_expires_at'
      )
      .eq('owner_id', user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 🔑 Fetch plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 404 }
      );
    }

    const now = new Date();

    // ⏱ Determine expiry base
    const baseDate =
      restaurant.subscription_expires_at &&
      new Date(restaurant.subscription_expires_at) > now
        ? new Date(restaurant.subscription_expires_at)
        : now;

    const expiresAt = new Date(baseDate);
    expiresAt.setDate(
      expiresAt.getDate() + plan.duration_days
    );

    // 🧠 Determine started_at
    const startedAt =
      mode === 'extend' &&
      restaurant.subscription_expires_at &&
      new Date(restaurant.subscription_expires_at) > now
        ? restaurant.subscription_started_at
        : now.toISOString();

    // 🧠 Protect plan on extend
    const finalPlan =
      mode === 'extend'
        ? restaurant.subscription_plan
        : plan.code;

    const finalCycle =
      mode === 'extend'
        ? restaurant.subscription_cycle
        : plan.billing_cycle;

    // 💾 Update restaurant
    const { error } = await supabase
      .from('restaurants')
      .update({
        subscription_plan: finalPlan,
        subscription_cycle: finalCycle,
        subscription_status: 'active',
        subscription_started_at: startedAt,
        subscription_expires_at: expiresAt.toISOString(),
        razorpay_order_id,
        razorpay_payment_id,
      })
      .eq('id', restaurant.id);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('verify error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
