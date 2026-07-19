import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { UNASSIGNED_TEAM_VALUE } from '@/lib/kanban';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

// POST /api/kanban/deals — creates a real contact + kanban_card (in the
// team board's first stage) instead of the old client-side-only mock.
export async function POST(request: Request) {
  try {
    const authedSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await authedSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('internal_users')
      .select('role, team_id, full_name')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

    const { name, phone_number, intent, assignee_id, teamId } = await request.json();
    if (!name || !phone_number) {
      return NextResponse.json({ error: 'name and phone_number are required' }, { status: 400 });
    }

    let targetTeamId: string | null = profile.team_id;
    if (teamId === UNASSIGNED_TEAM_VALUE) {
      if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: cannot create a deal on another team\'s board.' }, { status: 403 });
      }
      targetTeamId = null;
    } else if (teamId) {
      if (profile.role !== 'admin' && teamId !== profile.team_id) {
        return NextResponse.json({ error: 'Forbidden: cannot create a deal on another team\'s board.' }, { status: 403 });
      }
      targetTeamId = teamId;
    }

    // Ambassadors creating a deal default to assigning it to themselves;
    // counselors/admins must name an ambassador from the team.
    let assignedTo: string | null = profile.role === 'ambassador' ? user.id : assignee_id || null;
    if (assignedTo) {
      const { data: assignee } = await supabase
        .from('internal_users')
        .select('id, team_id, role')
        .eq('id', assignedTo)
        .single();
      if (!assignee || assignee.role !== 'ambassador') {
        return NextResponse.json({ error: 'assignee_id must be an ambassador.' }, { status: 400 });
      }
      if (targetTeamId && assignee.team_id !== targetTeamId) {
        return NextResponse.json({ error: 'Ambassador must be on the target team.' }, { status: 400 });
      }
      if (!targetTeamId) targetTeamId = assignee.team_id;
    }

    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', phone_number)
      .maybeSingle();
    if (existingContact) {
      return NextResponse.json({ error: 'A contact with this phone number already exists.' }, { status: 409 });
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        phone_number,
        name,
        intent: intent || 'General',
        channel: 'WhatsApp',
        team_id: targetTeamId,
        assigned_to: assignedTo,
      })
      .select('id, name, phone_number, intent')
      .single();
    if (contactError) throw contactError;

    const boardQuery = supabase.from('kanban_boards').select('id');
    const { data: board } = targetTeamId
      ? await boardQuery.eq('team_id', targetTeamId).maybeSingle()
      : await boardQuery.is('team_id', null).maybeSingle();
    if (!board) return NextResponse.json({ error: 'No board found for this team.' }, { status: 404 });

    const { data: firstStage } = await supabase
      .from('kanban_stages')
      .select('id')
      .eq('board_id', board.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();
    if (!firstStage) return NextResponse.json({ error: 'This board has no stages yet.' }, { status: 404 });

    const { data: card, error: cardError } = await supabase
      .from('kanban_cards')
      .insert({ contact_id: contact.id, stage_id: firstStage.id })
      .select('id')
      .single();
    if (cardError) throw cardError;

    let ambassador = { id: null as string | null, name: 'Unassigned', initials: 'UN' };
    if (assignedTo) {
      const { data: assigneeUser } = await supabase
        .from('internal_users')
        .select('id, full_name')
        .eq('id', assignedTo)
        .single();
      if (assigneeUser) {
        ambassador = { id: assigneeUser.id, name: assigneeUser.full_name, initials: getInitials(assigneeUser.full_name) };
      }
    }

    return NextResponse.json({
      success: true,
      deal: {
        id: card.id,
        contactId: contact.id,
        phone: contact.phone_number,
        name: contact.name,
        time: 'Just now',
        intent: contact.intent,
        preview: 'New deal created — awaiting first message.',
        ambassador,
      },
      stageId: firstStage.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
