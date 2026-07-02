/**
 * Centralized mock conversation data.
 *
 * Previously scattered across ChatList.tsx, SupervisorInbox.tsx, MobileApp.tsx.
 * Now in ONE file so "replace mock data with Supabase query" is a single swap.
 */

import type { Conversation, SupervisedConversation } from "@/types/messages";
import { intentStyles } from "@/types/roles";

// ─── Counselor inbox conversations ────────────────────────────────────────────

export const conversations: Conversation[] = [
  {
    id: "1",
    student_name: "Priya Shah",
    student_initials: "PS",
    last_message_preview:
      "Hi! Could you clarify the tuition payment deadline for Fall?",
    last_message_at: "10:42",
    intent: "Fees",
    channel: "WhatsApp",
    unread_count: 2,
  },
  {
    id: "2",
    student_name: "Marco Bianchi",
    student_initials: "MB",
    last_message_preview:
      "Are there clubs for international students this semester?",
    last_message_at: "10:31",
    intent: "Campus Life",
    channel: "Instagram",
    unread_count: 0,
  },
  {
    id: "3",
    student_name: "Yuki Tanaka",
    student_initials: "YT",
    last_message_preview:
      "What documents do I need for the F-1 visa interview?",
    last_message_at: "09:58",
    intent: "Visa & Immigration",
    channel: "WhatsApp",
    unread_count: 1,
  },
  {
    id: "4",
    student_name: "Liam O'Connor",
    student_initials: "LO",
    last_message_preview: "Can I switch my major after the first semester?",
    last_message_at: "09:21",
    intent: "Courses",
    channel: "Instagram",
    unread_count: 0,
  },
  {
    id: "5",
    student_name: "Sofia Hernández",
    student_initials: "SH",
    last_message_preview:
      "Is on-campus housing still available for freshmen?",
    last_message_at: "Yesterday",
    intent: "Housing",
    channel: "WhatsApp",
    unread_count: 0,
  },
  {
    id: "6",
    student_name: "Daniel Müller",
    student_initials: "DM",
    last_message_preview:
      "Thanks for the scholarship info — one more question.",
    last_message_at: "Yesterday",
    intent: "Fees",
    channel: "Instagram",
    unread_count: 0,
  },
];

// ─── Supervised chats (counselor team overview) ───────────────────────────────

export const supervisedConversations: SupervisedConversation[] = [
  {
    id: "1",
    student_name: "Carlos Mendoza",
    last_message_at: "10m ago",
    ambassador: {
      name: "Adel Zeinab",
      initials: "AZ",
      color: "bg-blue-100 text-blue-700",
    },
    intent: {
      label: "Campus Life",
      className: intentStyles["Campus Life"],
    },
    last_message_preview:
      "Honestly campus life is great but the first semester adjustment is real — happy to chat about it!",
  },
  {
    id: "2",
    student_name: "Priya Nair",
    last_message_at: "32m ago",
    ambassador: {
      name: "Alyssandra Fong",
      initials: "AF",
      color: "bg-pink-100 text-pink-700",
    },
    intent: {
      label: "Scholarships",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    last_message_preview:
      "The Excellence Award is renewable each year as long as you keep your CGPA above 3.5.",
  },
  {
    id: "3",
    student_name: "Yuki Tanaka",
    last_message_at: "1h ago",
    ambassador: {
      name: "Hana Kobayashi",
      initials: "HK",
      color: "bg-violet-100 text-violet-700",
    },
    intent: {
      label: "Visa & Immigration",
      className: intentStyles["Visa & Immigration"],
    },
    last_message_preview:
      "Make sure your bank statements cover at least one academic year of tuition + living.",
  },
  {
    id: "4",
    student_name: "Tomás Álvarez",
    last_message_at: "2h ago",
    ambassador: {
      name: "Sara Okonkwo",
      initials: "SO",
      color: "bg-rose-100 text-rose-700",
    },
    intent: {
      label: "Housing",
      className: intentStyles["Housing"],
    },
    last_message_preview:
      "On-campus housing tends to fill up by mid-July, I'd recommend applying this week.",
  },
];

// ─── Ambassador-specific conversations ────────────────────────────────────────

export const ambassadorConversations: Conversation[] = [
  {
    id: "a1",
    student_name: "Carlos Mendoza",
    student_initials: "CM",
    last_message_preview:
      "Hi Adel! I saw the website says there are en-suite rooms. Are they usually loud at night?",
    last_message_at: "10:42 AM",
    intent: "Housing",
    channel: "WhatsApp",
    unread_count: 1,
  },
  {
    id: "a2",
    student_name: "Wei Zhang",
    student_initials: "WZ",
    last_message_preview:
      "Thanks for the campus tour info! Really looking forward to it.",
    last_message_at: "Yesterday",
    intent: "Campus Life",
    channel: "Instagram",
    unread_count: 0,
  },
];
