import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { logAudit } from '@/lib/auditLog';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

// When a card lands on the "Enrolled" stage, ask the student to rate their
// ambassador over WhatsApp. contacts.pending_feedback_for records who the
// next 1-5 reply from this contact should be attributed to (see the
// /webhook handler in backend/server.js). Best-effort: a messaging failure
// here should never block the stage move itself.
async function maybeSendFeedbackPrompt(cardId: string) {
  const { data: card } = await supabase
    .from('kanban_cards')
    .select('contact_id, kanban_stages(name, is_completed)')
    .eq('id', cardId)
    .single();

  const stage = card?.kanban_stages as unknown as { name: string; is_completed: boolean } | null;
  const isEnrolled = stage && (stage.is_completed || stage.name?.toLowerCase() === 'enrolled');
  if (!card || !isEnrolled || !card.contact_id) return;

  const { data: contact } = await supabase
    .from('contacts')
    .select('phone_number, assigned_to')
    .eq('id', card.contact_id)
    .single();

  if (!contact?.phone_number || !contact.assigned_to) return;

  const { data: ambassador } = await supabase
    .from('internal_users')
    .select('whatsapp_session_id')
    .eq('id', contact.assigned_to)
    .single();

  if (!ambassador?.whatsapp_session_id) return;

  await supabase
    .from('contacts')
    .update({ pending_feedback_for: contact.assigned_to })
    .eq('id', card.contact_id);

  try {
    await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: ambassador.whatsapp_session_id,
        chatId: `${contact.phone_number}@c.us`,
        text: "Congratulations on your enrollment! On a scale of 1-5, how would you rate your experience with your ambassador? Just reply with a number.",
      }),
    });
  } catch (err) {
    console.error('Failed to send feedback prompt:', err);
  }
}

export async function PUT(request: Request) {
  try {
    const authedSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await authedSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('internal_users')
      .select('role, team_id')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

    const { card_id, new_stage_id } = await request.json();

    if (!card_id || !new_stage_id) {
      return NextResponse.json({ error: 'Missing card_id or new_stage_id' }, { status: 400 });
    }

    const { data: card } = await supabase
      .from('kanban_cards')
      .select('id, stage_id, contacts ( id, team_id, assigned_to )')
      .eq('id', card_id)
      .single();

    const contact = Array.isArray(card?.contacts) ? card.contacts[0] : card?.contacts;
    if (!card || !contact) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    if (profile.role === 'ambassador' && contact.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not your card.' }, { status: 403 });
    }
    if (profile.role === 'counselor' && contact.team_id !== profile.team_id) {
      return NextResponse.json({ error: 'Forbidden: not your team\'s card.' }, { status: 403 });
    }

    if (profile.role !== 'admin') {
      const { data: targetStage } = await supabase
        .from('kanban_stages')
        .select('kanban_boards ( team_id )')
        .eq('id', new_stage_id)
        .single();
      const board = targetStage?.kanban_boards as any;
      const targetTeamId = Array.isArray(board) ? board[0]?.team_id : board?.team_id;
      if (targetTeamId !== contact.team_id) {
        return NextResponse.json({ error: 'Forbidden: cannot move a card into another team\'s pipeline.' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('kanban_cards')
      .update({ stage_id: new_stage_id, updated_at: new Date().toISOString() })
      .eq('id', card_id)
      .select()
      .single();

    if (error) throw error;

    await maybeSendFeedbackPrompt(card_id);

    await logAudit(supabase, {
      userId: user.id,
      contactId: contact.id,
      actionType: 'stage_move',
      meta: { card_id, from_stage_id: card.stage_id, to_stage_id: new_stage_id },
    });

    return NextResponse.json({ success: true, card: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
