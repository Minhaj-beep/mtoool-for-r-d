import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { generateQRCode } from '@/lib/qr/qr-generator';

export async function POST(request: NextRequest) {
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
    const { data: restaurant, error } =
      await supabase
        .from('restaurants')
        .select('slug')
        .eq('owner_id', user.id)
        .single();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/menu/${restaurant.slug}`;

    const qrCodeDataUrl = await generateQRCode(menuUrl);

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      menuUrl,
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
