// app/api/cron/subscription-reminders/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REMINDER_DAYS = [7, 3, 2, 1];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = Date.now();

  for (const days of REMINDER_DAYS) {
    const from = new Date(now + (days - 1) * 86400000).toISOString();
    const to = new Date(now + days * 86400000).toISOString();

    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name, subscription_expires_at')
      .gte('subscription_expires_at', from)
      .lt('subscription_expires_at', to);

    for (const r of restaurants ?? []) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'subscription_reminder')
        .eq('restaurant_id', r.id)
        .eq('metadata->>days_remaining', String(days))
        .limit(1);

      if (existing?.length) continue;

      await supabase.from('notifications').insert({
        restaurant_id: r.id,
        title: `Subscription expiring in ${days} day${days !== 1 ? 's' : ''}`,
        message: `Your subscription will expire on ${new Date(
          r.subscription_expires_at
        ).toLocaleDateString()}.`,
        type: 'subscription_reminder',
        is_read: false,
        metadata: {
          days_remaining: days,
          expires_at: r.subscription_expires_at,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
