import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: Request, { params }: { params: Promise<{ phone_number: string }> }) {
  try {
    const { phone_number } = await params;
    const body = await request.json();
    const { crm_label } = body;

    const { data, error } = await supabase
      .from('contacts')
      .upsert({ phone_number, crm_label }, { onConflict: 'phone_number' })
      .select('phone_number, crm_label, name')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
