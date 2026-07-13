import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { stages } = body;
    
    if (!Array.isArray(stages)) {
      return NextResponse.json({ error: 'Expected an array of stages' }, { status: 400 });
    }
    
    // Perform updates in parallel since Supabase JS doesn't have a built-in batch update for varying column values easily
    const promises = stages.map((stage: { id: string, order_index: number }) => {
      return supabase
        .from('kanban_stages')
        .update({ order_index: stage.order_index })
        .eq('id', stage.id);
    });
    
    const results = await Promise.all(promises);
    
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error("Errors updating stage orders:", errors);
      throw errors[0];
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reorder stages error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
