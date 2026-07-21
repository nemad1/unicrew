import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes one row to audit_logs. Best-effort: a failed audit write must never
 * fail the action it's logging, so errors are swallowed (and logged to the
 * server console) rather than thrown. Pass any client with write access to
 * audit_logs — usually the service-role client already in scope in the
 * calling route.
 */
export async function logAudit(
  client: SupabaseClient,
  params: {
    userId: string | null;
    contactId?: string | null;
    actionType: string;
    meta?: Record<string, unknown>;
  }
) {
  try {
    const { error } = await client.from("audit_logs").insert({
      user_id: params.userId,
      contact_id: params.contactId ?? null,
      action_type: params.actionType,
      meta: params.meta ?? {},
    });
    if (error) console.error("Failed to write audit log:", error.message);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
