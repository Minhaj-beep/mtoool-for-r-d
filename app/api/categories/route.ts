import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { canPerformAction } from '@/lib/subscription/plans';

/* -------------------------------------------------
   GET /api/categories?restaurantId=uuid
-------------------------------------------------- */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   POST /api/categories
-------------------------------------------------- */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    /* 1️⃣ Auth check */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    /* 2️⃣ Parse body */
    const {
      name,
      restaurant_id,
      display_order,
      parent_category_id,
    } = await request.json();

    if (!name || !restaurant_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    /* 3️⃣ Load restaurant + subscription */
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, subscription_plan')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    /* 4️⃣ Count existing categories */
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurant_id);

    if (categoriesError) {
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 400 }
      );
    }

    const categoryCount = existingCategories.length;

    /* 5️⃣ Subscription enforcement */
    const permissionCheck = canPerformAction(
      restaurant.subscription_plan,
      {
        type: 'create_category',
        currentCount: categoryCount,
      }
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.reason },
        { status: 403 }
      );
    }

    /* 6️⃣ Create category */
    const { data: category, error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        name,
        restaurant_id,
        display_order: display_order ?? 0,
        parent_category_id: parent_category_id ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
