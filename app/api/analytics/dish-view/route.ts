import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    const { dish_id, restaurant_id } = await request.json();

    if (!dish_id || !restaurant_id) {
      return NextResponse.json(
        { error: 'Missing dish_id or restaurant_id' },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch restaurant subscription plan
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('subscription_plan')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 2️⃣ Only track for PRO users
    if (restaurant.subscription_plan === 'free') {
      return NextResponse.json({ ignored: true });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 3️⃣ Atomic upsert via RPC
    const { error: rpcError } = await supabase.rpc(
      'increment_dish_view',
      {
        p_dish_id: dish_id,
        p_restaurant_id: restaurant_id,
        p_day: today,
      }
    );

    if (rpcError) {
      console.error('increment_dish_view failed:', rpcError);
      return NextResponse.json(
        { error: 'Failed to track dish view' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Dish view tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
