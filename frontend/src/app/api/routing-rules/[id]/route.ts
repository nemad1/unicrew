import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_INTENTS = [
  "Fees",
  "Campus Life",
  "Visa & Immigration",
  "Courses",
  "Housing",
  "Booking",
  "Escalated",
  "General",
];
const VALID_HANDLERS = ["AI Bot", "Human Ambassador"];

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
  const update: Record<string, unknown> = {};

  if (body.keyword !== undefined) {
    if (typeof body.keyword !== "string" || !body.keyword.trim()) {
      return NextResponse.json({ error: "Keyword cannot be empty" }, { status: 400 });
    }
    update.keyword = body.keyword.trim().toLowerCase();
  }
  if (body.intent !== undefined) {
    if (!VALID_INTENTS.includes(body.intent)) {
      return NextResponse.json({ error: "Invalid intent" }, { status: 400 });
    }
    update.intent = body.intent;
  }
  if (body.handler !== undefined) {
    if (!VALID_HANDLERS.includes(body.handler)) {
      return NextResponse.json({ error: "Invalid handler" }, { status: 400 });
    }
    update.handler = body.handler;
  }
  if (body.active !== undefined) {
    update.active = !!body.active;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const admin = getAdminClient();
  const { data: rule, error } = await admin
    .from("routing_rules")
    .update(update)
    .eq("id", id)
    .select("id, keyword, intent, handler, active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const admin = getAdminClient();
  const { error } = await admin.from("routing_rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
