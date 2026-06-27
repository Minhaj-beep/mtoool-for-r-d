import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { deleteS3File, extractS3Key } from '@/lib/aws/s3';


/* =====================================================
   UPDATE dish
===================================================== */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updates = await request.json();

    /* Extract variants safely */
    const variants = updates.variants;
    delete updates.variants;

    /* Get existing dish */
    const { data: existing } = await supabase
      .from('dishes')
      .select(`
        image_url,
        menu_categories (
          restaurant_id
        )
      `)
      .eq('id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      );
    }

    const prevImage = existing.image_url;
    const restaurantId =
      (existing as any).menu_categories.restaurant_id;

    const newImage =
      updates.image_url && updates.image_url.trim() !== ''
        ? updates.image_url
        : null;

    /* =============================
       IMAGE HANDLING
    ============================== */

    /* IMAGE REPLACED */
    if (prevImage && newImage && prevImage !== newImage) {
      const key = extractS3Key(prevImage);
      if (key) await deleteS3File(key);
    }

    /* IMAGE REMOVED */
    if (prevImage && !newImage) {
      const key = extractS3Key(prevImage);
      if (key) await deleteS3File(key);

      await supabase.rpc('adjust_image_count', {
        rid: restaurantId,
        delta: -1
      });
    }

    /* IMAGE ADDED */
    if (!prevImage && newImage) {
      await supabase.rpc('adjust_image_count', {
        rid: restaurantId,
        delta: 1
      });
    }

    if (!newImage) {
      delete updates.image_url;
    }

    /* =============================
       UPDATE DISH FIRST (IMPORTANT)
    ============================== */

    const { data: dish, error } = await supabase
      .from('dishes')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    /* =============================
       VALIDATE VARIANTS
    ============================== */

    if (
      variants &&
      variants.some((v: any) => !v.name || !v.price)
    ) {
      return NextResponse.json(
        { error: 'Invalid variants data' },
        { status: 400 }
      );
    }

    /* =============================
       UPDATE VARIANTS
    ============================== */

    if (variants !== undefined) {
      // Delete old variants
      const { error: deleteError } = await supabase
        .from('dish_variants')
        .delete()
        .eq('dish_id', params.id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 400 }
        );
      }

      // Insert new variants
      if (variants && variants.length > 0) {
        const variantRows = variants.map((v: any) => ({
          dish_id: params.id,
          name: v.name,
          price: Number(v.price),
        }));

        const { error: variantError } = await supabase
          .from('dish_variants')
          .insert(variantRows);

        if (variantError) {
          return NextResponse.json(
            { error: variantError.message },
            { status: 400 }
          );
        }
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


/* =====================================================
   DELETE dish
===================================================== */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

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


    const { data: dish } = await supabase
      .from('dishes')
      .select(`
        image_url,
        menu_categories (
          restaurant_id
        )
      `)
      .eq('id', params.id)
      .single();


    if (!dish) {

      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      );

    }



    const imageUrl = dish.image_url;

    const restaurantId =
      (dish as any).menu_categories.restaurant_id;



    if (imageUrl) {

      const key = extractS3Key(imageUrl);

      if (key) {
        await deleteS3File(key);
      }


      await supabase.rpc(
        'adjust_image_count',
        {
          rid: restaurantId,
          delta: -1
        }
      );

    }



    await supabase
      .from('dishes')
      .delete()
      .eq('id', params.id);



    return NextResponse.json({
      success: true
    });

  }
  catch (err) {

    console.error(err);

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );

  }

}
