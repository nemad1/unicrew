import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCallerProfile() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("internal_users")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return profile;
}

export async function GET() {
  const caller = await getCallerProfile();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  let query = admin
    .from("policy_suggestions")
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
    .order("created_at", { ascending: false });

  // Admins see every suggestion; everyone else only sees their own.
  if (caller.role !== "admin") {
    query = query.eq("submitted_by", caller.id);
  }

  const { data: suggestions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suggestions });
}

export async function POST(request: Request) {
  const caller = await getCallerProfile();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rule, proposedChange, reason } = body;

  if (!rule || typeof rule !== "string" || !rule.trim()) {
    return NextResponse.json({ error: "Rule is required" }, { status: 400 });
  }
  if (!proposedChange || typeof proposedChange !== "string" || !proposedChange.trim()) {
    return NextResponse.json({ error: "Proposed change is required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: suggestion, error } = await admin
    .from("policy_suggestions")
    .insert({
      submitted_by: caller.id,
      rule: rule.trim(),
      proposed_change: proposedChange.trim(),
      reason: reason.trim(),
    })
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

  return NextResponse.json({ suggestion }, { status: 201 });
}
