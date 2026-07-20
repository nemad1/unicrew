import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SIGNAL_TYPES = ['intent', 'interest', 'concern'] as const;
type SignalType = (typeof SIGNAL_TYPES)[number];

/**
 * GET /api/contacts/:phone_number/signals?type=concern&limit=5
 *
 * Lazy-load endpoint for the profile deep-dive page — reads
 * vw_contact_top_signals (migration 010), which already collapses
 * repeated mentions of the same label down to its most recent
 * confidence/sentiment. Not used by list views (Inbox/Kanban), which
 * read the denormalized contacts.top_interests/top_concerns instead.
 *
 * `type` omitted returns all three types grouped, each capped at `limit`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone_number: string }> }
) {
  const { phone_number } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 5));

  if (type && !SIGNAL_TYPES.includes(type as SignalType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${SIGNAL_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone_number', phone_number)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  let query = supabase
    .from('vw_contact_top_signals')
    .select('signal_type, label, confidence, sentiment, created_at')
    .eq('contact_id', contact.id)
    .order('confidence', { ascending: false });

  if (type) {
    query = query.eq('signal_type', type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, unknown[]> = { intents: [], interests: [], concerns: [] };
  for (const row of data || []) {
    const key = `${row.signal_type}s`;
    if (grouped[key] && grouped[key].length < limit) {
      grouped[key].push(row);
    }
  }

  return NextResponse.json(grouped);
}
