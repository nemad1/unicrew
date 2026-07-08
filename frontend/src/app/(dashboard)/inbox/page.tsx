"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatList } from "@/components/chat/chat-list";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { SupervisorInbox } from "@/components/chat/supervisor-inbox";
import { WhatsappQR } from "@/components/chat/whatsapp-qr";
import { ProspectProfile } from "@/components/prospect-profile";
import { useAuth } from "@/contexts/auth-context";
// Removed mock messages

import { MessageSquareDashed } from "lucide-react";

type InboxMode = "personal" | "team";

export default function InboxPage() {
  const { role } = useAuth();

  const [activeId, setActiveId] = useState<string>("");
  const [inboxMode, setInboxMode] = useState<InboxMode>("team");
  const [whatsappStatus, setWhatsappStatus] = useState<"DISCONNECTED" | "CONNECTED">("DISCONNECTED");
  const [sessionId, setSessionId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);

  // Setup Socket.IO for live messages
  useEffect(() => {
    if (whatsappStatus === "CONNECTED" && sessionId) {
      import("socket.io-client").then(({ io }) => {
        const socketUrl = process.env.NEXT_PUBLIC_OPENWA_API_URL
          ? `${process.env.NEXT_PUBLIC_OPENWA_API_URL}/events`
          : "https://openwa-production-7315.up.railway.app/events";

        const socket = io(socketUrl, {
          extraHeaders: {
            "X-API-Key": process.env.NEXT_PUBLIC_OPENWA_API_KEY || ""
          }
        });

        socket.on("connect", () => {
          console.log("Socket connected, emitting subscribe for sessionId:", sessionId);
          socket.emit("subscribe", { sessionId });
        });

        socket.on("message.received", (msg: any) => {
          console.log("New live message received:", msg);
          const msgChatId = msg.chatId || (msg.from || "");

          if (activeId && msgChatId === activeId) {
             setActiveMessages(prev => {
                // Prevent duplicates if already added
                if (prev.some(p => p.id === msg.id || p.id === msg.waMessageId)) return prev;

                return [...prev, {
                  id: msg.id || msg.waMessageId || Date.now().toString(),
                  content: msg.body || msg.content || "",
                  sender: msg.fromMe || msg.direction === 'outgoing' ? "ambassador" : "student",
                  timestamp: msg.timestamp
                    ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isAutomated: false
                }];
             });
          }

          // Update conversation list preview
          setConversations(prev => {
            const copy = [...prev];
            const idx = copy.findIndex(c => c.id === msgChatId);
            if (idx > -1) {
              const updatedChat = { ...copy[idx] };
              updatedChat.last_message_preview = msg.body || msg.content || "";
              updatedChat.last_message_at = msg.timestamp
                ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              if (activeId !== msgChatId) {
                updatedChat.unread_count = (updatedChat.unread_count || 0) + 1;
              }

              copy.splice(idx, 1);
              copy.unshift(updatedChat);
            } else {
              // If it's a new chat, we add it to the top
              copy.unshift({
                id: msgChatId,
                student_name: msgChatId.split('@')[0],
                student_initials: msgChatId.substring(0, 2).toUpperCase(),
                channel: "WhatsApp",
                intent: "General",
                unread_count: 1,
                last_message_preview: msg.body || msg.content || "",
                last_message_at: msg.timestamp
                  ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
            return copy;
          });
        });

        return () => {
          socket.disconnect();
        };
      });
    }
  }, [whatsappStatus, sessionId, activeId]);

  useEffect(() => {
    if (whatsappStatus === "CONNECTED" && sessionId) {
      const fetchConversations = async () => {
        try {
          const res = await fetch(`/api/whatsapp/chats?sessionId=${sessionId}`);
          const data = await res.json();

          if (Array.isArray(data)) {
            const sortedData = [...data].sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

            const mapped = sortedData.map((chat: any) => ({
              id: chat.id,
              student_name: chat.name || chat.id.split('@')[0],
              student_initials: (chat.name || chat.id).substring(0, 2).toUpperCase(),
              channel: "WhatsApp",
              intent: "General",
              unread_count: chat.unreadCount || 0,
              last_message_preview: chat.lastMessage || "",
              last_message_at: chat.timestamp
                ? new Date(chat.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ""
            }));

            setConversations(mapped);
            if (mapped.length > 0 && !activeId) {
              setActiveId(mapped[0].id);
          }
        } catch (err) {
          console.error("Error fetching conversations:", err);
        }
      };

      fetchConversations();
    }
  }, [whatsappStatus, activeId, sessionId]);

  useEffect(() => {
    if (activeId && whatsappStatus === "CONNECTED" && sessionId) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/whatsapp/messages?sessionId=${sessionId}&chatId=${encodeURIComponent(activeId)}&limit=100`);
          const data = await res.json();

          if (data && Array.isArray(data.messages)) {
            const sortedMessages = [...data.messages].sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));

            const mapped = sortedMessages.map((msg: any) => ({
              id: msg.id || msg.waMessageId,
              content: msg.body,
              sender: msg.direction === 'outgoing' ? 'ambassador' : 'student',
              timestamp: msg.timestamp
                 ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                 : "",
              isAutomated: false
            }));

            setActiveMessages(mapped);
          } else {
             setActiveMessages([]);
          }
        } catch (err) {
          console.error("Error fetching messages:", err);
          setActiveMessages([]);
        }
      };
      fetchMessages();
    } else {
      setActiveMessages([]);
    }
  }, [activeId, whatsappStatus, sessionId]);

  // For the mockup, Ambassador sees a subset. Ensure "General" is included so new WhatsApp chats are visible!
  const visibleConversations = role === "ambassador"
    ? conversations.filter(c => c.intent === "Campus Life" || c.intent === "Courses" || c.intent === "General")
    : conversations;

  const activeConversation = visibleConversations.find(c => c.id === activeId);

  const [showProfile, setShowProfile] = useState(false);

  // Team overview (Supervisor Inbox) — only for counselor role
  if (role === "counselor" && inboxMode === "team") {
    return (
      <div className="flex-1 flex h-full overflow-hidden">
        {showProfile ? (
          <ProspectProfile
            onBack={() => setShowProfile(false)}
            backLabel="Back to Team Overview"
          />
        ) : (
          <SupervisorInbox
            onSwitchToPersonal={() => setInboxMode("personal")}
            onViewProfile={() => setShowProfile(true)}
          />
        )}
      </div>
    );
  }

  // Personal inbox header with mode toggle (for counselor role)
  const inboxHeader = role === "counselor" ? (
    <div className="p-3 border-b border-gray-200">
      <div className="grid grid-cols-2 bg-gray-100 rounded-md p-1">
        <button
          className="text-xs py-1.5 rounded bg-white text-gray-900 shadow-sm border border-gray-200"
        >
          My Chats ({visibleConversations.length})
        </button>
        <button
          onClick={() => setInboxMode("team")}
          className="text-xs py-1.5 rounded text-gray-600 hover:text-gray-900 transition-colors"
        >
          Team Overview (12)
        </button>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left pane: Chat List */}
      <ChatList
        activeId={activeId}
        conversations={visibleConversations}
        onSelect={setActiveId}
        header={inboxHeader}
      />

      {/* Right pane: Active Workspace */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {whatsappStatus !== "CONNECTED" ? (
          <WhatsappQR onConnected={(sid?: string) => {
            if (sid) setSessionId(sid);
            setWhatsappStatus("CONNECTED");
          }} />
        ) : showProfile ? (
          <ProspectProfile
            onBack={() => setShowProfile(false)}
            backLabel="Back to Inbox"
            readOnly={role === "ambassador"}
          />
        ) : activeConversation ? (
          <ChatWorkspace
            key={activeConversation.id} // force remount on switch
            role={role}
            conversation={activeConversation}
            initialMessages={activeMessages}
            onViewProfile={() => setShowProfile(true)}
            onOpenProfile={() => setShowProfile(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/40">
            <MessageSquareDashed className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No conversation selected</p>
            <p className="text-sm mt-1">Select a chat from the list to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
