import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const reminderDays = [7, 3, 1];
    const results = {
      reminders: 0,
      expired: 0,
      errors: [] as string[],
    };

    const { data: restaurants, error: fetchError } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        subscription_status,
        subscription_expires_at,
        users!restaurants_owner_id_fkey(email)
      `)
      .not('subscription_expires_at', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch restaurants: ${fetchError.message}`);
    }

    for (const restaurant of restaurants || []) {
      try {
        const expiryDate = new Date(restaurant.subscription_expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const userEmail = restaurant.users?.email;

        if (daysUntilExpiry === 0 && restaurant.subscription_status === 'active') {
          await supabase
            .from('restaurants')
            .update({ subscription_status: 'expired' })
            .eq('id', restaurant.id);

          await supabase
            .from('notifications')
            .insert({
              restaurant_id: restaurant.id,
              title: 'Subscription Expired',
              message: 'Your subscription has expired. Please renew to continue using our services.',
              type: 'subscription_expired',
              metadata: { expired_at: expiryDate.toISOString() },
            });

          results.expired++;

          console.log(`Marked restaurant ${restaurant.id} as expired`);
        } else if (reminderDays.includes(daysUntilExpiry) && restaurant.subscription_status === 'active') {
          const { data: existingNotifications } = await supabase
            .from('notifications')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('type', 'subscription_reminder')
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!existingNotifications || existingNotifications.length === 0) {
            await supabase
              .from('notifications')
              .insert({
                restaurant_id: restaurant.id,
                title: `Subscription Expiring in ${daysUntilExpiry} Day${daysUntilExpiry !== 1 ? 's' : ''}`,
                message: `Your subscription will expire on ${expiryDate.toLocaleDateString()}. Please renew to avoid service interruption.`,
                type: 'subscription_reminder',
                metadata: {
                  days_until_expiry: daysUntilExpiry,
                  expires_at: expiryDate.toISOString(),
                },
              });

            results.reminders++;

            console.log(`Created reminder for restaurant ${restaurant.id} (${daysUntilExpiry} days)`);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing restaurant ${restaurant.id}: ${error.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Subscription reminders error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});