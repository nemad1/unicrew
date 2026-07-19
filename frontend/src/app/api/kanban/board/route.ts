import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { UNASSIGNED_TEAM_VALUE } from '@/lib/kanban';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Resolves which board the caller should see: admins may request any team
// (or the UNASSIGNED_TEAM_VALUE sentinel for the legacy board) via ?teamId=,
// everyone else is locked to their own team's board.
async function resolveBoardId(callerRole: string, callerTeamId: string | null, requestedTeamId: string | null) {
  let targetTeamId = callerTeamId;
  let wantsUnassigned = false;

  if (requestedTeamId) {
    if (requestedTeamId === UNASSIGNED_TEAM_VALUE) {
      if (callerRole !== 'admin') {
        return { error: 'Forbidden: cannot view another team\'s board', status: 403 } as const;
      }
      wantsUnassigned = true;
    } else if (callerRole !== 'admin' && requestedTeamId !== callerTeamId) {
      return { error: 'Forbidden: cannot view another team\'s board', status: 403 } as const;
    } else {
      targetTeamId = requestedTeamId;
    }
  }

  const query = supabase.from('kanban_boards').select('id, name, team_id');
  const { data: board } = (targetTeamId && !wantsUnassigned)
    ? await query.eq('team_id', targetTeamId).maybeSingle()
    : await query.is('team_id', null).maybeSingle();

  if (!board) {
    return { error: 'Board not found for this team.', status: 404 } as const;
  }

  return { boardId: board.id, board } as const;
}

export async function GET(request: Request) {
  try {
    const authedSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await authedSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('internal_users')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTeamId = searchParams.get('teamId');

    const resolved = await resolveBoardId(profile.role, profile.team_id, requestedTeamId);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const boardId = resolved.boardId;

    // Admins get the full team list (plus the legacy "Unassigned" board) to
    // power a board switcher
    let availableTeams: { id: string; name: string }[] = [];
    if (profile.role === 'admin') {
      const { data: teams } = await supabase.from('teams').select('id, name').order('name');
      availableTeams = [...(teams || []), { id: UNASSIGNED_TEAM_VALUE, name: 'Unassigned (no team)' }];
    }

    // Real team ambassadors, to back the "Assign ambassador" menu and the
    // "New Deal" dialog (previously a hardcoded fake list).
    const boardTeamId = resolved.board.team_id;
    const { data: ambassadors } = boardTeamId
      ? await supabase
          .from('internal_users')
          .select('id, full_name')
          .eq('team_id', boardTeamId)
          .eq('role', 'ambassador')
          .order('full_name')
      : { data: [] };

    const { data: stages, error: stagesError } = await supabase
      .from('kanban_stages')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });

    if (stagesError) {
      return NextResponse.json({ error: stagesError.message }, { status: 500 });
    }

    const stageIds = (stages || []).map((s) => s.id);

    const { data: cards, error: cardsError } = await supabase
      .from('kanban_cards')
      .select(`
        id,
        stage_id,
        contact_id,
        contacts (
          id,
          name,
          phone_number,
          intent,
          ai_summary,
          channel,
          assigned_to,
          internal_users:assigned_to ( id, full_name )
        )
      `)
      .in('stage_id', stageIds.length > 0 ? stageIds : ['00000000-0000-0000-0000-000000000000']);

    if (cardsError) {
      console.error('Cards Error:', cardsError);
      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    const columns = (stages || []).map((stage) => {
      const columnCards = (cards || []).filter((c) => c.stage_id === stage.id);

      const deals = columnCards.map((card) => {
        const rawContact = card.contacts as any;
        const contact = (Array.isArray(rawContact) ? rawContact[0] : rawContact) || {};
        const assignee = Array.isArray(contact.internal_users) ? contact.internal_users[0] : contact.internal_users;

        const rawPhone = contact.phone_number || 'Unknown';
        const displayName = contact.name || rawPhone;

        return {
          id: card.id,
          contactId: contact.id,
          phone: rawPhone,
          name: displayName,
          time: 'Just now',
          intent: contact.intent || 'General',
          preview: contact.ai_summary || 'No recent messages.',
          ambassador: assignee
            ? { id: assignee.id, name: assignee.full_name, initials: getInitials(assignee.full_name) }
            : { id: null, name: 'Unassigned', initials: 'UN' },
        };
      });

      return {
        id: stage.id,
        title: stage.name,
        accent: stage.accent_color,
        isCustom: false,
        deals,
      };
    });

    return NextResponse.json({
      columns,
      board: { ...resolved.board, team_id: resolved.board.team_id ?? UNASSIGNED_TEAM_VALUE },
      availableTeams,
      ambassadors: ambassadors || [],
      viewerId: user.id,
      viewerRole: profile.role,
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
