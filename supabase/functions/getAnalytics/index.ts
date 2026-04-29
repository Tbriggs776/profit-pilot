// Supabase Edge Function: getAnalytics
// Aggregates analytics_events into the shape expected by the Analytics page.
// Deploy with: supabase functions deploy getAnalytics
// Requires: admin role in profiles table for the calling user.

// @ts-expect-error - Deno-style remote import resolved at deploy time
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error - Deno-style remote import resolved at deploy time
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    // @ts-expect-error - Deno global available at runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-expect-error - Deno global available at runtime
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    // @ts-expect-error - Deno global available at runtime
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role via profiles
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { startDate, endDate, timezoneOffset } = await req.json();

    const offsetMs = (timezoneOffset || 0) * 60 * 1000;
    const startUTC = new Date(new Date(startDate).getTime() + offsetMs);
    const endUTC = new Date(new Date(endDate).getTime() + offsetMs);

    // Bypass RLS to read analytics across all users
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: events, error: queryError } = await adminClient
      .from('analytics_events')
      .select('id, event_name, page, user_id, session_id, timestamp, properties')
      .gte('timestamp', startUTC.toISOString())
      .lte('timestamp', endUTC.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5000);

    if (queryError) throw queryError;

    const all = events ?? [];
    const totalEvents = all.length;
    const uniqueUsers = new Set(
      all.map((e) => e.user_id || e.session_id)
    ).size;
    const uniqueSessions = new Set(all.map((e) => e.session_id)).size;

    const eventCounts: Record<string, number> = {};
    all.forEach((e) => {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    });

    const dayBuckets: Record<string, number> = {};
    all.forEach((e) => {
      const localDate = new Date(new Date(e.timestamp).getTime() - offsetMs);
      const day = localDate.toISOString().split('T')[0];
      dayBuckets[day] = (dayBuckets[day] || 0) + 1;
    });

    const timeline: Array<{ date: string; events: number }> = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      const day = cursor.toISOString().split('T')[0];
      timeline.push({ date: day, events: dayBuckets[day] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const hourBuckets = Array(24).fill(0);
    all.forEach((e) => {
      const localDate = new Date(new Date(e.timestamp).getTime() - offsetMs);
      hourBuckets[localDate.getHours()]++;
    });

    const byHour = hourBuckets.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      events: count,
    }));

    const pageCounts: Record<string, number> = {};
    all.forEach((e) => {
      if (e.page) {
        pageCounts[e.page] = (pageCounts[e.page] || 0) + 1;
      }
    });

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    const recentEvents = all.slice(0, 50);

    const body = {
      summary: {
        totalEvents,
        uniqueUsers,
        uniqueSessions,
        topEventName:
          Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          '-',
      },
      timeline,
      byHour,
      eventCounts: Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count })),
      topPages,
      recentEvents,
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
