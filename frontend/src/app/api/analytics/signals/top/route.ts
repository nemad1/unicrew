import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SIGNAL_TYPES = ['intent', 'interest', 'concern'] as const;
type SignalType = (typeof SIGNAL_TYPES)[number];

// Unlike /api/contacts/*, this is an aggregate view across every student —
// it must stay admin-only, not just "whoever is logged in."
async function verifyAdmin() {
  const authedSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('internal_users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return user;
}

/**
 * GET /api/analytics/signals/top?type=concern&days=7
 *
 * Cross-contact aggregation for admin dashboard widgets. Backed by the
 * top_signals() Postgres function (migration 010) since GROUP BY + AVG
 * isn't expressible through the supabase-js query builder.
 */
export async function GET(request: Request) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'concern';
  const days = Math.min(90, Math.max(1, Number(searchParams.get('days')) || 7));

  if (!SIGNAL_TYPES.includes(type as SignalType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${SIGNAL_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('top_signals', {
    p_signal_type: type,
    p_days: days,
    p_limit: 10,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ type, days, results: data || [] });
}
