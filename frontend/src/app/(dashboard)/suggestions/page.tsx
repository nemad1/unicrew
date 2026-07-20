"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminStore, formatRelativeTime } from "@/lib/admin-store";
import { SuggestRuleChange } from "@/components/suggest-rule-change";

export default function SuggestionsPage() {
  const { suggestions, loading, refresh } = useAdminStore();

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suggest a Rule Change</h1>
          <p className="text-xs text-gray-500">
            Propose routing/policy changes for the admin to review, and track their decisions.
          </p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-6 items-start">
        <SuggestRuleChange onSubmitted={refresh} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Your Submissions</h2>

          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center text-center">
              <MessageSquare className="w-7 h-7 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">No submissions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Suggestions you submit will appear here with their review status.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">Rule: </span>
                        {s.rule}
                      </p>
                      <p className="text-[11px] text-gray-400">Submitted {formatRelativeTime(s.submittedAt)}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border shrink-0",
                        s.status === "pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : s.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200",
                      )}
                    >
                      {s.status === "pending" ? "Pending" : s.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 leading-relaxed">{s.proposedChange}</p>
                  {s.reviewNote && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-md p-2.5">
                      <p className="text-xs text-blue-900">
                        <span className="font-semibold">Admin note: </span>
                        {s.reviewNote}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
