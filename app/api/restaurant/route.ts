import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    // 1️⃣ Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2️⃣ Get restaurant owned by this user
    const { data: restaurant, error } =
      await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    // 1️⃣ Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2️⃣ Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 3️⃣ Read updates from request
    const updates = await request.json();

    // 4️⃣ Update restaurant
    const { data: updatedRestaurant, error } =
      await supabase
        .from('restaurants')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id)
        .select()
        .single();

    if (error || !updatedRestaurant) {
      return NextResponse.json(
        { error: error?.message || 'Update failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ restaurant: updatedRestaurant });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
