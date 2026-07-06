"use client";

import { useEffect, useState } from "react";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export type PolicySuggestion = {
  id: string;
  submittedBy: string;
  rule: string;
  proposedChange: string;
  reason: string;
  submittedAt: number; // epoch ms
  status: SuggestionStatus;
};

type Listener = () => void;
const listeners = new Set<Listener>();

let suggestions: PolicySuggestion[] = [
  {
    id: "seed-1",
    submittedBy: "Amelia Park",
    rule: "Fees & Tuition",
    proposedChange:
      "Route keywords 'late payment' directly to human supervisor (currently mapped to AI Draft).",
    reason: "Students using these keywords are usually in distress and need a human touch.",
    submittedAt: Date.now() - 1000 * 60 * 60 * 2, // 2h ago
    status: "pending",
  },
];

function notify() {
  listeners.forEach((l) => l());
}

export function addSuggestion(input: Omit<PolicySuggestion, "id" | "submittedAt" | "status">) {
  suggestions = [
    {
      ...input,
      id: `s-${Date.now()}`,
      submittedAt: Date.now(),
      status: "pending",
    },
    ...suggestions,
  ];
  notify();
}

export function updateSuggestionStatus(id: string, status: SuggestionStatus) {
  suggestions = suggestions.map((s) => (s.id === id ? { ...s, status } : s));
  notify();
}

export function getSuggestions(): PolicySuggestion[] {
  return suggestions;
}

// React hook — re-renders subscribers when the store changes.
export function useAdminStore() {
  const [snapshot, setSnapshot] = useState(suggestions);
  useEffect(() => {
    const listener = () => setSnapshot([...suggestions]);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return snapshot;
}

export function formatRelativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
