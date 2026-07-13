// ─── Canonical message type ─────────────────────────────────────────────────
// This is the SINGLE source of truth for message shapes across the entire app.
// When we wire up Supabase, the `messages` table will mirror this type exactly.
//
// Replaces the 3 incompatible shapes from the Figma export:
//   ChatView.Msg:          { type: "student"|"ai"|"staff"|"system" }
//   WorkspaceMessage:      { from: "in"|"out"|"system", automated? }
//   SupervisorInbox.Msg:   { from: "prospect"|"ambassador" }

import type { Intent } from "./roles";

/** Who sent the message */
export type SenderType =
  | "student"     // incoming from prospect / student
  | "counselor"   // outgoing from counselor (human)
  | "ambassador"  // outgoing from student ambassador (human)
  | "ai"          // auto-reply from AI
  | "system";     // system divider (e.g. "— Escalated to human review —")

/** Canonical message — one shape to rule them all */
export type Message = {
  id: string;
  sender_type: SenderType;
  content: string;
  /** Display time (e.g. "10:42"). Will become ISO timestamp with Supabase. */
  sent_at: string;
  /** True for AI auto-replies — shows the "AI Auto-Reply" label */
  is_automated?: boolean;
};

/** Which platform the conversation originates from */
export type Channel = "WhatsApp" | "Instagram";

/** A conversation thread (maps to Supabase `conversations` table) */
export type Conversation = {
  id: string;
  /** Student / prospect name */
  student_name: string;
  /** Two-letter initials for avatar */
  student_initials: string;
  /** Latest message preview text */
  last_message_preview: string;
  /** Display timestamp */
  last_message_at: string;
  /** AI-classified intent category */
  intent: Intent;
  /** Messaging channel */
  channel: Channel;
  /** Number of unread messages (0 = read) */
  unread_count: number;
  /** Status in the sales pipeline */
  lead_status?: "new" | "active" | "submitted" | "enrolled";
};

/**
 * A supervised chat thread (counselor's team overview).
 * Extends the base conversation with ambassador assignment info.
 */
export type SupervisedConversation = {
  id: string;
  student_name: string;
  last_message_at: string;
  ambassador: {
    name: string;
    initials: string;
    color: string;
  };
  intent: {
    label: string;
    className: string;
  };
  last_message_preview: string;
};
