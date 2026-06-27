import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { canPerformAction } from '@/lib/subscription/plans';

export async function GET() {
  try {
    const supabase = createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('AUTH USER:', user)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('AUTH USER ID:', user.id);

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const { data: menus, error: menusError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('order_index');

    if (menusError) {
      return NextResponse.json(
        { error: menusError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ menus });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('AUTH USER:', user)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, subscription_plan')
      .eq('owner_id', user.id)
      .single();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurant.id);

    const permissionCheck = canPerformAction(
      restaurant.subscription_plan,
      {
        type: 'create_menu',
        currentCount: existing?.length ?? 0,
      }
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.reason },
        { status: 403 }
      );
    }

    const { data: menu, error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        name,
        restaurant_id: restaurant.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ menu });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
