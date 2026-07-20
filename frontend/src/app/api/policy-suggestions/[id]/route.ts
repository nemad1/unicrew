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

  const { data: profile } = await supabase
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNote } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: suggestion, error } = await admin
    .from("policy_suggestions")
    .update({
      status,
      review_note: reviewNote?.trim() || null,
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
      id,
      rule,
      proposed_change,
      reason,
      status,
      review_note,
      reviewed_at,
      created_at,
      submitted_by,
      submitted_by_user:internal_users!policy_suggestions_submitted_by_fkey(full_name)
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suggestion });
}
