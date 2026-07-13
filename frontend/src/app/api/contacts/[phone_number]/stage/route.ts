import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: Request, { params }: { params: Promise<{ phone_number: string }> }) {
  try {
    const { phone_number } = await params;
    const { stage_id } = await request.json();
    
    if (!stage_id) {
      return NextResponse.json({ error: 'Missing stage_id' }, { status: 400 });
    }

    // 1. Get contact ID
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', phone_number)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // 2. Upsert kanban_cards for this contact
    // First check if card exists
    const { data: existingCard } = await supabase
      .from('kanban_cards')
      .select('id')
      .eq('contact_id', contact.id)
      .single();

    if (existingCard) {
      // Update
      const { data, error } = await supabase
        .from('kanban_cards')
        .update({ stage_id, updated_at: new Date().toISOString() })
        .eq('id', existingCard.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, card: data });
    } else {
      // Insert
      const { data, error } = await supabase
        .from('kanban_cards')
        .insert({ contact_id: contact.id, stage_id })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, card: data });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
