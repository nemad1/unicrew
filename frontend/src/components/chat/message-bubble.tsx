/**
 * MessageBubble — unified chat bubble component.
 *
 * Replaces 3 incompatible implementations from the Figma export:
 *   - ChatView.MessageBubble     (type-based: student|ai|staff|system)
 *   - ChatWorkspace.MessageBubble (from-based: in|out|system, automated?)
 *   - SupervisorInbox.MessageBubble (from-based: prospect|ambassador)
 *
 * Now uses the canonical Message type from @/types/messages.
 */
"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/messages";

/**
 * Determines if a message is "incoming" (left-aligned) or "outgoing" (right-aligned).
 * System messages are rendered as centered dividers.
 */
function isIncoming(msg: Message): boolean {
  return msg.sender_type === "student";
}

export function MessageBubble({ msg }: { msg: Message }) {
  // ── System divider ──────────────────────────────────────────────────────────
  if (msg.sender_type === "system") {
    return (
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500 shrink-0">{msg.content}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  const incoming = isIncoming(msg);

  return (
    <div className={cn("flex", incoming ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[70%] flex flex-col",
          incoming ? "items-start" : "items-end"
        )}
      >
        {/* AI auto-reply label */}
        {msg.is_automated && (
          <div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
            <Sparkles className="w-3 h-3 text-blue-600" />
            AI Auto-Reply
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed",
            incoming
              ? "bg-gray-100 text-gray-900 rounded-tl-none"
              : msg.is_automated
                ? "bg-blue-50 text-gray-900 border border-blue-200"
                : "bg-blue-700 text-white rounded-tr-none"
          )}
        >
          {msg.content}
        </div>

        {/* Timestamp */}
        {msg.sent_at && (
          <span className="text-xs text-gray-400 mt-1">{msg.sent_at}</span>
        )}
      </div>
    </div>
  );
}
