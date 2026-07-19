import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: List all teams (authenticated users). Uses the service role client so
// the embedded `lead` name resolves regardless of the caller's role — team
// identity (name/color/lead) isn't sensitive contact data, so it shouldn't
// be filtered by the same RLS that scopes internal_users for lead-management
// purposes (which would otherwise hide, e.g., a counselor lead from an
// ambassador viewer).
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  const { data: teams, error } = await adminClient
    .from("teams")
    .select("id, name, created_at, accent_color, lead_id, lead:lead_id ( id, full_name )")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(teams);
}
