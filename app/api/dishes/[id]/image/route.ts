import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { deleteS3File, extractS3Key } from '@/lib/aws/s3';

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

    /* Get dish */
    const { data: dish, error } = await supabase
      .from('dishes')
      .select(`
        image_url,
        menu_categories (
          restaurant_id
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !dish) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      );
    }

    if (!dish.image_url) {
      return NextResponse.json(
        { error: 'No image to delete' },
        { status: 400 }
      );
    }

    const imageUrl = dish.image_url;
    const restaurantId =
      (dish as any).menu_categories.restaurant_id;

    /* Delete from S3 */
    const key = extractS3Key(imageUrl);

    if (key) {
      await deleteS3File(key);
    }

    /* Update DB: remove image */
    await supabase
      .from('dishes')
      .update({
        image_url: null,
        updated_at: new Date()
      })
      .eq('id', params.id);

    /* Update image count */
    await supabase.rpc('adjust_image_count', {
      rid: restaurantId,
      delta: -1
    });

    return NextResponse.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}