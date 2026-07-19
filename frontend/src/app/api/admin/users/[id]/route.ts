import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = getAdminClient();
  const { data: profile } = await adminClient
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

// PATCH: Update a user's details (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { full_name, role, team_id, is_team_leader, contact_phone, avatar_url, ambassador_profile } = body;

  const adminClient = getAdminClient();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;
  if (team_id !== undefined) updates.team_id = team_id;
  if (is_team_leader !== undefined) updates.is_team_leader = is_team_leader;
  if (contact_phone !== undefined) updates.contact_phone = contact_phone || null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;

  if (Object.keys(updates).length === 0 && !ambassador_profile) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let data: any = null;
  if (Object.keys(updates).length > 0) {
    const { data: updated, error } = await adminClient
      .from("internal_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data = updated;
  } else {
    const { data: existing } = await adminClient.from("internal_users").select().eq("id", id).single();
    data = existing;
  }

  // Peer Directory content (bio, academic info, languages, hobbies, clubs,
  // favourite courses, origin/flag) is admin-managed — everything here
  // except availability_schedule/is_online, which ambassadors self-edit
  // via /api/profile.
  if (ambassador_profile) {
    const allowedFields = [
      "programme",
      "programme_type",
      "academic_year",
      "majors",
      "previous_qualification",
      "favourite_courses",
      "languages",
      "origin_country",
      "origin_flag",
      "bio_short",
      "bio_full",
      "hobbies",
      "clubs_societies",
    ];
    const profileUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (ambassador_profile[field] !== undefined) profileUpdates[field] = ambassador_profile[field];
    }
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await adminClient
        .from("ambassador_profiles")
        .update(profileUpdates)
        .eq("user_id", id);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }
  }

  // Toggling "Team Leader" on is the only control for who a team's lead is
  // (no dedicated Team Management UI exists yet) — keep teams.lead_id in
  // sync so Kanban/Directory/User Management can all show one real lead.
  if (is_team_leader === true && data.team_id) {
    await adminClient.from("teams").update({ lead_id: data.id }).eq("id", data.team_id);
  }

  return NextResponse.json({ success: true, user: data });
}

// DELETE: Delete a user (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (caller.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();

  // Delete from internal_users (cascades to ambassador_profiles)
  const { error: profileError } = await adminClient
    .from("internal_users")
    .delete()
    .eq("id", id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Delete from Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(id);

  if (authError) {
    return NextResponse.json(
      { error: `Auth deletion failed: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
