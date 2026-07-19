import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

// When a card lands on the "Enrolled" stage, ask the student to rate their
// ambassador over WhatsApp. contacts.pending_feedback_for records who the
// next 1-5 reply from this contact should be attributed to (see the
// /webhook handler in backend/server.js). Best-effort: a messaging failure
// here should never block the stage move itself.
async function maybeSendFeedbackPrompt(cardId: string) {
  const { data: card } = await supabase
    .from('kanban_cards')
    .select('contact_id, assignee_id, kanban_stages(name, is_completed)')
    .eq('id', cardId)
    .single();

  const stage = card?.kanban_stages as unknown as { name: string; is_completed: boolean } | null;
  const isEnrolled = stage && (stage.is_completed || stage.name?.toLowerCase() === 'enrolled');
  if (!card || !isEnrolled || !card.contact_id || !card.assignee_id) return;

  const { data: contact } = await supabase
    .from('contacts')
    .select('phone_number')
    .eq('id', card.contact_id)
    .single();

  const { data: ambassador } = await supabase
    .from('internal_users')
    .select('whatsapp_session_id')
    .eq('id', card.assignee_id)
    .single();

  if (!contact?.phone_number || !ambassador?.whatsapp_session_id) return;

  await supabase
    .from('contacts')
    .update({ pending_feedback_for: card.assignee_id })
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
    const { card_id, new_stage_id } = await request.json();

    if (!card_id || !new_stage_id) {
      return NextResponse.json({ error: 'Missing card_id or new_stage_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('kanban_cards')
      .update({ stage_id: new_stage_id, updated_at: new Date().toISOString() })
      .eq('id', card_id)
      .select()
      .single();

    if (error) throw error;

    await maybeSendFeedbackPrompt(card_id);

    return NextResponse.json({ success: true, card: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
