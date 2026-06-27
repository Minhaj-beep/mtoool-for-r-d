import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { deleteS3Files } from '@/lib/aws/s3';

/* -------------------------------------------------------------------------- */
/*                          HELPERS                                            */
/* -------------------------------------------------------------------------- */

function extractS3Key(url: string) {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith('/')
      ? pathname.slice(1)
      : pathname;
  } catch {
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/*                          UPDATE CATEGORY                                    */
/* -------------------------------------------------------------------------- */

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

    const { data: category, error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                          DELETE CATEGORY                                    */
/* -------------------------------------------------------------------------- */

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

    // 🔑 Restaurant owned by user
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('id, image_count')
        .eq('owner_id', user.id)
        .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 📸 Get dish images under this category
    const { data: dishes, error: dishesError } =
      await supabase
        .from('dishes')
        .select('image_url')
        .eq('category_id', params.id)
        .not('image_url', 'is', null);

    if (dishesError) {
      return NextResponse.json(
        { error: dishesError.message },
        { status: 400 }
      );
    }

    // 🧹 Extract S3 keys
    const imageKeys =
      dishes
        ?.map((d) => d.image_url)
        .filter(Boolean)
        .map(extractS3Key) ?? [];

    // ☁️ Delete images from S3
    const { deleted, errors } = await deleteS3Files(imageKeys);

    if (errors.length > 0) {
      console.error('S3 delete errors:', errors);

      return NextResponse.json(
        {
          error: 'Some images could not be deleted',
          deleted,
          errors,
        },
        { status: 500 }
      );
    }

    // 🗑 Delete dishes
    await supabase
      .from('dishes')
      .delete()
      .eq('category_id', params.id);

    // 🗑 Delete category
    const { error: categoryError } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', params.id);

    if (categoryError) {
      return NextResponse.json(
        { error: categoryError.message },
        { status: 400 }
      );
    }

    // 📉 Update image count
    if (imageKeys.length > 0) {
      await supabase
        .from('restaurants')
        .update({
          image_count:
            Math.max(
              restaurant.image_count - imageKeys.length,
              0
            ),
        })
        .eq('id', restaurant.id);
    }

    return NextResponse.json({
      message:
        'Category, dishes, and images deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
