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
  const { full_name, role, team_id, is_team_leader } = body;

  const adminClient = getAdminClient();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;
  if (team_id !== undefined) updates.team_id = team_id;
  if (is_team_leader !== undefined) updates.is_team_leader = is_team_leader;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("internal_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
