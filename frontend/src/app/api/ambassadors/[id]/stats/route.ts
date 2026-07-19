import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/ambassadors/:id/stats — staff/admin only.
// The get_ambassador_stats/get_ambassador_activity_trend DB functions also
// self-gate on role (SECURITY DEFINER), so this check is defense in depth,
// not the sole gate — matches the existing verifyAdmin() pattern used by
// /api/admin/users.
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

  const [{ data: stats, error: statsError }, { data: trend, error: trendError }] =
    await Promise.all([
      supabase.rpc("get_ambassador_stats", { target_user_id: id }).single(),
      supabase.rpc("get_ambassador_activity_trend", { target_user_id: id }),
    ]);

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }
  if (trendError) {
    return NextResponse.json({ error: trendError.message }, { status: 500 });
  }

  return NextResponse.json({ stats, trend });
}
