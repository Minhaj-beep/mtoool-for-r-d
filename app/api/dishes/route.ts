import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { canPerformAction } from '@/lib/subscription/plans';

/* =====================================================
   GET dishes by category
===================================================== */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ dishes: data });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/* =====================================================
   CREATE dish
===================================================== */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      name,
      description,
      price,
      image_url,
      is_available,
      category_id,
      variants
    } = body;

    /* =============================
       VALIDATION
    ============================== */

    const hasVariants = Array.isArray(variants) && variants.length > 0;
    const hasBasePrice = price !== undefined && price !== null && price !== '';

    if (!name || (!hasBasePrice && !hasVariants) || !category_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (
      hasVariants &&
      variants.some((v: any) => !v?.name || v?.price === undefined || v?.price === null || v?.price === '')
    ) {
      return NextResponse.json(
        { error: 'Invalid variants data' },
        { status: 400 }
      );
    }

    /* =============================
       GET RESTAURANT + PLAN
    ============================== */

    const { data: category, error: categoryError } = await supabase
      .from('menu_categories')
      .select('restaurant_id, restaurants(subscription_plan)')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const restaurantId = category.restaurant_id;
    const plan = (category as any).restaurants?.subscription_plan;

    /* =============================
       CHECK LIMITS
    ============================== */

    const { data: existing, error: existingError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurantId);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 400 }
      );
    }

    const categoryIds = (existing ?? []).map((c: any) => c.id);

    let dishCount = 0;

    if (categoryIds.length > 0) {
      const { data: dishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id')
        .in('category_id', categoryIds);

      if (dishesError) {
        return NextResponse.json(
          { error: dishesError.message },
          { status: 400 }
        );
      }

      dishCount = (dishes ?? []).length;
    }

    const permission = canPerformAction(plan, {
      type: 'create_dish',
      currentCount: dishCount
    });

    if (!permission.allowed) {
      return NextResponse.json(
        { error: permission.reason },
        { status: 403 }
      );
    }

    /* =============================
       PREP IMAGE CHECK
    ============================== */

    const hasImage =
      typeof image_url === 'string' &&
      image_url.trim().length > 0;

    /* =============================
       CREATE DISH
    ============================== */

    const { data: dish, error: dishError } = await supabase
      .from('dishes')
      .insert({
        name,
        description,
        price: hasVariants ? 0 : Number(price),
        image_url: hasImage ? image_url.trim() : null,
        is_available: is_available ?? true,
        category_id
      })
      .select()
      .single();

    if (dishError || !dish) {
      return NextResponse.json(
        { error: dishError?.message || 'Failed to create dish' },
        { status: 400 }
      );
    }

    /* =============================
       CREATE VARIANTS (if any)
    ============================== */

    if (hasVariants) {
      const variantRows = variants.map((v: any) => ({
        dish_id: dish.id,
        name: String(v.name).trim(),
        price: Number(v.price)
      }));

      const { error: variantError } = await supabase
        .from('dish_variants')
        .insert(variantRows);

      if (variantError) {
        await supabase
          .from('dishes')
          .delete()
          .eq('id', dish.id);

        return NextResponse.json(
          { error: variantError.message },
          { status: 400 }
        );
      }
    }

    /* =============================
       IMAGE COUNT
    ============================== */

    if (hasImage) {
      console.log("Has image count: ", hasImage)
      const { error: rpcError } = await supabase.rpc(
        'adjust_image_count',
        {
          rid: restaurantId,
          delta: 1
        }
      );

      if (rpcError) {
        console.error('Image count RPC failed:', rpcError);

        // optional rollback if image count is critical
        // await supabase.from('dishes').delete().eq('id', dish.id);
        // return NextResponse.json(
        //   { error: 'Failed to update image count' },
        //   { status: 400 }
        // );
      }
    }

    /* =============================
       RESPONSE
    ============================== */

    return NextResponse.json({ dish });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}