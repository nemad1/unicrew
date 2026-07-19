import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/ambassador/shift — returns the caller's currently open shift (if any)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: activeShift, error } = await supabase
    .from("ambassador_shifts")
    .select("id, start_time")
    .eq("user_id", user.id)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activeShift });
}

// POST /api/ambassador/shift — toggles clock-in/clock-out for the caller
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: openShift, error: fetchError } = await supabase
    .from("ambassador_shifts")
    .select("id")
    .eq("user_id", user.id)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (openShift) {
    const { error: updateError } = await supabase
      .from("ambassador_shifts")
      .update({ end_time: new Date().toISOString() })
      .eq("id", openShift.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ clockedIn: false });
  }

  const { data: newShift, error: insertError } = await supabase
    .from("ambassador_shifts")
    .insert({ user_id: user.id, start_time: new Date().toISOString() })
    .select("id, start_time")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ clockedIn: true, activeShift: newShift });
}
