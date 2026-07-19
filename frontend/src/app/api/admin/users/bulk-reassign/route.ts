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

// PATCH: Move multiple users to a team in one call (admin only).
export async function PATCH(request: Request) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userIds, team_id } = await request.json();
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds must be a non-empty array" }, { status: 400 });
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from("internal_users")
    .update({ team_id: team_id || null })
    .in("id", userIds)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data.length });
}
