import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_TONES = ["amber", "blue", "green"];

const APPOINTMENT_SELECT = `
  id, title, context, tone, start_time, end_time, contact_id, created_by, created_at,
  contact:contact_id ( id, name, phone_number ),
  creator:created_by ( id, full_name )
`;

// GET /api/appointments
// Same visibility rules as /api/inbox: ambassadors see only their own
// appointments, counselors see their team's, admins see all.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = getServiceClient();

  const { data: profile } = await serviceClient
    .from("internal_users")
    .select("id, role, team_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  let creatorIds: string[] | null = null;
  if (profile.role === "ambassador") {
    creatorIds = [user.id];
  } else if (profile.role === "counselor") {
    if (!profile.team_id) return NextResponse.json([]);
    const { data: teammates } = await serviceClient
      .from("internal_users")
      .select("id")
      .eq("team_id", profile.team_id);
    creatorIds = (teammates || []).map((t) => t.id);
  }
  // admin: creatorIds stays null, no filter applied — sees all

  let query = serviceClient
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .order("start_time", { ascending: true })
    .limit(500);

  if (creatorIds) query = query.in("created_by", creatorIds);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/appointments — create an appointment, owned by the caller
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, context, tone, start_time, end_time, contact_id } = body;

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!start_time || !end_time) {
    return NextResponse.json({ error: "Start and end time are required" }, { status: 400 });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient
    .from("appointments")
    .insert({
      title: String(title).trim(),
      context: context || null,
      tone: VALID_TONES.includes(tone) ? tone : "blue",
      start_time,
      end_time,
      contact_id: contact_id || null,
      created_by: user.id,
    })
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, appointment: data });
}
