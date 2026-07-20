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

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: rules, error } = await admin
    .from("routing_rules")
    .select("id, keyword, intent, handler, active, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { keyword, intent, handler, active } = body;

  if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }
  if (!VALID_INTENTS.includes(intent)) {
    return NextResponse.json({ error: "Invalid intent" }, { status: 400 });
  }
  if (!VALID_HANDLERS.includes(handler)) {
    return NextResponse.json({ error: "Invalid handler" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: rule, error } = await admin
    .from("routing_rules")
    .insert({
      keyword: keyword.trim().toLowerCase(),
      intent,
      handler,
      active: active ?? true,
    })
    .select("id, keyword, intent, handler, active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule }, { status: 201 });
}
