import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/teams/:id/stats — staff/admin only, mirrors
// /api/ambassadors/[id]/stats. get_team_stats is also self-gated
// (SECURITY DEFINER) as defense in depth.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "ambassador") {
    return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("get_team_stats", { target_team_id: id }).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
