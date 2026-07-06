"use client";

import { useState } from "react";
import { ChatList } from "@/components/chat/chat-list";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { SupervisorInbox } from "@/components/chat/supervisor-inbox";
import { ProspectProfile } from "@/components/prospect-profile";
import { useAuth } from "@/contexts/auth-context";
import { conversations as MOCK_CONVERSATIONS } from "@/lib/mock-data/conversations";
import { getMessagesForConversation } from "@/lib/mock-data/messages";
import { MessageSquareDashed } from "lucide-react";

type InboxMode = "personal" | "team";

export default function InboxPage() {
  const { role } = useAuth();

  // In a real app, this would filter by assignee or role permissions
  // For the mockup, Counselor sees all, Ambassador sees a subset
  const visibleConversations = role === "ambassador"
    ? MOCK_CONVERSATIONS.filter(c => c.intent === "Campus Life" || c.intent === "Courses")
    : MOCK_CONVERSATIONS;

  const [activeId, setActiveId] = useState<string>(visibleConversations[0]?.id || "");
  const [inboxMode, setInboxMode] = useState<InboxMode>("team");

  const activeConversation = visibleConversations.find(c => c.id === activeId);
  const activeMessages = activeConversation
    ? getMessagesForConversation(
        activeConversation.id,
        activeConversation.student_name,
        activeConversation.intent,
        activeConversation.last_message_at,
        activeConversation.last_message_preview
      )
    : [];

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
        {showProfile ? (
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
