"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Award, Clock3, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type AmbassadorStats, type ActivityDay } from "./types";

function useAmbassadorStats(userId: string) {
  const [stats, setStats] = useState<AmbassadorStats | null>(null);
  const [trend, setTrend] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ambassadors/${userId}/stats`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load performance stats");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats ?? null);
        setTrend(data.trend ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { stats, trend, loading, error };
}

function ActivityTrendChart({ trend }: { trend: ActivityDay[] }) {
  if (!trend || trend.length === 0) return null;
  const max = Math.max(1, ...trend.map((d) => d.message_count));

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        7-Day Activity Trend
      </h4>
      <div className="flex items-end justify-between gap-1.5 h-16">
        {trend.map((d) => {
          const label = new Date(`${d.day}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "narrow",
          });
          const heightPct = Math.max(6, Math.round((d.message_count / max) * 100));
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-blue-500/70"
                style={{ height: `${heightPct}%` }}
                title={`${d.message_count} messages`}
              />
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceStatsPanel({
  userId,
  variant,
}: {
  userId: string;
  variant: "card" | "modal";
}) {
  const { stats, trend, loading, error } = useAmbassadorStats(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">Loading performance stats...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        {error || "No performance stats available."}
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-blue-700 mb-1">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.total_consults ?? 0}</p>
          <p className="text-[11px] text-gray-500">Total Consults</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
            <Clock3 className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatDuration(stats.avg_response_seconds)}
          </p>
          <p className="text-[11px] text-gray-500">Avg Response</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1">
            <Star className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.rating ?? "—"}</p>
          <p className="text-[11px] text-gray-500">Rating</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-sm font-bold text-gray-900">{stats.total_consults ?? 0}</p>
          <p className="text-[11px] text-gray-500">Students Chatted</p>
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-600">{stats.deals_closed ?? 0}</p>
          <p className="text-[11px] text-gray-500">Deals Closed</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {formatDuration(stats.avg_response_seconds)}
          </p>
          <p className="text-[11px] text-gray-500">Avg Response</p>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <p className="text-sm font-bold text-gray-900">
            {stats.hours_clocked !== null ? `${stats.hours_clocked.toFixed(1)}h` : "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Missed Chats: <span className="font-medium text-gray-700">{stats.missed_chats ?? 0}</span>
      </p>
      <ActivityTrendChart trend={trend} />
    </div>
  );
}
