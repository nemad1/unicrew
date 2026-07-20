"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, GraduationCap, GitBranch, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { cn } from "@/lib/utils";

type StatCard = {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  helper: string;
};

type TopConcern = {
  label: string;
  student_count: number;
  avg_confidence: number;
};

function TopConcernsWidget() {
  const [concerns, setConcerns] = useState<TopConcern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/signals/top?type=concern&days=7")
      .then((res) => res.json())
      .then((data) => setConcerns(Array.isArray(data.results) ? data.results : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(1, ...concerns.map((c) => c.student_count));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-gray-900">Top Concerns This Week</h2>
        </div>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Objections raised across all students, ranked by how many distinct students raised them.
      </p>
      {loading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : concerns.length === 0 ? (
        <p className="text-xs text-gray-400">No concerns recorded this week.</p>
      ) : (
        <div className="space-y-3">
          {concerns.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 font-medium">{c.label}</span>
                <span className="text-gray-400">
                  {c.student_count} student{c.student_count === 1 ? "" : "s"} · {Math.round(c.avg_confidence * 100)}% avg confidence
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${(c.student_count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { suggestions } = useAdminStore();
  const pending = suggestions.filter((s) => s.status === "pending").length;

  const stats: StatCard[] = [
    { icon: Users,         value: "4",  label: "Active Counselors",   helper: "1 inactive" },
    { icon: GraduationCap, value: "5",  label: "Active Ambassadors",  helper: "1 inactive" },
    { icon: GitBranch,     value: "6",  label: "Live Routing Rules",  helper: "1 disabled" },
    { icon: ShieldCheck,   value: String(pending), label: "Pending Policy Requests", helper: "Counselor submissions" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-500">Tenant-wide configuration and request review hub.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start justify-between"
              >
                <div>
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5">{s.helper}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-blue-700" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {[
            { href: "/admin/users",         title: "User Management",  description: "Add, deactivate, or remove counselors and ambassadors." },
            { href: "/admin/intent-router", title: "AI Intent Router", description: "Review counselor change requests, edit routing rules, and manage the AI knowledge base." },
            { href: "/admin/settings",      title: "System Settings",  description: "Branding, notifications, privacy, and integrations." },
          ].map((quick) => (
            <Link
              key={quick.href}
              href={quick.href}
              className={cn(
                "text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group block",
              )}
            >
              <p className="text-sm font-semibold text-gray-900">{quick.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{quick.description}</p>
              <p className="text-xs font-medium text-blue-700 mt-3 flex items-center gap-1 group-hover:text-blue-800">
                Open <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>

        <TopConcernsWidget />
      </div>
    </div>
  );
}
