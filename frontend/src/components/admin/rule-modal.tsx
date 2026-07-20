"use client";

import { useEffect, useState } from "react";
import { X, Loader2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Intent } from "@/types/roles";

const INTENT_OPTIONS: Intent[] = [
  "Fees",
  "Campus Life",
  "Visa & Immigration",
  "Courses",
  "Housing",
  "Booking",
  "Escalated",
  "General",
];

export type Handler = "AI Bot" | "Human Ambassador";

export type RoutingRule = {
  id: string;
  keyword: string;
  intent: Intent;
  handler: Handler;
  active: boolean;
};

interface RuleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  rule: RoutingRule | null; // null = create mode
}

export function RuleModal({ open, onClose, onSaved, rule }: RuleModalProps) {
  const [keyword, setKeyword] = useState("");
  const [intent, setIntent] = useState<Intent>("General");
  const [handler, setHandler] = useState<Handler>("AI Bot");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKeyword(rule?.keyword ?? "");
      setIntent(rule?.intent ?? "General");
      setHandler(rule?.handler ?? "AI Bot");
      setActive(rule?.active ?? true);
      setError(null);
    }
  }, [open, rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError("Please enter a keyword trigger.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(rule ? `/api/routing-rules/${rule.id}` : "/api/routing-rules", {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), intent, handler, active }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save rule.");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {rule ? "Edit Routing Rule" : "New Routing Rule"}
              </h2>
              <p className="text-xs text-gray-500">Map a keyword trigger to an intent and handler</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rule-keyword" className="text-xs text-gray-600">
              Keyword Trigger <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rule-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. late payment"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Mapped Intent</Label>
              <Select value={intent} onValueChange={(v) => setIntent(v as Intent)} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENT_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Assigned Handler</Label>
              <Select value={handler} onValueChange={(v) => setHandler(v as Handler)} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI Bot">AI Bot</SelectItem>
                  <SelectItem value="Human Ambassador">Human Ambassador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              disabled={loading}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                active ? "bg-blue-700" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  active ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <span className="text-sm text-gray-700">Rule active</span>
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="border-gray-200">
            Cancel
          </Button>
          <Button type="submit" size="sm" onClick={handleSubmit} disabled={loading} className="bg-blue-700 hover:bg-blue-800 text-white">
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : rule ? (
              "Save Changes"
            ) : (
              "Add Rule"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
