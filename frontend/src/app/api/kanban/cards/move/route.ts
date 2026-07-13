import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    return NextResponse.json({ success: true, card: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
