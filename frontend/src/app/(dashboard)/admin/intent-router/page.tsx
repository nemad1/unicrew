"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAdminStore,
  updateSuggestionStatus,
  formatRelativeTime,
  type PolicySuggestion,
} from "@/lib/admin-store";
import { intentStyles, type Intent } from "@/types/roles";

type Handler = "AI Bot" | "Human Ambassador";

type Rule = {
  id: string;
  keyword: string;
  intent: Intent;
  handler: Handler;
  active: boolean;
};

const initialRules: Rule[] = [
  { id: "r1", keyword: "fees",           intent: "Fees",                handler: "AI Bot",           active: true  },
  { id: "r2", keyword: "scholarships",   intent: "Fees",                handler: "AI Bot",           active: true  },
  { id: "r3", keyword: "visa",           intent: "Visa & Immigration",  handler: "Human Ambassador", active: true  },
  { id: "r4", keyword: "hostel",         intent: "Housing",             handler: "Human Ambassador", active: true  },
  { id: "r5", keyword: "modules",        intent: "Courses",             handler: "AI Bot",           active: false },
  { id: "r6", keyword: "campus tour",    intent: "Campus Life",         handler: "Human Ambassador", active: true  },
];

function HandlerBadge({ handler }: { handler: Handler }) {
  const isAI = handler === "AI Bot";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border",
        isAI
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      )}
    >
      {handler}
    </span>
  );
}

function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs border", intentStyles[intent])}>
      {intent}
    </span>
  );
}

function SuggestionCard({ s }: { s: PolicySuggestion }) {
  const [reviewNote, setReviewNote] = useState<string | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {s.submittedBy.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-900 font-medium leading-tight">{s.submittedBy}</p>
            <p className="text-[11px] text-gray-400">Submitted {formatRelativeTime(s.submittedAt)}</p>
          </div>
        </div>
        {s.status !== "pending" && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs border shrink-0",
              s.status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200",
            )}
          >
            {s.status === "approved" ? "Approved" : "Rejected"}
          </span>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-md p-3 space-y-1.5">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Rule: </span>
          {s.rule}
        </p>
        <p className="text-sm text-gray-900 leading-relaxed">
          <span className="font-semibold">Counselor {s.submittedBy.split(" ")[0]} requested: </span>
          {s.proposedChange}
        </p>
        <p className="text-xs text-gray-600 italic leading-relaxed">
          Reason: {s.reason}
        </p>
      </div>

      {reviewNote !== null && (
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={2}
          placeholder="Review note for the counselor..."
          className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400 resize-none bg-white"
        />
      )}

      {s.status === "pending" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateSuggestionStatus(s.id, "approved")}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Check className="w-3 h-3" />
            Approve Request
          </button>
          <button
            onClick={() => updateSuggestionStatus(s.id, "rejected")}
            className="inline-flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <X className="w-3 h-3" />
            Reject Request
          </button>
          <button
            onClick={() => setReviewNote((n) => (n === null ? "" : null))}
            className="text-xs text-blue-700 hover:underline ml-auto"
          >
            {reviewNote === null ? "Add Review Note" : "Hide Review Note"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AIIntentRouterAdminPage() {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const suggestions = useAdminStore();

  const toggleRule = (id: string) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  const pending = suggestions.filter((s) => s.status === "pending");
  const resolved = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Intent Router</h1>
          <p className="text-xs text-gray-500">
            Manage keyword triggers and review counselor policy change requests.
          </p>
        </div>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white" size="sm">
          + Add Rule
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Rules table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Routing Rules</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Keyword Trigger</th>
                  <th className="px-5 py-3 font-medium">Mapped Intent</th>
                  <th className="px-5 py-3 font-medium">Assigned Handler</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40">
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-800">
                        {rule.keyword}
                      </code>
                    </td>
                    <td className="px-5 py-3"><IntentBadge intent={rule.intent} /></td>
                    <td className="px-5 py-3"><HandlerBadge handler={rule.handler} /></td>
                    <td className="px-5 py-3">
                      <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending suggestions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Counselor Policy Change Requests
            </h2>
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
              {pending.length}
            </span>
          </div>

          {pending.length === 0 && resolved.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center text-center">
              <MessageSquare className="w-7 h-7 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">No counselor change requests yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Suggestions submitted by counselors will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((s) => <SuggestionCard key={s.id} s={s} />)}
              {resolved.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wider pt-2">Recently resolved</p>
                  {resolved.map((s) => <SuggestionCard key={s.id} s={s} />)}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
