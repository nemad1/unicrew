import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    console.error("PUT stage error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if any cards exist in this stage
    const { count, error: countError } = await supabase
      .from('kanban_cards')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', id);
      
    if (countError) throw countError;
    
    if (count && count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete stage because it contains ${count} card(s). Move them first.` 
      }, { status: 400 });
    }
    
    const { error: deleteError } = await supabase
      .from('kanban_stages')
      .delete()
      .eq('id', id);
      
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE stage error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
