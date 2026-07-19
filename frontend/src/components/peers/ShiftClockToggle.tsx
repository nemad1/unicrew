"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Self-service clock-in/out control for ambassadors, backing the
// "Hours Clocked" performance stat (writes to ambassador_shifts via
// /api/ambassador/shift, gated to the caller's own rows by RLS).
export function ShiftClockToggle({ collapsed }: { collapsed: boolean }) {
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ambassador/shift")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setClockedIn(Boolean(data.activeShift));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/ambassador/shift", { method: "POST" });
      const data = await res.json();
      if (res.ok) setClockedIn(Boolean(data.clockedIn));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      disabled={submitting}
      title={clockedIn ? "Clock out" : "Clock in"}
      className={cn(
        "rounded-lg text-sm transition-colors flex items-center gap-2 border",
        collapsed ? "w-10 h-10 mx-auto justify-center" : "w-full px-3 py-2 mb-2",
        clockedIn
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
        submitting && "opacity-60"
      )}
    >
      {submitting ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      {!collapsed && <span>{clockedIn ? "On shift — Clock out" : "Clock in"}</span>}
    </button>
  );
}
