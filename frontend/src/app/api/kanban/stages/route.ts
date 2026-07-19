import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCallerProfile() {
  const authedSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('internal_users')
    .select('role, team_id')
    .eq('id', user.id)
    .single();

  return profile ? { ...profile, id: user.id } : null;
}

async function resolveBoardId(callerRole: string, callerTeamId: string | null, requestedTeamId: string | null) {
  let targetTeamId = callerTeamId;
  if (requestedTeamId) {
    if (callerRole !== 'admin' && requestedTeamId !== callerTeamId) return null;
    targetTeamId = requestedTeamId;
  }

  const query = supabase.from('kanban_boards').select('id');
  const { data: board } = targetTeamId
    ? await query.eq('team_id', targetTeamId).maybeSingle()
    : await query.is('team_id', null).maybeSingle();

  return board?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const profile = await getCallerProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const boardId = await resolveBoardId(profile.role, profile.team_id, searchParams.get('teamId'));
    if (!boardId) return NextResponse.json({ error: 'Board not found.' }, { status: 404 });

    const { data: stages, error } = await supabase
      .from('kanban_stages')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ stages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCallerProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (profile.role === 'ambassador') {
      return NextResponse.json({ error: 'Forbidden: only counselors and admins can edit the pipeline.' }, { status: 403 });
    }

    const { name, accent_color, order_index, teamId } = await request.json();
    const boardId = await resolveBoardId(profile.role, profile.team_id, teamId);
    if (!boardId) return NextResponse.json({ error: 'Board not found.' }, { status: 404 });

    const { data, error } = await supabase
      .from('kanban_stages')
      .insert({ board_id: boardId, name, accent_color: accent_color || '#1d4ed8', order_index })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, stage: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
