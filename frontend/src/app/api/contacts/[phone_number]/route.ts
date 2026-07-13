import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: Request, { params }: { params: Promise<{ phone_number: string }> }) {
  try {
    const { phone_number } = await params;
    const body = await request.json();
    
    // We expect the client to send crm_label, email, intent, lead_status, enrollment_probability, fields
    const { crm_label, email, intent, lead_status, enrollment_probability, fields } = body;
    
    // Build update object
    const updateData: any = { phone_number };
    
    if (crm_label !== undefined) updateData.name = crm_label;
    if (email !== undefined) updateData.email = email;
    if (intent !== undefined) updateData.intent = intent;
    if (lead_status !== undefined) updateData.lead_status = lead_status;
    if (enrollment_probability !== undefined) updateData.enrollment_probability = Number(enrollment_probability);
    if (fields !== undefined) updateData.fields = fields;

    const { data, error } = await supabase
      .from('contacts')
      .upsert(updateData, { onConflict: 'phone_number' })
      .select('phone_number, name, email, intent, lead_status, enrollment_probability, fields')
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact: data });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ phone_number: string }> }) {
  try {
    const { phone_number } = await params;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const { data: logs } = await supabase
      .from('interaction_logs')
      .select('*')
      .eq('contact_id', data.id)
      .eq('sender_type', 'system')
      .order('created_at', { ascending: false });

    data.interaction_logs = logs || [];

    return NextResponse.json({ success: true, contact: data });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
