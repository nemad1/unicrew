import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/inbox?mode=team
 * 
 * Returns conversations for the Team Overview panel.
 * Only returns contacts that are saved in the database (not raw WhatsApp chats).
 * 
 * For counselors: returns contacts where team_id matches the user's team.
 * For admins: returns all contacts.
 * For ambassadors: returns only contacts assigned to them.
 * 
 * Each contact is enriched with:
 * - The assigned ambassador's name/initials
 * - The last message preview from interaction_logs
 * - The contact's intent and lead_status
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "team";
  const filterAmbassadorId = searchParams.get("ambassadorId");

  // Use service client to bypass RLS for the JOIN queries
  const serviceClient = getServiceClient();

  // 1. Get the current user's profile
  const { data: profile } = await serviceClient
    .from("internal_users")
    .select("id, role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // 2. Build the contacts query based on role
  let contactsQuery = serviceClient
    .from("contacts")
    .select(`
      id,
      phone_number,
      name,
      channel,
      intent,
      lead_status,
      unread_count,
      assigned_to,
      team_id,
      ai_summary,
      ai_tags,
      created_at,
      updated_at
    `)
    .order("updated_at", { ascending: false });

  // Apply visibility rules
  if (profile.role === "ambassador") {
    // Ambassador: only contacts assigned to them
    contactsQuery = contactsQuery.eq("assigned_to", user.id);
  } else if (profile.role === "counselor") {
    // Counselor: contacts in their team
    if (profile.team_id) {
      contactsQuery = contactsQuery.eq("team_id", profile.team_id);
    } else {
      // No team assigned, show nothing
      return NextResponse.json([]);
    }
  }
  // Admin: no filter applied — sees all

  // Apply optional ambassador filter
  if (filterAmbassadorId) {
    contactsQuery = contactsQuery.eq("assigned_to", filterAmbassadorId);
  }

  const { data: contacts, error: contactsError } = await contactsQuery.limit(100);

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json([]);
  }

  // 3. Fetch assigned user details for each contact
  const assigneeIds = [
    ...new Set(contacts.map((c) => c.assigned_to).filter(Boolean)),
  ];

  let assigneeMap: Record<string, { full_name: string; initials: string; colour: string }> = {};

  if (assigneeIds.length > 0) {
    const { data: assignees } = await serviceClient
      .from("internal_users")
      .select("id, full_name")
      .in("id", assigneeIds);

    const colours = [
      "bg-blue-100 text-blue-700",
      "bg-pink-100 text-pink-700",
      "bg-violet-100 text-violet-700",
      "bg-rose-100 text-rose-700",
      "bg-amber-100 text-amber-700",
      "bg-emerald-100 text-emerald-700",
    ];

    if (assignees) {
      assignees.forEach((a, i) => {
        assigneeMap[a.id] = {
          full_name: a.full_name,
          initials: a.full_name
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
          colour: colours[i % colours.length],
        };
      });
    }
  }

  // 4. Fetch last message for each contact
  const contactIds = contacts.map((c) => c.id);
  const { data: lastMessages } = await serviceClient
    .from("interaction_logs")
    .select("contact_id, content, created_at, sender_type")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });

  // Build a map of contact_id -> last message
  const lastMessageMap: Record<string, { content: string; created_at: string; sender_type: string }> = {};
  if (lastMessages) {
    for (const msg of lastMessages) {
      if (!lastMessageMap[msg.contact_id]) {
        lastMessageMap[msg.contact_id] = msg;
      }
    }
  }

  // 5. Build response
  const result = contacts.map((c) => {
    const assignee = c.assigned_to ? assigneeMap[c.assigned_to] : null;
    const lastMsg = lastMessageMap[c.id];

    return {
      id: c.phone_number ? `${c.phone_number}@c.us` : c.id,
      contact_id: c.id,
      student_name: c.name || c.phone_number || "Unknown",
      student_initials: (c.name || c.phone_number || "??")
        .split(" ")
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      phone_number: c.phone_number,
      channel: c.channel || "WhatsApp",
      intent: c.intent || "General",
      lead_status: c.lead_status,
      unread_count: c.unread_count || 0,
      last_message_preview: lastMsg?.content || "",
      last_message_at: lastMsg?.created_at
        ? formatRelativeTime(new Date(lastMsg.created_at))
        : "",
      ambassador: assignee
        ? {
            name: assignee.full_name,
            initials: assignee.initials,
            color: assignee.colour,
          }
        : null,
      ai_summary: c.ai_summary,
      ai_tags: c.ai_tags,
    };
  });

  return NextResponse.json(result);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
