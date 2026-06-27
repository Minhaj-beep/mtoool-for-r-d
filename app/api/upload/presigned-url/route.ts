// app/api/upload/presigned-url/route.ts (or wherever you keep it)
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { generatePresignedUploadUrl } from '@/lib/aws/s3';
import { canPerformAction } from '@/lib/subscription/plans';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'File name and type are required' }, { status: 400 });
    }

    // Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, subscription_plan, image_count')
      .eq('owner_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Enforce plan limits — read only
    const permissionCheck = canPerformAction(restaurant.subscription_plan, {
      type: 'upload_image',
      currentCount: restaurant.image_count,
    });

    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    // Generate S3 presigned URL
    const { uploadUrl, fileUrl } = await generatePresignedUploadUrl(
      restaurant.id,
      fileName,
      fileType
    );

    // IMPORTANT: do NOT update image_count here.
    // The image_count must be updated only when the dish row is created/updated/removed.

    return NextResponse.json({ uploadUrl, fileUrl });
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
