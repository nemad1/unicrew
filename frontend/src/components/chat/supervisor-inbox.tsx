"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Eye,
  ExternalLink,
  Send,
  Paperclip,
  Phone,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SupervisedConversation, Message, SenderType } from "@/types/messages";

// ─── Mock data ────────────────────────────────────────────────────────────────

const supervisedChats: SupervisedConversation[] = [
  {
    id: "1",
    student_name: "Carlos Mendoza",
    last_message_at: "10m ago",
    ambassador: { name: "Adel Zeinab", initials: "AZ", color: "bg-blue-100 text-blue-700" },
    intent: { label: "Campus Life", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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
    intent: { label: "Scholarships", className: "bg-amber-50 text-amber-700 border-amber-200" },
    last_message_preview: "The Excellence Award is renewable each year as long as you keep your CGPA above 3.5.",
  },
  {
    id: "3",
    student_name: "Yuki Tanaka",
    last_message_at: "1h ago",
    ambassador: { name: "Hana Kobayashi", initials: "HK", color: "bg-violet-100 text-violet-700" },
    intent: { label: "Visa & Immigration", className: "bg-violet-50 text-violet-700 border-violet-200" },
    last_message_preview: "Make sure your bank statements cover at least one academic year of tuition + living.",
  },
  {
    id: "4",
    student_name: "Tomás Álvarez",
    last_message_at: "2h ago",
    ambassador: { name: "Sara Okonkwo", initials: "SO", color: "bg-rose-100 text-rose-700" },
    intent: { label: "Housing", className: "bg-pink-50 text-pink-700 border-pink-200" },
    last_message_preview: "On-campus housing tends to fill up by mid-July, I'd recommend applying this week.",
  },
];

type Msg = { id: string; from: "prospect" | "ambassador"; text: string; time: string };

const messagesMap: Record<string, Msg[]> = {
  "1": [
    { id: "1-1", from: "prospect", text: "Hi! Wanted to ask what campus life is actually like for CS students.", time: "10:32" },
    { id: "1-2", from: "ambassador", text: "Hey Carlos! I'm Adel, 3rd-year CS. The community is solid — coding clubs, hackathons, and chill cafes around campus.", time: "10:34" },
    { id: "1-3", from: "prospect", text: "What about workload? Is it true the first semester is brutal?", time: "10:38" },
    { id: "1-4", from: "ambassador", text: "Honestly the adjustment is real, but profs are super approachable and the peer tutoring center saved me. Happy to share my weekly schedule if it helps!", time: "10:41" },
  ],
  "2": [
    { id: "2-1", from: "prospect", text: "Is the Excellence Award something I have to reapply for every year?", time: "09:58" },
    { id: "2-2", from: "ambassador", text: "Great question Priya! The Excellence Award is renewable each year as long as you keep your CGPA above 3.5.", time: "10:03" },
    { id: "2-3", from: "prospect", text: "That's reassuring. Are there other scholarships I can stack with it?", time: "10:09" },
  ],
  "3": [
    { id: "3-1", from: "prospect", text: "I'm preparing my visa documents — how much should my bank statement show?", time: "08:40" },
    { id: "3-2", from: "ambassador", text: "Make sure your bank statements cover at least one academic year of tuition + living. Hana here, happy to share the checklist I used!", time: "08:52" },
    { id: "3-3", from: "prospect", text: "Yes please, that would be really helpful.", time: "09:01" },
  ],
  "4": [
    { id: "4-1", from: "prospect", text: "Is on-campus accommodation still available for the September intake?", time: "Yesterday" },
    { id: "4-2", from: "ambassador", text: "On-campus housing tends to fill up by mid-July, I'd recommend applying this week. I'm Sara, let me know if you want a virtual tour of the dorms!", time: "Yesterday" },
    { id: "4-3", from: "prospect", text: "A virtual tour sounds perfect, thank you Sara!", time: "Yesterday" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "Adel Zeinab" → "Adel Z." */
function ambassadorLabel(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatRow({
  chat,
  active,
  onSelect,
}: {
  chat: SupervisedConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 border-b border-gray-100 border-l-4 transition-colors",
        active
          ? "bg-gray-50 border-l-blue-700"
          : "bg-white border-l-transparent hover:bg-gray-50/60",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm text-gray-900 font-medium truncate">{chat.student_name}</span>
        <span className="text-xs text-gray-400 shrink-0">{chat.last_message_at}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border border-gray-200 bg-white text-xs">
          <span
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-[9px]",
              chat.ambassador.color,
            )}
          >
            {chat.ambassador.initials}
          </span>
          <span className="text-gray-700">Assigned to: {chat.ambassador.name}</span>
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
            chat.intent.className,
          )}
        >
          {chat.intent.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">{chat.last_message_preview}</p>
    </button>
  );
}

function MessageBubble({ msg, ambassadorName }: { msg: Msg; ambassadorName: string }) {
  if (msg.from === "prospect") {
    return (
      <div className="flex flex-col items-start max-w-[70%]">
        <div className="bg-gray-100 text-gray-900 px-4 py-2.5 rounded-lg rounded-tl-none text-sm">
          {msg.text}
        </div>
        <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end max-w-[70%] ml-auto">
      <span className="text-xs text-blue-700 mb-1">{ambassadorLabel(ambassadorName)}</span>
      <div className="bg-blue-50 border border-blue-200 text-gray-900 px-4 py-2.5 rounded-lg text-sm">
        {msg.text}
      </div>
      <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SupervisorInbox({
  onSwitchToPersonal,
  onViewProfile,
}: {
  onSwitchToPersonal?: () => void;
  onViewProfile?: () => void;
}) {
  const [activeId, setActiveId] = useState(supervisedChats[0].id);
  const [composerTab, setComposerTab] = useState<"whisper" | "takeover">("whisper");
  const active = supervisedChats.find((c) => c.id === activeId) ?? supervisedChats[0];
  const [messages, setMessages] = useState<Msg[]>(messagesMap[activeId] ?? []);
  const [takeoverDraft, setTakeoverDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(messagesMap[activeId] ?? []);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleTakeoverSend = () => {
    const text = takeoverDraft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `to-${Date.now()}`,
        from: "ambassador",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setTakeoverDraft("");
  };

  return (
    <div className="flex-1 flex min-w-0 bg-white">
      {/* Left panel */}
      <div className="w-96 shrink-0 border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="grid grid-cols-2 bg-gray-100 rounded-md p-1">
            <button
              onClick={onSwitchToPersonal}
              className="text-xs py-1.5 rounded text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Chats (3)
            </button>
            <button
              className="text-xs py-1.5 rounded bg-white text-gray-900 shadow-sm border border-gray-200"
            >
              Team Overview (12)
            </button>
          </div>
        </div>
        <div className="px-3 py-3 border-b border-gray-200 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search" className="pl-9 h-8 bg-gray-50 border-gray-200" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ambassadors</SelectItem>
              <SelectItem value="adel">Adel Zeinab</SelectItem>
              <SelectItem value="alyssa">Alyssandra Fong</SelectItem>
              <SelectItem value="hana">Hana Kobayashi</SelectItem>
              <SelectItem value="sara">Sara Okonkwo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {supervisedChats.map((c) => (
            <ChatRow
              key={c.id}
              chat={c}
              active={c.id === activeId}
              onSelect={() => setActiveId(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/40">
        <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm shrink-0">
              {active.student_name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-sm text-gray-900 font-semibold truncate">{active.student_name}</div>
              <div className="text-xs text-gray-500 truncate">+60 12-987 6543</div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0">
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px]",
                  active.ambassador.color,
                )}
              >
                {active.ambassador.initials}
              </span>
              Handled by {active.ambassador.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700"
              onClick={onViewProfile}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Prospect Profile
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2 flex items-center gap-2 shrink-0">
          <Eye className="w-4 h-4 shrink-0" />
          <span className="text-xs">
            <span className="font-medium">Observer Mode:</span> You are viewing an active peer
            consultation. The prospective student cannot see your presence.
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
              <Eye className="w-10 h-10 mb-3" />
              <p className="text-sm text-gray-500">No active supervised chats</p>
              <p className="text-xs mt-1">Select a conversation to observe.</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} msg={m} ambassadorName={active.ambassador.name} />
            ))
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
          <div className="flex items-center gap-1 mb-3 border-b border-gray-200">
            <button
              onClick={() => setComposerTab("whisper")}
              className={cn(
                "px-3 py-2 text-xs border-b-2 -mb-px transition-colors",
                composerTab === "whisper"
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-900",
              )}
            >
              Internal Whisper
            </button>
            <button
              onClick={() => setComposerTab("takeover")}
              className={cn(
                "px-3 py-2 text-xs border-b-2 -mb-px transition-colors",
                composerTab === "takeover"
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-900",
              )}
            >
              Take Over Chat
            </button>
          </div>

          {composerTab === "whisper" ? (
            <div className="space-y-2">
              <Textarea
                rows={3}
                placeholder={`Send a private note to ${active.ambassador.name.split(" ")[0]} regarding this chat...`}
                className="bg-amber-50/40 border-amber-200 focus-visible:ring-amber-300 text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Paperclip className="w-3.5 h-3.5 mr-1" />
                  Attach
                </Button>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send Whisper
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={takeoverDraft}
                onChange={(e) => setTakeoverDraft(e.target.value)}
                placeholder={`Type a message — this will be sent to the prospect, replacing ${active.ambassador.name.split(" ")[0]} as the responder.`}
                className="bg-white border-gray-200 text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {active.ambassador.name.split(" ")[0]} will be notified that you have taken over the conversation.
                </span>
                <Button
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-800 text-white"
                  onClick={handleTakeoverSend}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Take Over & Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
