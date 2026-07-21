import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/auditLog";

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

// PATCH: Rename a team and/or change its accent color (admin only)
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
  const { name, accent_color } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "Team name cannot be empty" }, { status: 400 });
    }
    updates.name = name.trim();
  }
  if (accent_color !== undefined) updates.accent_color = accent_color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from("teams")
    .update(updates)
    .eq("id", id)
    .select("id, name, created_at, accent_color, lead_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(adminClient, {
    userId: caller.id,
    actionType: "team_renamed",
    meta: { team_id: id, name: data.name, accent_color: data.accent_color },
  });

  return NextResponse.json({ success: true, team: data });
}

// DELETE: Remove a team (admin only). Members keep their accounts but lose
// their team assignment (internal_users.team_id is ON DELETE SET NULL).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const adminClient = getAdminClient();

  const { data: existing } = await adminClient.from("teams").select("name").eq("id", id).single();

  // Clear the leadership flag explicitly — the FK only nulls team_id, it
  // wouldn't otherwise stop a former lead from showing as "Team Leader" of
  // no team.
  await adminClient.from("internal_users").update({ is_team_leader: false }).eq("team_id", id);

  const { error } = await adminClient.from("teams").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(adminClient, {
    userId: caller.id,
    actionType: "team_deleted",
    meta: { team_id: id, name: existing?.name },
  });

  return NextResponse.json({ success: true });
}
