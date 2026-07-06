"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Search,
  Phone,
  MoreVertical,
  Sparkles,
  UserCheck,
  CalendarPlus,
  Send,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Deal } from "@/components/kanban/kanban-board";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { Message } from "@/types/messages";

const intentBadgeStyles: Record<string, string> = {
  Fees: "bg-amber-50 text-amber-700 border-amber-200",
  "Campus Life": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Visas: "bg-violet-50 text-violet-700 border-violet-200",
  Courses: "bg-blue-50 text-blue-700 border-blue-200",
  Housing: "bg-pink-50 text-pink-700 border-pink-200",
};

const notes = [
  {
    id: "n1",
    author: "Amelia Park",
    role: "Admissions Lead",
    time: "Today · 09:14",
    body: "Student is comparing us with two other universities. Emphasize scholarship options and campus safety in follow-ups.",
  },
  {
    id: "n2",
    author: "Adel Zeinab",
    role: "Ambassador · 3rd Year",
    time: "Yesterday · 16:40",
    body: "Had a great call about campus life. Very keen on the CS program — wants details on internship placement rates.",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.55 3.74 1.5 5.27L2 22l4.95-1.59a9.86 9.86 0 0 0 5.09 1.41h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7C17.18 3.04 14.7 2 12.04 2zm5.83 14.04c-.25.7-1.44 1.34-2.02 1.42-.51.07-1.17.1-1.88-.12-.43-.13-.99-.32-1.71-.63-3-1.3-4.96-4.32-5.11-4.52-.15-.2-1.22-1.62-1.22-3.09s.77-2.19 1.04-2.49c.27-.3.59-.37.79-.37.2 0 .39 0 .57.01.18.01.42-.07.66.5.25.61.84 2.08.91 2.23.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.54-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.37 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.49.22.56.35.07.13.07.73-.18 1.43z"/>
    </svg>
  );
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender_type: "student",
    content: "Hi, I wanted to ask about the fees for the Computer Science foundation program?",
    sent_at: "10:24",
  },
  {
    id: "2",
    sender_type: "ai",
    content: "Hi Aisha! The Foundation in Computing at APU starts from RM 13,900 per semester. Would you like me to send you a full fee breakdown or connect you with a student ambassador?",
    sent_at: "10:25",
    is_automated: true,
  },
  {
    id: "3",
    sender_type: "student",
    content: "Yes please, also what is campus life actually like? The website makes it look perfect but I want the real story.",
    sent_at: "10:30",
  },
  {
    id: "4",
    sender_type: "system",
    content: "— AI confidence below threshold — Escalated to human review —",
    sent_at: "10:30",
  },
  {
    id: "5",
    sender_type: "ambassador",
    content: "Hey Aisha! I am Adel, a 3rd-year CS student here. Honestly campus life is great but the first semester adjustment is real — happy to chat about it!",
    sent_at: "10:38",
  },
  {
    id: "6",
    sender_type: "student",
    content: "Oh amazing, can we schedule a call? Also is there a scholarship I can apply for?",
    sent_at: "10:41",
  },
];

export function ExpandedChatView({
  deal,
  onBack,
  onOpenProfile,
}: {
  deal: Deal;
  onBack: () => void;
  onOpenProfile?: () => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>(mockMessages);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setMsgs((prev) => [
      ...prev,
      {
        id: `staff-${Date.now()}`,
        sender_type: "counselor",
        content: text,
        sent_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setDraft("");
  };

  const firstName = deal.name.split(" ")[0];
  const handle = `@${deal.name.toLowerCase().replace(/[^a-z]+/g, "")}`;
  const contact = handle; // Mock for now
  const intentClass = intentBadgeStyles[deal.intent] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className="flex-1 flex min-w-0 bg-white h-full">
      {/* Column 1: Conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-gray-200 px-5 flex items-center gap-3 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Pipeline
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div className="leading-tight">
            <div className="text-gray-900 font-semibold text-sm">{deal.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              {contact}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50/40">
          {msgs.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              AI Draft Reply
            </Button>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              Transfer to Ambassador
            </Button>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">
              <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              Schedule Appointment
            </Button>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus-within:border-blue-500 transition-colors">
            <Button variant="ghost" size="icon" className="text-gray-400 shrink-0">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a reply..."
              className="border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent"
            />
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white shrink-0"
              onClick={handleSend}
            >
              <Send className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Column 2: AI Assistance Panel */}
      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
        {/* Section 1: Context */}
        <div className="p-4 border-b border-gray-200">
          <div className="rounded-lg border border-gray-200 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-900 font-medium">{deal.name}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-700 text-white">
                Active Consulting
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                  intentClass,
                )}
              >
                {deal.intent}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              <div className="text-gray-400 mb-0.5">Course Interest</div>
              BSc (Hons) Computer Science
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              {contact}
            </div>
            <button onClick={onOpenProfile} className="text-xs text-blue-700 hover:underline">
              View Full Profile
            </button>
          </div>
        </div>

        {/* Section 2: AI Draft Reply */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span className="text-sm text-gray-900 font-medium">AI Draft Reply</span>
          </div>
          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed">
            Hi {firstName}! Great question about scholarships. APU offers the Excellence Award for
            students with CGPA above 3.5, and the International Bursary for non-Malaysian
            students. Shall I send you the full criteria document?
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Confidence</span>
              <span className="text-gray-700">85%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
            </div>
            <div className="text-xs text-gray-500">
              ↳ Source: APU Scholarship Guide 2025.pdf, pg. 4
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-blue-700 hover:bg-blue-800 text-white">
              Edit & Send
            </Button>
            <Button variant="outline" className="flex-1 border-gray-200 text-gray-700">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Section 3: Quick Actions */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <Button variant="outline" className="w-full justify-start border-gray-200 text-gray-700">
            <UserCheck className="w-4 h-4 mr-2 text-blue-700" />
            Transfer to Ambassador
          </Button>
          <Button variant="outline" className="w-full justify-start border-gray-200 text-gray-700">
            <CalendarPlus className="w-4 h-4 mr-2 text-blue-700" />
            Schedule Appointment
          </Button>
          <Button variant="outline" className="w-full justify-start border-gray-200">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            <span className="text-emerald-700">Mark as Enrolled</span>
          </Button>
        </div>

        {/* Section 4: Notes */}
        <div className="p-4">
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-gray-900"
          >
            <span>Internal Notes ({notes.length})</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", notesOpen && "rotate-180")} />
          </button>

          {notesOpen && (
            <div className="mt-3 space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-900">{note.author}</span>
                    <span className="text-[10px] text-gray-400">{note.time}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    {note.role}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{note.body}</p>
                </div>
              ))}

              <div className="space-y-2">
                <Textarea
                  rows={2}
                  placeholder="Add a note…"
                  className="bg-white border-gray-200 text-sm resize-none"
                />
                <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                  Add Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
