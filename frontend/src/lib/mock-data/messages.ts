/**
 * Centralized mock message data.
 *
 * Previously scattered across ActiveChat.tsx, ChatView.tsx,
 * SupervisorInbox.tsx, AmbassadorChats.tsx.
 * All messages now use the canonical Message type.
 */

import type { Message } from "@/types/messages";

// ─── Counselor inbox: Priya Shah thread (conversation "1") ────────────────────

export const priyaShahMessages: Message[] = [
  {
    id: "m1",
    sender_type: "student",
    content:
      "Hi! Could you clarify the tuition payment deadline for Fall semester?",
    sent_at: "10:32",
    is_automated: false,
  },
  {
    id: "m2",
    sender_type: "ai",
    content:
      "Hello Priya! The Fall tuition payment deadline is August 15, 2026. Installment plans are also available — would you like me to share the details?",
    sent_at: "10:33",
    is_automated: true,
  },
  {
    id: "m3",
    sender_type: "student",
    content: "Yes please. Also, is there a late fee if I miss the deadline?",
    sent_at: "10:36",
    is_automated: false,
  },
  {
    id: "m4",
    sender_type: "ai",
    content:
      "A late fee of $75 applies after the deadline. I'm sharing the installment plan document now. Let me know if you'd like a human ambassador to walk you through it.",
    sent_at: "10:37",
    is_automated: true,
  },
  {
    id: "m5",
    sender_type: "student",
    content: "That would be great, thank you!",
    sent_at: "10:42",
    is_automated: false,
  },
];

// ─── Full chat view: Aisha thread (expanded conversation) ─────────────────────

export const aishaChatMessages: Message[] = [
  {
    id: "cv1",
    sender_type: "student",
    content:
      "Hi, I wanted to ask about the fees for the Computer Science foundation program?",
    sent_at: "10:24",
    is_automated: false,
  },
  {
    id: "cv2",
    sender_type: "ai",
    content:
      "Hi Aisha! The Foundation in Computing at APU starts from RM 13,900 per semester. Would you like me to send you a full fee breakdown or connect you with a student ambassador?",
    sent_at: "10:25",
    is_automated: true,
  },
  {
    id: "cv3",
    sender_type: "student",
    content:
      "Yes please, also what is campus life actually like? The website makes it look perfect but I want the real story.",
    sent_at: "10:30",
    is_automated: false,
  },
  {
    id: "cv4",
    sender_type: "system",
    content: "— AI confidence below threshold — Escalated to human review —",
    sent_at: "",
    is_automated: false,
  },
  {
    id: "cv5",
    sender_type: "ambassador",
    content:
      "Hey Aisha! I am Adel, a 3rd-year CS student here. Honestly campus life is great but the first semester adjustment is real — happy to chat about it!",
    sent_at: "10:38",
    is_automated: false,
  },
  {
    id: "cv6",
    sender_type: "student",
    content:
      "Oh amazing, can we schedule a call? Also is there a scholarship I can apply for?",
    sent_at: "10:41",
    is_automated: false,
  },
];

// ─── Supervisor inbox: team threads ───────────────────────────────────────────

export const supervisedThreadMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "s1-1",
      sender_type: "student",
      content:
        "Hi! Wanted to ask what campus life is actually like for CS students.",
      sent_at: "10:32",
      is_automated: false,
    },
    {
      id: "s1-2",
      sender_type: "ambassador",
      content:
        "Hey Carlos! I'm Adel, 3rd-year CS. The community is solid — coding clubs, hackathons, and chill cafes around campus.",
      sent_at: "10:34",
      is_automated: false,
    },
    {
      id: "s1-3",
      sender_type: "student",
      content:
        "What about workload? Is it true the first semester is brutal?",
      sent_at: "10:38",
      is_automated: false,
    },
    {
      id: "s1-4",
      sender_type: "ambassador",
      content:
        "Honestly the adjustment is real, but profs are super approachable and the peer tutoring center saved me. Happy to share my weekly schedule if it helps!",
      sent_at: "10:41",
      is_automated: false,
    },
  ],
  "2": [
    {
      id: "s2-1",
      sender_type: "student",
      content:
        "I heard about the Excellence Award — is it hard to get?",
      sent_at: "09:15",
      is_automated: false,
    },
    {
      id: "s2-2",
      sender_type: "ambassador",
      content:
        "The Excellence Award is renewable each year as long as you keep your CGPA above 3.5. Most students who apply with strong SPM/O-Level results get it!",
      sent_at: "09:18",
      is_automated: false,
    },
  ],
  "3": [
    {
      id: "s3-1",
      sender_type: "student",
      content:
        "What documents do I need for the F-1 visa interview?",
      sent_at: "08:45",
      is_automated: false,
    },
    {
      id: "s3-2",
      sender_type: "ambassador",
      content:
        "Make sure your bank statements cover at least one academic year of tuition + living. I'll send you the full checklist.",
      sent_at: "08:50",
      is_automated: false,
    },
  ],
  "4": [
    {
      id: "s4-1",
      sender_type: "student",
      content:
        "Is on-campus housing still available for the next intake?",
      sent_at: "07:30",
      is_automated: false,
    },
    {
      id: "s4-2",
      sender_type: "ambassador",
      content:
        "On-campus housing tends to fill up by mid-July, I'd recommend applying this week.",
      sent_at: "07:35",
      is_automated: false,
    },
  ],
};

// ─── Ambassador chats: Carlos Mendoza thread ──────────────────────────────────

export const ambassadorChatMessages: Message[] = [
  {
    id: "amb1",
    sender_type: "student",
    content:
      "Hi Adel! I saw the website says there are en-suite rooms. Are they usually loud at night? I need quiet to study.",
    sent_at: "10:42 AM",
    is_automated: false,
  },
  {
    id: "amb2",
    sender_type: "ambassador",
    content:
      "Hey Carlos! Honestly, the en-suite blocks are usually the quietest. Level 3 and 4 are strictly for final-year students so it is super chill.",
    sent_at: "10:45 AM",
    is_automated: false,
  },
  {
    id: "amb3",
    sender_type: "student",
    content:
      "That is a relief. Do you know exactly how much the deposit is for those rooms?",
    sent_at: "Just now",
    is_automated: false,
  },
];

// ─── Helper: generate fallback messages for any conversation ──────────────────

export function getMessagesForConversation(
  conversationId: string,
  studentName: string,
  intent: string,
  time: string,
  preview: string
): Message[] {
  // Return known thread if it exists
  if (conversationId === "1") return priyaShahMessages;

  // Generate a sensible fallback for conversations without explicit mock data
  const firstName = studentName.split(" ")[0];
  return [
    {
      id: `${conversationId}-1`,
      sender_type: "student",
      content: preview,
      sent_at: time,
      is_automated: false,
    },
    {
      id: `${conversationId}-2`,
      sender_type: "ai",
      content: `Hi ${firstName}! Thanks for reaching out about ${intent.toLowerCase()}. I'd be happy to help — could you share a few more details?`,
      sent_at: time,
      is_automated: true,
    },
  ];
}
