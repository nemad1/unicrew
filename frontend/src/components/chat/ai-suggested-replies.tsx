import { useState } from "react";
import { Sparkles, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type Suggestion = {
  tone: string;
  toneClass?: string;
  text: string;
};

function getToneClass(tone: string) {
  const t = tone.toLowerCase();
  if (t === "friendly") return "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm shadow-emerald-100/50";
  if (t === "formal") return "bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm shadow-indigo-100/50";
  return "bg-slate-100 text-slate-700 border-slate-200 shadow-sm shadow-slate-100/50";
}

function PopupContents({
  onClose,
  onUseReply,
  onEditReply,
  onRegenerate,
  suggestions,
}: {
  onClose: () => void;
  onUseReply: (text: string) => void;
  onEditReply?: (text: string) => void;
  onRegenerate: () => void;
  suggestions: Suggestion[];
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">AI Draft Replies</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3.5 p-4 max-h-[400px] overflow-y-auto">
        {suggestions.map((s) => (
          <SuggestionCard 
            key={s.tone} 
            suggestion={s} 
            onUseReply={onUseReply} 
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
        <button
          onClick={onRegenerate}
          className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg py-2.5 text-xs font-semibold shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate drafts
        </button>
      </div>
    </>
  );
}

function SuggestionCard({ suggestion: s, onUseReply }: { suggestion: Suggestion; onUseReply: (text: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(s.text);

  return (
    <div className="border border-gray-200/60 rounded-xl p-3.5 bg-white shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
      <div>
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase",
            s.toneClass || getToneClass(s.tone),
          )}
        >
          {s.tone}
        </span>
      </div>
      
      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full text-[13px] text-gray-800 leading-relaxed border border-blue-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50/30 resize-none min-h-[90px] shadow-inner"
          autoFocus
        />
      ) : (
        <p className="text-[13px] text-gray-700 leading-relaxed min-h-[40px] whitespace-pre-wrap">{text}</p>
      )}

      <div className="flex items-center gap-2 pt-1.5">
        <button
          onClick={() => onUseReply(text)}
          className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-600/20 rounded-lg px-3 py-2 transition-all active:scale-[0.98]"
        >
          Use this reply
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 rounded-lg px-3 py-2 transition-all active:scale-[0.98]"
        >
          {isEditing ? "Save edit" : "Edit draft"}
        </button>
      </div>
    </div>
  );
}

export function AISuggestedRepliesDesktop({
  open,
  onClose,
  onUseReply,
  onEditReply,
  onRegenerate,
  suggestions,
}: {
  open: boolean;
  onClose: () => void;
  onUseReply: (text: string) => void;
  onEditReply: (text: string) => void;
  onRegenerate: () => void;
  suggestions: Suggestion[];
}) {
  if (!open) return null;
  return (
    <div
      className="absolute left-0 bottom-full mb-2 w-[420px] bg-white rounded-xl border border-gray-200 z-30"
      style={{
        boxShadow:
          "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
      }}
      role="dialog"
      aria-label="Suggested replies"
    >
      <PopupContents
        onClose={onClose}
        onUseReply={onUseReply}
        onEditReply={onEditReply || (() => {})}
        onRegenerate={onRegenerate}
        suggestions={suggestions}
      />
    </div>
  );
}
