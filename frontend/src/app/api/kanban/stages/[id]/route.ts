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

// A stage can be managed by admins, or by a counselor whose team owns the
// stage's board. Ambassadors can view the board but not restructure it.
async function assertCanManageStage(profile: { role: string; team_id: string | null }, stageId: string) {
  if (profile.role === 'ambassador') return false;
  if (profile.role === 'admin') return true;

  const { data: stage } = await supabase
    .from('kanban_stages')
    .select('board_id, kanban_boards ( team_id )')
    .eq('id', stageId)
    .single();

  const board = stage?.kanban_boards as any;
  const boardTeamId = Array.isArray(board) ? board[0]?.team_id : board?.team_id;
  return !!boardTeamId && boardTeamId === profile.team_id;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getCallerProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await assertCanManageStage(profile, id))) {
      return NextResponse.json({ error: 'Forbidden: cannot manage this stage.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, accent_color } = body;

    if (!name && !accent_color) {
      return NextResponse.json({ error: 'Provide at least name or accent_color' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (accent_color) updateData.accent_color = accent_color;

    const { data, error } = await supabase
      .from('kanban_stages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, stage: data });
  } catch (error: any) {
    console.error('PUT stage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getCallerProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await assertCanManageStage(profile, id))) {
      return NextResponse.json({ error: 'Forbidden: cannot manage this stage.' }, { status: 403 });
    }

    const { count, error: countError } = await supabase
      .from('kanban_cards')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      return NextResponse.json({
        error: `Cannot delete stage because it contains ${count} card(s). Move them first.`,
      }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('kanban_stages')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE stage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
