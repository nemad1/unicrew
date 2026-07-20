"use client";

import { useCallback, useEffect, useState } from "react";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export type PolicySuggestion = {
  id: string;
  submittedBy: string;
  rule: string;
  proposedChange: string;
  reason: string;
  submittedAt: number; // epoch ms
  status: SuggestionStatus;
  reviewNote: string | null;
};

type RawSuggestion = {
  id: string;
  rule: string;
  proposed_change: string;
  reason: string;
  status: SuggestionStatus;
  review_note: string | null;
  created_at: string;
  submitted_by_user: { full_name: string } | null;
};

function mapSuggestion(raw: RawSuggestion): PolicySuggestion {
  return {
    id: raw.id,
    submittedBy: raw.submitted_by_user?.full_name ?? "Unknown",
    rule: raw.rule,
    proposedChange: raw.proposed_change,
    reason: raw.reason,
    submittedAt: new Date(raw.created_at).getTime(),
    status: raw.status,
    reviewNote: raw.review_note,
  };
}

// Fetches policy suggestions from the backend (admins see all, everyone
// else sees only their own — enforced server-side in the API route).
export function useAdminStore() {
  const [suggestions, setSuggestions] = useState<PolicySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/policy-suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.suggestions ?? []).map(mapSuggestion));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { suggestions, loading, refresh };
}

export async function addSuggestion(input: {
  rule: string;
  proposedChange: string;
  reason: string;
}) {
  const res = await fetch("/api/policy-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to submit suggestion");
  }
}

export async function updateSuggestionStatus(
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string
) {
  const res = await fetch(`/api/policy-suggestions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewNote }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update suggestion");
  }
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
