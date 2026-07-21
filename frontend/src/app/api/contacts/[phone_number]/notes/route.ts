import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/auditLog";

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const NOTE_SELECT = `
  id, content, created_at,
  author:author_id ( id, full_name, role )
`;

// Same visibility rules as /api/inbox and /api/appointments: ambassadors
// only see contacts assigned to them, counselors see their team's, admins
// see all. A note can only be read/added by someone who could otherwise
// already see this contact.
async function loadCallerAndContact(phone_number: string) {
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
    .select("id, role, team_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return { error: NextResponse.json({ error: "User profile not found" }, { status: 404 }) } as const;
  }

  const { data: contact } = await serviceClient
    .from("contacts")
    .select("id, assigned_to, team_id")
    .eq("phone_number", phone_number)
    .single();
  if (!contact) {
    return { error: NextResponse.json({ error: "Contact not found" }, { status: 404 }) } as const;
  }

  const canAccess =
    profile.role === "admin" ||
    (profile.role === "counselor" && !!contact.team_id && contact.team_id === profile.team_id) ||
    (profile.role === "ambassador" && contact.assigned_to === user.id);

  if (!canAccess) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { serviceClient, userId: user.id, contactId: contact.id } as const;
}

// GET /api/contacts/:phone_number/notes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone_number: string }> }
) {
  const { phone_number } = await params;
  const result = await loadCallerAndContact(phone_number);
  if ("error" in result) return result.error;

  const { data, error } = await result.serviceClient
    .from("contact_notes")
    .select(NOTE_SELECT)
    .eq("contact_id", result.contactId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/contacts/:phone_number/notes
export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone_number: string }> }
) {
  const { phone_number } = await params;
  const result = await loadCallerAndContact(phone_number);
  if ("error" in result) return result.error;

  const body = await request.json();
  const { content } = body;
  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Note content is required" }, { status: 400 });
  }

  const { data, error } = await result.serviceClient
    .from("contact_notes")
    .insert({
      contact_id: result.contactId,
      author_id: result.userId,
      content: String(content).trim(),
    })
    .select(NOTE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(result.serviceClient, {
    userId: result.userId,
    contactId: result.contactId,
    actionType: "note_added",
    meta: { note_id: data.id },
  });

  return NextResponse.json({ success: true, note: data });
}
