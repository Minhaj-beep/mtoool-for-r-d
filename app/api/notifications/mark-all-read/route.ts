import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

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

    const { data: userData } = await supabase
      .from('users')
      .select('restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData?.restaurant_id) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('restaurant_id', userData.restaurant_id)
      .eq('is_read', false);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
