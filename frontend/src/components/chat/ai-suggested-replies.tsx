import { Sparkles, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = {
  tone: "Friendly" | "Formal" | "Concise";
  toneClass: string;
  text: string;
};

const suggestions: Suggestion[] = [
  {
    tone: "Friendly",
    toneClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text:
      "Hi! I'd be happy to help with that. The tuition deadline for Fall is August 15, and we do have flexible installment plans available if you need them. Let me know if you would like to connect with a student ambassador to go over the steps!",
  },
  {
    tone: "Formal",
    toneClass: "bg-blue-50 text-blue-700 border-blue-200",
    text:
      "Dear student, thank you for contacting admissions. Please note that the official tuition payment deadline for the Fall semester is scheduled for August 15, 2026. Detailed information regarding installment programs is attached for your review. Please let us know if you require ambassador assistance.",
  },
  {
    tone: "Concise",
    toneClass: "bg-gray-100 text-gray-700 border-gray-200",
    text:
      "Tuition for Fall is due August 15. Installment options are available (see document). I can connect you with an ambassador if you want to walk through the details.",
  },
];

function PopupContents({
  onClose,
  onUseReply,
  onEditReply,
  onRegenerate,
}: {
  onClose: () => void;
  onUseReply: (text: string) => void;
  onEditReply: (text: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <span className="text-sm font-semibold text-gray-900">Suggested Replies</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        {suggestions.map((s) => (
          <div
            key={s.tone}
            className="border border-gray-100 rounded-lg p-3 bg-[#fafafa] space-y-2.5"
          >
            <div>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium",
                  s.toneClass,
                )}
              >
                {s.tone}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onUseReply(s.text)}
                className="flex-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md px-3 py-1.5 transition-colors"
              >
                Use this reply
              </button>
              <button
                onClick={() => onEditReply(s.text)}
                className="flex-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-1.5 transition-colors"
              >
                Edit before sending
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onRegenerate}
          className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md py-2 text-xs font-semibold hover:bg-blue-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate suggestions
        </button>
      </div>
    </>
  );
}

export function AISuggestedRepliesDesktop({
  open,
  onClose,
  onUseReply,
  onEditReply,
  onRegenerate,
}: {
  open: boolean;
  onClose: () => void;
  onUseReply: (text: string) => void;
  onEditReply: (text: string) => void;
  onRegenerate: () => void;
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
        onEditReply={onEditReply}
        onRegenerate={onRegenerate}
      />
    </div>
  );
}
