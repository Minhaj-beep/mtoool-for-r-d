import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import {
  createCheckoutSession,
  createStripeCustomer,
} from '@/lib/stripe/stripe-client';

export async function POST(request: NextRequest) {
  try {
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

    const { priceId, plan } = await request.json();

    if (!priceId || !plan) {
      return NextResponse.json(
        { error: 'Price ID and plan are required' },
        { status: 400 }
      );
    }

    // 🔑 Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    let stripeCustomerId = restaurant.stripe_customer_id;

    // 🧾 Create Stripe customer if missing
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        user.email!,
        restaurant.name
      );

      stripeCustomerId = customer.id;

      await supabase
        .from('restaurants')
        .update({
          stripe_customer_id: stripeCustomerId,
        })
        .eq('id', restaurant.id);
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription`;

    const session = await createCheckoutSession(
      stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({
      sessionUrl: session.url,
    });
  } catch (error) {
    console.error(
      'Create checkout session error:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
