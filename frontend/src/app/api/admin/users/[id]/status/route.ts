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

// PATCH: Activate/deactivate a user. Deactivating actually blocks login via
// Supabase Auth's ban mechanism (a flag on internal_users alone wouldn't stop
// them signing in — Auth is separate from this table), and is reversible.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (caller.id === id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const { is_active } = await request.json();
  if (typeof is_active !== "boolean") {
    return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
  }

  const adminClient = getAdminClient();

  const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
    ban_duration: is_active ? "none" : "87600h",
  });
  if (banError) {
    return NextResponse.json({ error: `Auth update failed: ${banError.message}` }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from("internal_users")
    .update({ is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}
