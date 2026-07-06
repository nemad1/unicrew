import { useEffect, useState } from "react";
import { Search, MessageSquareDashed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { intentStyles } from "@/types/roles";
import type { Conversation } from "@/types/messages";

export function ChatList({
  activeId,
  conversations,
  onSelect,
  onOpen,
  header,
}: {
  activeId: string;
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
  header?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-[360px] shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      {header}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-gray-900 mb-3">Unified Inbox</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search conversations" className="pl-9 bg-gray-50 border-gray-200" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100 flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 text-gray-400 h-full">
            <MessageSquareDashed className="w-10 h-10 mb-3" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs mt-1">New student messages will appear here.</p>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              onDoubleClick={() => onOpen?.(c.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-gray-100 flex gap-3 transition-colors",
                activeId === c.id ? "bg-blue-50/60" : "hover:bg-gray-50",
              )}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold">
                  {c.student_initials}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
                    c.channel === "WhatsApp" ? "bg-green-500" : "bg-pink-500",
                  )}
                  title={c.channel}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-900 font-semibold truncate">{c.student_name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{c.last_message_at}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.last_message_preview}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                      intentStyles[c.intent],
                    )}
                  >
                    {c.intent}
                  </span>
                  {c.unread_count > 0 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-xs">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
