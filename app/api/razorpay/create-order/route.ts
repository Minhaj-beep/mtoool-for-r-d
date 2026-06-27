import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: Request) {
  try {
    const { plan_id } = await request.json();

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID missing' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 🔑 Fetch plan from DB (source of truth)
    const { data: plan, error: planError } =
      await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 404 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const receipt = `plan_${plan.code}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: plan.price_inr * 100, // ✅ DB-driven
      currency: 'INR',
      receipt,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
