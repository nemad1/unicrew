import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { data: boards } = await supabase.from('kanban_boards').select('id').eq('name', 'Main Board').limit(1);
    const boardId = boards?.[0]?.id;

    if (!boardId) {
      return NextResponse.json({ error: 'Main Board not found.' }, { status: 404 });
    }

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
    const { name, accent_color, order_index } = await request.json();
    
    const { data: boards } = await supabase.from('kanban_boards').select('id').eq('name', 'Main Board').limit(1);
    const boardId = boards?.[0]?.id;

    if (!boardId) {
      return NextResponse.json({ error: 'Main Board not found.' }, { status: 404 });
    }

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
