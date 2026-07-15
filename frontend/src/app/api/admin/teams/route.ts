import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: List all teams (authenticated users)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(teams);
}
