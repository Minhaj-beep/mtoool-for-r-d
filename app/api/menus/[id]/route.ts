import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updates = await request.json();

    // 🔑 Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 🔁 If activating a menu, deactivate others
    if (updates.is_active) {
      await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('restaurant_id', restaurant.id);
    }

    // ✏️ Update menu owned by this restaurant
    const { data: menu, error } = await supabase
      .from('menus')
      .update({
        ...updates,
        // remove this line if column doesn't exist
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id) // 🔐 ownership check
      .select()
      .single();

    if (error || !menu) {
      return NextResponse.json(
        { error: error?.message || 'Menu not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({ menu });
  } catch (error) {
    console.error('Update menu error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 🔑 Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 🗑️ Delete menu owned by this restaurant
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id); // 🔐 ownership check

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Menu deleted successfully',
    });
  } catch (error) {
    console.error('Delete menu error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
