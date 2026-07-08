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
            "X-API-Key": process.env.NEXT_PUBLIC_OPENWA_API_KEY || "owa_k1_b9e9c693136c64f58acc4b4bef545788a84867236c513ad84c9630be0f4e3c99"
          }
        });

        socket.on("connect", () => {
          console.log("Socket connected, emitting subscribe for sessionId:", sessionId);
          socket.emit("subscribe", { sessionId });
        });

        socket.on("message.received", (msg: any) => {
          console.log("New live message received:", msg);
          // Optional: Fetch messages again or manually update state
          // For simplicity, we just trigger a refetch of conversations
          // which the other useEffect handles automatically if we had a trigger
          // We can push to activeMessages if the contact_id matches
          // Since we don't know the exact contact_id without matching phone, 
          // a quick fix is to trigger a re-fetch of the messages for the active contact.
          if (activeId) {
             // In a real app we'd dispatch an event or use SWR.
             // We can just forcefully update state if we want:
             setActiveMessages(prev => [...prev, {
               id: msg.id || Date.now().toString(),
               content: msg.body || msg.content || "",
               sender: msg.fromMe ? "ambassador" : "student",
               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               isAutomated: false
             }]);
          }
        });

        return () => {
          socket.disconnect();
        };
      });
    }
  }, [whatsappStatus, sessionId, activeId]);

  useEffect(() => {
    if (whatsappStatus === "CONNECTED") {
      const fetchConversations = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("vw_inbox_conversations")
          .select("*")
          .order("last_message_at", { ascending: false });

        if (error) {
          console.error("Error fetching conversations:", error);
          return;
        }

        if (data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            student_name: row.student_name || "Unknown",
            student_initials: (row.student_name || "U").substring(0, 2).toUpperCase(),
            channel: row.channel || "WhatsApp",
            intent: row.intent || "General inquiry",
            unread_count: row.unread_count || 0,
            last_message_preview: row.last_message_preview || "",
            last_message_at: row.last_message_at 
              ? new Date(row.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : ""
          }));
          setConversations(mapped);
          if (mapped.length > 0 && !activeId) {
            setActiveId(mapped[0].id);
          }
        }
      };

      fetchConversations();
    }
  }, [whatsappStatus, activeId]);

  useEffect(() => {
    if (activeId && whatsappStatus === "CONNECTED") {
      const fetchMessages = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("interaction_logs")
          .select("*")
          .eq("contact_id", activeId)
          .order("created_at", { ascending: true }); // oldest to newest for chat view

        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }

        if (data) {
          const mapped = data.map((log: any) => ({
            id: log.id,
            content: log.content,
            sender: log.sender_type,
            timestamp: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAutomated: log.is_automated
          }));
          setActiveMessages(mapped);
        }
      };
      fetchMessages();
    } else {
      setActiveMessages([]);
    }
  }, [activeId, whatsappStatus]);

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
