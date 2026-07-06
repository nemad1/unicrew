import { useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  Sparkles,
  Search,
  Phone,
  MoreVertical,
  CalendarPlus,
  UserCheck,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AISuggestedRepliesDesktop } from "./ai-suggested-replies";
import { MessageBubble } from "./message-bubble";
import { WhatsAppIcon, InstagramIcon } from "@/components/icons/channel-icons";
import type { Message, Conversation, SenderType } from "@/types/messages";
import type { Role } from "@/types/roles";

export type ChatWorkspaceProps = {
  role: Role;
  conversation: Conversation;
  initialMessages: Message[];
  
  // Counselor-only actions
  onOpenFullView?: () => void;
  onOpenProfile?: () => void;

  // Ambassador-only actions
  onViewProfile?: () => void;
  onEscalate?: () => void;
  suggestedFact?: string;
};

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWorkspace({
  role,
  conversation,
  initialMessages,
  onViewProfile,
  onOpenProfile,
  onEscalate,
  suggestedFact,
}: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [showFact, setShowFact] = useState(!!suggestedFact);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync messages when the conversation changes
  useEffect(() => {
    setMessages(initialMessages);
    setShowFact(!!suggestedFact);
    setDraft("");
  }, [conversation.id, initialMessages, suggestedFact]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Assume sender is the current role
    const senderType: SenderType = role === "ambassador" ? "ambassador" : "counselor";

    setMessages((prev) => [
      ...prev,
      { id: `out-${Date.now()}`, sender_type: senderType, content: trimmed, sent_at: nowTime(), is_automated: false },
    ]);
    setDraft("");
  };

  const handleSend = () => send(draft);

  // ── Header right-side actions ───────────────────────────────────────────
  const headerActions =
    role === "counselor" ? (
      <>
        {onOpenProfile && (
          <Button variant="outline" size="sm" className="border-gray-200 text-gray-700" onClick={onOpenProfile}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            View Profile
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-gray-500" onClick={() => toast("Search coming soon")}>
          <Search className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500" onClick={() => toast("Calling feature coming soon")}>
          <Phone className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500" onClick={() => toast("More options coming soon")}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </>
    ) : (
      <>
        {onViewProfile && (
          <Button variant="outline" size="sm" className="border-gray-200 text-gray-700" onClick={onViewProfile}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            View Profile
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          onClick={onEscalate ?? (() => toast("Escalation request sent to your counselor"))}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
          Escalate to Counselor
        </Button>
      </>
    );

  // ── Action bar (above composer) ─────────────────────────────────────────
  const actionBar =
    role === "counselor" ? (
      <div className="flex flex-wrap gap-2 mb-3 relative">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700"
            onClick={() => setAiSuggestionsOpen((o) => !o)}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
            AI Draft Reply
          </Button>
          <AISuggestedRepliesDesktop
            open={aiSuggestionsOpen}
            onClose={() => setAiSuggestionsOpen(false)}
            onUseReply={(text) => {
              setMessages((prev) => [
                ...prev,
                { id: `counselor-${Date.now()}`, sender_type: "counselor", content: text, sent_at: nowTime(), is_automated: false },
              ]);
              setAiSuggestionsOpen(false);
            }}
            onEditReply={(text) => {
              setDraft(text);
              setAiSuggestionsOpen(false);
            }}
            onRegenerate={() => toast.loading("Regenerating suggestions…", { duration: 1500 })}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700"
          onClick={() => toast.success(`Transfer initiated for ${conversation.student_name}`)}
        >
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
          Transfer to Ambassador
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700"
          onClick={() => toast("Opening appointment scheduler…")}
        >
          <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
          Schedule Appointment
        </Button>
      </div>
    ) : (
      // Ambassador: inline Suggested Fact banner + Schedule
      suggestedFact && showFact ? (
        <div className="mb-3 bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-xs text-gray-500">Suggested Fact (From Knowledge Base):</span>
          </div>
          <div className="bg-blue-50/50 rounded-md px-2.5 py-2 text-sm text-gray-800">
            {suggestedFact}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white"
              onClick={() => {
                setDraft((d) => (d ? `${d} ${suggestedFact}` : suggestedFact));
                setShowFact(false);
              }}
            >
              Insert Fact
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-600" onClick={() => setShowFact(false)}>
              Dismiss
            </Button>
            <Button size="sm" variant="outline" className="ml-auto border-gray-200 text-gray-700" onClick={() => toast("Opening appointment scheduler…")}>
              <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              Schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant="outline" className="border-gray-200 text-gray-700" onClick={() => suggestedFact && setShowFact(true)}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
            Suggest a fact
          </Button>
          <Button size="sm" variant="outline" className="border-gray-200 text-gray-700" onClick={() => toast("Opening appointment scheduler…")}>
            <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
            Schedule Appointment
          </Button>
        </div>
      )
    );

  // Derived mock contact detail
  const mockPhoneStr = conversation.channel === "WhatsApp"
    ? `+60 12-345 ${(6789 + Number(conversation.id || 0)).toString().slice(0, 4)}`
    : `@${conversation.student_name.toLowerCase().replace(/[^a-z]+/g, "")}`;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/40 min-w-0 h-full">
      {/* ── Shared header ──────────────────────────────────────────────────── */}
      <div className="h-16 px-5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {conversation.student_initials}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{conversation.student_name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
              {conversation.channel === "WhatsApp" ? (
                <WhatsAppIcon className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <InstagramIcon className="w-3 h-3 text-pink-500 shrink-0" />
              )}
              <span className="truncate">{mockPhoneStr}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
      </div>

      {/* ── Shared message feed ────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      {/* ── Shared composer area ───────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-5 py-4 shrink-0">
        {actionBar}
        {/* Unified input row */}
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
            className="border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent text-sm"
          />
          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white shrink-0" onClick={handleSend}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
