"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ChatList } from "@/components/chat/chat-list";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { WhatsappQR } from "@/components/chat/whatsapp-qr";
import { ProspectProfile } from "@/components/prospect-profile";
import { SupervisorInbox } from "@/components/chat/supervisor-inbox";
import { MessageSquareDashed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

type InboxMode = "personal" | "team";

function normalizePhoneNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

function extractMessageContent(msg: any): string {
  let text = msg.body || msg.content || msg.text || msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!text) {
    if (msg.message?.imageMessage) text = msg.message.imageMessage.caption || '[Image]';
    else if (msg.message?.videoMessage) text = msg.message.videoMessage.caption || '[Video]';
    else if (msg.message?.audioMessage) text = '[Voice/Audio]';
    else if (msg.message?.documentMessage) text = msg.message.documentMessage.fileName || '[Document]';
    else if (msg.type) text = msg.caption || `[${msg.type}]`;
  }
  return text || "";
}

export default function InboxPage() {
  const { role } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const paramActiveId = searchParams.get("activeId");

  const [activeId, setActiveId] = useState<string>(paramActiveId || "");
  const [inboxMode, setInboxMode] = useState<InboxMode>(paramActiveId ? "personal" : "personal");
  const [whatsappStatus, setWhatsappStatus] = useState<"DISCONNECTED" | "CONNECTED">("DISCONNECTED");
  const [sessionId, setSessionId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [crmContacts, setCrmContacts] = useState<Record<string, string>>({});

  const handleWhatsappConnected = useCallback((sid?: string) => {
    if (sid) setSessionId(sid);
    setWhatsappStatus("CONNECTED");
  }, []);

  const crmContactsRef = useRef<Record<string, string>>({});

  // Sync the ref with state to allow the socket closure to read the latest map
  useEffect(() => {
    crmContactsRef.current = crmContacts;
  }, [crmContacts]);

  useEffect(() => {
    const fetchCrmContacts = async () => {
      try {
        const res = await fetch('/api/contacts/labels');
        if (!res.ok) throw new Error('Failed to fetch CRM contacts');
        
        const data = await res.json();
        const mapping: Record<string, string> = {};
        
        if (Array.isArray(data)) {
          data.forEach(c => {
            if (c.phone_number && c.name) {
              mapping[normalizePhoneNumber(c.phone_number)] = c.name;
            }
          });
        }
        setCrmContacts(mapping);
      } catch (err) {
        console.error("Error fetching CRM contacts:", err);
      }
    };
    fetchCrmContacts();
  }, []);

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
          const rawPhone = msgChatId.split('@')[0];
          const resolvedName = crmContactsRef.current[rawPhone] || msg.sender?.pushname || msg.sender?.name || rawPhone;

          if (activeId && msgChatId === activeId) {
             setActiveMessages(prev => {
                // Prevent duplicates if already added
                if (prev.some(p => p.id === msg.id || p.id === msg.waMessageId)) return prev;

                return [...prev, {
                  id: msg.id || msg.waMessageId || Date.now().toString(),
                  content: extractMessageContent(msg),
                  sender_type: msg.fromMe || msg.direction === 'outgoing' ? "ambassador" : "student",
                  sent_at: msg.timestamp
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
              updatedChat.last_message_preview = extractMessageContent(msg);
              updatedChat.last_message_at = msg.timestamp
                ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              updatedChat.student_name = resolvedName;
              updatedChat.student_initials = resolvedName.substring(0, 2).toUpperCase();

              if (activeId !== msgChatId) {
                updatedChat.unread_count = (updatedChat.unread_count || 0) + 1;
              }

              copy.splice(idx, 1);
              copy.unshift(updatedChat);
            } else {
              // If it's a new chat, we add it to the top
              copy.unshift({
                id: msgChatId,
                student_name: resolvedName,
                student_initials: resolvedName.substring(0, 2).toUpperCase(),
                channel: "WhatsApp",
                intent: "General",
                unread_count: 1,
                last_message_preview: extractMessageContent(msg),
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
  }, [whatsappStatus, sessionId, activeId]); // removed crmContacts from dependency

  useEffect(() => {
    if (whatsappStatus === "CONNECTED" && sessionId) {
      const fetchConversations = async () => {
        try {
          const res = await fetch(`/api/whatsapp/chats?sessionId=${sessionId}`);
          const data = await res.json();

          if (Array.isArray(data)) {
            const sortedData = [...data].sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

            const mapped = sortedData.map((chat: any) => {
              const rawPhone = chat.id.split('@')[0];
              const resolvedName = crmContactsRef.current[rawPhone] || chat.name || chat.pushname || rawPhone;
              return {
                id: chat.id,
                student_name: resolvedName,
                student_initials: resolvedName.substring(0, 2).toUpperCase(),
                channel: "WhatsApp",
                intent: "General",
                unread_count: chat.unreadCount || 0,
                last_message_preview: chat.lastMessage || "",
                last_message_at: chat.timestamp
                  ? new Date(chat.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ""
              };
            });

            setConversations(mapped);
            if (mapped.length > 0 && !activeId) {
              setActiveId(mapped[0].id);
            }
          }
        } catch (err) {
          console.error("Error fetching conversations:", err);
        }
      };

      fetchConversations();
    }
  }, [whatsappStatus, activeId, sessionId]); // removed crmContacts from dependency

  // Effect to update existing conversations locally when crmContacts changes (without refetching)
  useEffect(() => {
    setConversations(prev => prev.map(chat => {
      const rawPhone = chat.id.split('@')[0];
      const newLabel = crmContacts[rawPhone];
      const resolvedName = newLabel || chat.name || chat.pushname || rawPhone;

      if (chat.student_name !== resolvedName) {
        return {
          ...chat,
          student_name: resolvedName,
          student_initials: resolvedName.substring(0, 2).toUpperCase()
        };
      }
      return chat;
    }));
  }, [crmContacts]);

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
              content: extractMessageContent(msg),
              sender_type: msg.direction === 'outgoing' ? 'ambassador' : 'student',
              sent_at: msg.timestamp
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

  const visibleConversations = conversations;

  const activeConversation = visibleConversations.find(c => c.id === activeId);

  const [showProfile, setShowProfile] = useState(false);

  if ((role === "counselor" || role === "admin") && inboxMode === "team") {
    return (
      <div className="flex-1 flex h-full overflow-hidden">
        {showProfile ? (
          <ProspectProfile
            onBack={() => setShowProfile(false)}
            backLabel="Back to Team Overview"
            rawPhone={activeId ? activeId.split('@')[0] : undefined}
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

  const inboxHeader = (role === "counselor" || role === "admin") ? (
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
      <ChatList
        activeId={activeId}
        conversations={visibleConversations}
        onSelect={setActiveId}
        header={inboxHeader}
      />

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {whatsappStatus !== "CONNECTED" ? (
          <WhatsappQR onConnected={handleWhatsappConnected} />
        ) : showProfile ? (
          <ProspectProfile
            onBack={() => setShowProfile(false)}
            backLabel="Back to Inbox"
            readOnly={role === "ambassador"}
            rawPhone={activeId ? activeId.split('@')[0] : undefined}
          />
        ) : activeConversation ? (
          <ChatWorkspace
            key={activeConversation.id}
            role={role}
            conversation={activeConversation}
            initialMessages={activeMessages}
            onViewProfile={() => setShowProfile(true)}
            onOpenProfile={() => setShowProfile(true)}
            onContactUpdated={(rawPhone, newLabel) => {
              setCrmContacts(prev => ({ ...prev, [rawPhone]: newLabel }));
            }}
            onSendMessage={async (text) => {
              const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  chatId: activeConversation.id,
                  text
                })
              });
              if (!res.ok) {
                throw new Error("Failed to send message");
              }
            }}
            onSendMedia={async (fileBase64, fileName, caption) => {
              const res = await fetch('/api/whatsapp/send-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  chatId: activeConversation.id,
                  fileBase64,
                  fileName,
                  caption
                })
              });
              if (!res.ok) {
                throw new Error("Failed to send media");
              }
            }}
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
