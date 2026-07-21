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

async function authorize(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const serviceClient = getServiceClient();

  const { data: profile } = await serviceClient
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return { error: NextResponse.json({ error: "User profile not found" }, { status: 404 }) } as const;
  }

  const { data: appointment } = await serviceClient
    .from("appointments")
    .select("id, created_by, start_time, end_time")
    .eq("id", id)
    .single();
  if (!appointment) {
    return { error: NextResponse.json({ error: "Appointment not found" }, { status: 404 }) } as const;
  }

  const canManage = appointment.created_by === user.id || profile.role === "admin";
  if (!canManage) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { serviceClient, appointment } as const;
}

// PATCH: Update an appointment (owner or admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await authorize(id);
  if ("error" in result) return result.error;
  const { serviceClient, appointment } = result;

  const body = await request.json();
  const { title, context, tone, start_time, end_time, contact_id } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!String(title).trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    updates.title = String(title).trim();
  }
  if (context !== undefined) updates.context = context || null;
  if (tone !== undefined) updates.tone = VALID_TONES.includes(tone) ? tone : "blue";
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (contact_id !== undefined) updates.contact_id = contact_id || null;

  const nextStart = (updates.start_time as string) ?? appointment.start_time;
  const nextEnd = (updates.end_time as string) ?? appointment.end_time;
  if (new Date(nextEnd) <= new Date(nextStart)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, appointment: data });
}

// DELETE: Remove an appointment (owner or admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await authorize(id);
  if ("error" in result) return result.error;

  const { error } = await result.serviceClient.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
