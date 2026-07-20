"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  Eye,
  ExternalLink,
  Send,
  Paperclip,
  Phone,
  MoreVertical,
  Loader2,
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
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type AmbassadorInfo = {
  name: string;
  initials: string;
  color: string;
};

type SupervisedConversation = {
  id: string; // The JID (phone_number@c.us) or fallback ID
  contact_id: string; // The UUID in contacts table
  student_name: string;
  student_initials: string;
  phone_number: string;
  channel: string;
  intent: string;
  lead_status: string;
  unread_count: number;
  last_message_preview: string;
  last_message_at: string;
  ambassador: AmbassadorInfo | null;
  ai_summary: string | null;
  ai_tags: string[] | null;
};

type InteractionLog = {
  id: string;
  contact_id: string;
  sender_type: "bot" | "user" | "counselor" | "ambassador" | "prospect";
  sender_id: string | null;
  content: string;
  created_at: string;
  message_id: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ambassadorLabel(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const intentStyles: Record<string, string> = {
  "Campus Life": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Scholarships": "bg-amber-50 text-amber-700 border-amber-200",
  "Visa & Immigration": "bg-violet-50 text-violet-700 border-violet-200",
  "Housing": "bg-pink-50 text-pink-700 border-pink-200",
  "General": "bg-gray-50 text-gray-700 border-gray-200",
};

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
  const intentStyle = intentStyles[chat.intent] || intentStyles["General"];

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
        {chat.ambassador ? (
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
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-xs">
            Unassigned
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
            intentStyle,
          )}
        >
          {chat.intent}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">
        {chat.last_message_preview || "No messages yet"}
      </p>
    </button>
  );
}

function MessageBubble({ msg, ambassadorName }: { msg: InteractionLog; ambassadorName?: string }) {
  const isProspect = msg.sender_type === "user" || msg.sender_type === "prospect";

  if (isProspect) {
    return (
      <div className="flex flex-col items-start max-w-[70%]">
        <div className="bg-gray-100 text-gray-900 px-4 py-2.5 rounded-lg rounded-tl-none text-sm whitespace-pre-wrap">
          {msg.content}
        </div>
        <span className="text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</span>
      </div>
    );
  }

  const label = msg.sender_type === "bot" ? "AI Assistant" : (ambassadorName ? ambassadorLabel(ambassadorName) : "UniCrew");

  return (
    <div className="flex flex-col items-end max-w-[70%] ml-auto">
      <span className="text-xs text-blue-700 mb-1">{label}</span>
      <div className="bg-blue-50 border border-blue-200 text-gray-900 px-4 py-2.5 rounded-lg text-sm whitespace-pre-wrap">
        {msg.content}
      </div>
      <span className="text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SupervisorInbox({
  onSwitchToPersonal,
  onViewProfile,
  onChatsCountChange,
}: {
  onSwitchToPersonal?: () => void;
  onViewProfile?: () => void;
  onChatsCountChange?: (count: number) => void;
}) {
  const [chats, setChats] = useState<SupervisedConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InteractionLog[]>([]);
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [composerTab, setComposerTab] = useState<"whisper" | "takeover">("whisper");
  const [takeoverDraft, setTakeoverDraft] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // 1. Fetch conversations (and re-poll periodically so the overview stays
  // in sync as new messages land across ambassadors' sessions)
  const fetchChats = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoadingChats(true);
      const res = await fetch("/api/inbox?mode=team");
      if (!res.ok) throw new Error("Failed to fetch supervised chats");

      const data: SupervisedConversation[] = await res.json();
      setChats(data);
      onChatsCountChange?.(data.length);
      setActiveId((prev) => prev || (data.length > 0 ? data[0].id : prev));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      if (!opts?.silent) setLoadingChats(false);
    }
  }, [onChatsCountChange]);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(() => fetchChats({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // 2. Fetch messages for active chat — keyed on the active contact and its
  // last message timestamp, so a background chat-list poll doesn't retrigger
  // this (and flicker the loading spinner) unless something actually changed.
  const activeChat = chats.find((c) => c.id === activeId) || null;
  const activeContactId = activeChat?.contact_id;
  const activeLastMessageAt = activeChat?.last_message_at;

  useEffect(() => {
    async function fetchMessages() {
      if (!activeContactId) return;

      try {
        setLoadingMessages(true);
        const { data, error: dbError } = await supabase
          .from("interaction_logs")
          .select("*")
          .eq("contact_id", activeContactId)
          .order("created_at", { ascending: true });

        if (dbError) throw dbError;
        setMessages(data || []);
      } catch (err: any) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [activeContactId, activeLastMessageAt, supabase]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const active = activeChat;

  const filteredChats = chats.filter((c) =>
    c.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTakeoverSend = async () => {
    const text = takeoverDraft.trim();
    if (!text || !active) return;
    
    // Optimistic UI update
    const newMsg: InteractionLog = {
      id: `to-${Date.now()}`,
      contact_id: active.contact_id,
      sender_type: "counselor",
      sender_id: null,
      content: text,
      created_at: new Date().toISOString(),
      message_id: null,
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setTakeoverDraft("");
    
    try {
      // Create interaction_log record
      await supabase.from("interaction_logs").insert({
        contact_id: active.contact_id,
        content: text,
        sender_type: "counselor"
      });
      
      // In a real implementation, you would also trigger a WhatsApp API call here
      // to actually send the message to the prospect.
    } catch (err) {
      console.error("Failed to save takeover message", err);
    }
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
              My Chats
            </button>
            <button
              className="text-xs py-1.5 rounded bg-white text-gray-900 shadow-sm border border-gray-200"
            >
              Team Overview ({chats.length})
            </button>
          </div>
        </div>
        <div className="px-3 py-3 border-b border-gray-200 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search" 
              className="pl-9 h-8 bg-gray-50 border-gray-200 text-xs" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-500">{error}</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {searchQuery ? "No matching contacts found." : "No team conversations yet."}
            </div>
          ) : (
            filteredChats.map((c) => (
              <ChatRow
                key={c.id}
                chat={c}
                active={c.id === activeId}
                onSelect={() => setActiveId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      {active ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50/40">
          <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm shrink-0">
                {active.student_initials}
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-sm text-gray-900 font-semibold truncate">{active.student_name}</div>
                <div className="text-xs text-gray-500 truncate">{active.phone_number || "Unknown Number"}</div>
              </div>
              {active.ambassador && (
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
              )}
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
            {loadingMessages ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Eye className="w-10 h-10 mb-3" />
                <p className="text-sm text-gray-500">No messages logged for this contact</p>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble 
                  key={m.id} 
                  msg={m} 
                  ambassadorName={active.ambassador?.name} 
                />
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
                  placeholder={active.ambassador ? `Send a private note to ${active.ambassador.name.split(" ")[0]} regarding this chat...` : "Send a private note..."}
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
                  placeholder={active.ambassador ? `Type a message — this will be sent to the prospect, replacing ${active.ambassador.name.split(" ")[0]} as the responder.` : "Type a message..."}
                  className="bg-white border-gray-200 text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {active.ambassador ? `${active.ambassador.name.split(" ")[0]} will be notified that you have taken over the conversation.` : "You are sending a message to this prospect directly."}
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
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/40 text-gray-400">
          <p className="text-sm">Select a conversation to view details</p>
        </div>
      )}
    </div>
  );
}
