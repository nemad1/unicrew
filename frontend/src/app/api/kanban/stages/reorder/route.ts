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

export async function PUT(request: Request) {
  try {
    const profile = await getCallerProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (profile.role === 'ambassador') {
      return NextResponse.json({ error: 'Forbidden: only counselors and admins can reorder the pipeline.' }, { status: 403 });
    }

    const body = await request.json();
    const { stages } = body;

    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: 'Expected an array of stages' }, { status: 400 });
    }

    if (profile.role !== 'admin') {
      // Every stage being reordered must belong to the caller's own team board.
      const { data: existing } = await supabase
        .from('kanban_stages')
        .select('id, kanban_boards ( team_id )')
        .in('id', stages.map((s: { id: string }) => s.id));

      const allOwnTeam = (existing || []).every((s) => {
        const board = s.kanban_boards as any;
        const teamId = Array.isArray(board) ? board[0]?.team_id : board?.team_id;
        return teamId === profile.team_id;
      });

      if (!allOwnTeam || (existing || []).length !== stages.length) {
        return NextResponse.json({ error: 'Forbidden: cannot reorder another team\'s pipeline.' }, { status: 403 });
      }
    }

    const promises = stages.map((stage: { id: string; order_index: number }) => {
      return supabase
        .from('kanban_stages')
        .update({ order_index: stage.order_index })
        .eq('id', stage.id);
    });

    const results = await Promise.all(promises);

    const errors = results.filter((r) => r.error).map((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors updating stage orders:', errors);
      throw errors[0];
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reorder stages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
