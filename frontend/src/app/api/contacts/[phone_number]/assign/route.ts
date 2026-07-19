import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT /api/contacts/:phone_number/assign — sets contacts.assigned_to, the
// single source of truth for ambassador ownership. Counselors/admins only
// (ambassadors work leads, they don't reassign them). The assignee must
// belong to the contact's team; if the contact has no team yet, it adopts
// the assignee's team (first-assignment bootstrap). Cross-team reassignment
// isn't supported here — it would also require moving the card to the new
// team's board, which is a bigger, separate feature.
export async function PUT(request: Request, { params }: { params: Promise<{ phone_number: string }> }) {
  try {
    const { phone_number } = await params;
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
    if (profile.role === 'ambassador') {
      return NextResponse.json({ error: 'Forbidden: only counselors and admins can reassign leads.' }, { status: 403 });
    }

    const { assignee_id } = await request.json();
    if (!assignee_id) {
      return NextResponse.json({ error: 'Missing assignee_id' }, { status: 400 });
    }

    const { data: assignee } = await supabase
      .from('internal_users')
      .select('id, team_id, role, full_name')
      .eq('id', assignee_id)
      .single();
    if (!assignee || assignee.role !== 'ambassador') {
      return NextResponse.json({ error: 'assignee_id must be an ambassador.' }, { status: 400 });
    }

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, team_id')
      .eq('phone_number', phone_number)
      .single();
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    if (profile.role === 'counselor' && contact.team_id && contact.team_id !== profile.team_id) {
      return NextResponse.json({ error: 'Forbidden: not your team\'s contact.' }, { status: 403 });
    }
    if (contact.team_id && contact.team_id !== assignee.team_id) {
      return NextResponse.json({ error: 'Ambassador must be on the same team as the contact.' }, { status: 400 });
    }

    const updateData: { assigned_to: string; team_id?: string } = { assigned_to: assignee.id };
    if (!contact.team_id && assignee.team_id) {
      updateData.team_id = assignee.team_id;
    }

    const { data: updated, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contact.id)
      .select('id, assigned_to, team_id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, contact: updated, assignee: { id: assignee.id, name: assignee.full_name } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
