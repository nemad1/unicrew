import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// "This Month" and "Last 30 Days" both map to 30 — that overlap is inherited
// from the dropdown's original (dummy-data era) options, not introduced here.
const RANGE_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  "30d": 30,
  "90d": 90,
};

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function pctTrend(current: number, previous: number): { pct: number; dir: "up" | "down" } | null {
  if (previous === 0) return current === 0 ? null : { pct: 100, dir: "up" };
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.round(Math.abs(pct)), dir: pct >= 0 ? "up" : "down" };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Average "time to first response": for each contact, the gap between a
 * student message and the next ambassador message after it. There's no
 * populated response_time_seconds column to read (schema has it, nothing
 * ever writes it) — this derives the real thing from message timestamps.
 * Returns { avgSeconds, byAssignee } where byAssignee maps assigned_to -> avgSeconds.
 */
function computeResponseTimes(
  logs: { contact_id: string; sender_type: string; created_at: string }[],
  contactAssignee: Record<string, string | null>
) {
  const byContact: Record<string, { created_at: string; sender_type: string }[]> = {};
  for (const log of logs) {
    (byContact[log.contact_id] ||= []).push(log);
  }

  const gaps: number[] = [];
  const gapsByAssignee: Record<string, number[]> = {};

  for (const [contactId, contactLogs] of Object.entries(byContact)) {
    contactLogs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    let pendingSince: string | null = null;
    for (const log of contactLogs) {
      if (log.sender_type === "student") {
        if (!pendingSince) pendingSince = log.created_at;
      } else if (log.sender_type === "ambassador" && pendingSince) {
        const gapSeconds = (new Date(log.created_at).getTime() - new Date(pendingSince).getTime()) / 1000;
        gaps.push(gapSeconds);
        const assignee = contactAssignee[contactId];
        if (assignee) (gapsByAssignee[assignee] ||= []).push(gapSeconds);
        pendingSince = null;
      }
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const byAssignee: Record<string, number | null> = {};
  for (const [assignee, arr] of Object.entries(gapsByAssignee)) {
    byAssignee[assignee] = avg(arr);
  }

  return { avgSeconds: avg(gaps), byAssignee };
}

export async function GET(request: Request) {
  const authedSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("internal_users")
    .select("id, role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";
  const rangeDays = RANGE_DAYS[range] || 30;

  const now = new Date();
  const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const prevRangeStart = new Date(rangeStart.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  // Legitimate "nothing in scope" cases (no team assigned, or a scope with
  // zero contacts) return this same zeroed shape — never an `error` key,
  // since the frontend treats any `error` field as a failure state.
  function emptyOverview(helper: string) {
    return NextResponse.json({
      metrics: {
        totalStudents: { value: 0, helper },
        openInquiries: { value: 0, helper: "Needs a reply" },
        enrolledInRange: { value: 0, trend: null, helper: "In the selected range" },
        avgResponseTime: { value: null, display: null, trend: null, helper: "Not enough message data yet" },
      },
      inquiryTrend: [],
      enrollmentsByAmbassador: [],
      leaderboard: [],
      activityFeed: [],
    });
  }

  // 1. Scoped contacts (role mirrors inbox/kanban: admin=all, counselor=team, ambassador=own)
  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, phone_number, unread_count, assigned_to, created_at");

  if (profile.role === "ambassador") {
    contactsQuery = contactsQuery.eq("assigned_to", user.id);
  } else if (profile.role === "counselor") {
    if (!profile.team_id) return emptyOverview("No team assigned yet");
    contactsQuery = contactsQuery.eq("team_id", profile.team_id);
  }

  const { data: contacts, error: contactsError } = await contactsQuery;
  if (contactsError) return NextResponse.json({ error: contactsError.message }, { status: 500 });

  const scopedContacts = contacts || [];
  const contactIds = scopedContacts.map((c) => c.id);
  const contactById = Object.fromEntries(scopedContacts.map((c) => [c.id, c]));
  const contactAssignee = Object.fromEntries(scopedContacts.map((c) => [c.id, c.assigned_to]));

  if (contactIds.length === 0) {
    return emptyOverview("No students in scope yet");
  }

  // 2. Kanban cards for these contacts, joined to stage (for "enrolled" = is_completed)
  const { data: cards } = await supabase
    .from("kanban_cards")
    .select("id, contact_id, updated_at, kanban_stages ( name, is_completed )")
    .in("contact_id", contactIds);

  const scopedCards = (cards || []).map((c) => {
    const stage = Array.isArray(c.kanban_stages) ? c.kanban_stages[0] : c.kanban_stages;
    return { ...c, stageName: stage?.name || "Unknown", isCompleted: !!stage?.is_completed };
  });

  const completedInRange = scopedCards.filter(
    (c) => c.isCompleted && c.updated_at >= rangeStart.toISOString()
  );
  const completedInPrevRange = scopedCards.filter(
    (c) => c.isCompleted && c.updated_at >= prevRangeStart.toISOString() && c.updated_at < rangeStart.toISOString()
  );

  // 3. Interaction logs covering current + previous range (needed for both periods' trends)
  const { data: logs } = await supabase
    .from("interaction_logs")
    .select("contact_id, sender_type, content, created_at")
    .in("contact_id", contactIds)
    .gte("created_at", prevRangeStart.toISOString())
    .order("created_at", { ascending: true });

  const allLogs = logs || [];
  const logsInRange = allLogs.filter((l) => l.created_at >= rangeStart.toISOString());
  const logsInPrevRange = allLogs.filter((l) => l.created_at < rangeStart.toISOString());

  // ── Metrics ──────────────────────────────────────────────────────────
  const totalStudents = scopedContacts.length;
  const newInRange = scopedContacts.filter((c) => c.created_at >= rangeStart.toISOString()).length;
  const openInquiries = scopedContacts.filter((c) => (c.unread_count || 0) > 0).length;

  const enrolledInRange = completedInRange.length;
  const enrollTrend = pctTrend(enrolledInRange, completedInPrevRange.length);

  const responseNow = computeResponseTimes(logsInRange, contactAssignee);
  const responsePrev = computeResponseTimes(logsInPrevRange, contactAssignee);
  const responseTrend =
    responseNow.avgSeconds !== null && responsePrev.avgSeconds !== null
      ? pctTrend(responseNow.avgSeconds, responsePrev.avgSeconds)
      : null;

  // ── Inquiry volume trend (inbound student messages, bucketed by day) ──
  const dayBuckets: Record<string, number> = {};
  for (const l of logsInRange) {
    if (l.sender_type !== "student") continue;
    const day = new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayBuckets[day] = (dayBuckets[day] || 0) + 1;
  }
  const inquiryTrend = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  // ── Enrollments by ambassador + leaderboard ────────────────────────────
  const assigneeIds = [...new Set(completedInRange.map((c) => contactAssignee[c.contact_id]).filter(Boolean))] as string[];
  let assigneeMap: Record<string, string> = {};
  if (assigneeIds.length > 0) {
    const { data: assignees } = await supabase.from("internal_users").select("id, full_name").in("id", assigneeIds);
    assigneeMap = Object.fromEntries((assignees || []).map((a) => [a.id, a.full_name]));
  }

  const dealsByAssignee: Record<string, number> = {};
  for (const c of completedInRange) {
    const assignee = contactAssignee[c.contact_id];
    if (!assignee) continue;
    dealsByAssignee[assignee] = (dealsByAssignee[assignee] || 0) + 1;
  }

  const enrollmentsByAmbassador = Object.entries(dealsByAssignee)
    .map(([id, deals]) => ({ name: assigneeMap[id] || "Unknown", deals }))
    .sort((a, b) => b.deals - a.deals);

  const leaderboard = Object.entries(dealsByAssignee)
    .map(([id, deals]) => {
      const name = assigneeMap[id] || "Unknown";
      const avgSecs = responseNow.byAssignee[id];
      return {
        id,
        name,
        initials: getInitials(name),
        deals,
        avgResponse: avgSecs != null ? formatDuration(avgSecs) : null,
      };
    })
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 5)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  // ── Activity feed: merged real events, no audit_logs (table is never
  // written to anywhere in the app) ──────────────────────────────────────
  type ActivityItem = { type: string; action: string; meta: string; time: string };
  const activity: ActivityItem[] = [];

  for (const l of logsInRange) {
    if (l.sender_type !== "system") continue;
    const contact = contactById[l.contact_id];
    activity.push({
      type: "ai_note",
      action: `AI update for ${contact?.name || contact?.phone_number || "a student"}: ${l.content}`,
      meta: "Automated analysis",
      time: l.created_at,
    });
  }

  for (const c of scopedCards) {
    if (c.updated_at < rangeStart.toISOString()) continue;
    const contact = contactById[c.contact_id];
    activity.push({
      type: "stage_move",
      action: `${contact?.name || contact?.phone_number || "A student"} moved to ${c.stageName}`,
      meta: "Pipeline update",
      time: c.updated_at,
    });
  }

  for (const c of scopedContacts) {
    if (c.created_at < rangeStart.toISOString()) continue;
    activity.push({
      type: "new_contact",
      action: `New inquiry: ${c.name || c.phone_number}`,
      meta: "New contact",
      time: c.created_at,
    });
  }

  activity.sort((a, b) => b.time.localeCompare(a.time));

  return NextResponse.json({
    metrics: {
      totalStudents: { value: totalStudents, helper: `+${newInRange} new this range` },
      openInquiries: { value: openInquiries, helper: "Needs a reply" },
      enrolledInRange: { value: enrolledInRange, trend: enrollTrend, helper: "vs previous period" },
      avgResponseTime: {
        value: responseNow.avgSeconds,
        display: responseNow.avgSeconds != null ? formatDuration(responseNow.avgSeconds) : null,
        trend: responseTrend,
        helper: responseNow.avgSeconds != null ? "vs previous period" : "Not enough message data yet",
      },
    },
    inquiryTrend,
    enrollmentsByAmbassador,
    leaderboard,
    activityFeed: activity.slice(0, 8),
  });
}
