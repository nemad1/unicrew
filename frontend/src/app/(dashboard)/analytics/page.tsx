"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Users,
  MessageSquare,
  GraduationCap,
  Clock,
  FileCheck,
  Sparkles,
  UserPlus,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

// ─── Data model (from GET /api/analytics/overview) ─────────────────────────────

type Trend = { pct: number; dir: "up" | "down" } | null;

type Overview = {
  metrics: {
    totalStudents: { value: number; helper: string };
    openInquiries: { value: number; helper: string };
    enrolledInRange: { value: number; trend: Trend; helper: string };
    avgResponseTime: { value: number | null; display: string | null; trend: Trend; helper: string };
  };
  inquiryTrend: { date: string; count: number }[];
  enrollmentsByAmbassador: { name: string; deals: number }[];
  leaderboard: { rank: number; id: string; initials: string; name: string; deals: number; avgResponse: string | null }[];
  activityFeed: { type: string; action: string; meta: string; time: string }[];
};

const dateRangeOptions: { label: string; value: string }[] = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
];

const activityIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; color: string }> = {
  ai_note: { icon: Sparkles, bg: "bg-purple-50", color: "text-purple-600" },
  stage_move: { icon: FileCheck, bg: "bg-green-50", color: "text-green-600" },
  new_contact: { icon: UserPlus, bg: "bg-blue-50", color: "text-blue-600" },
};

// ─── CSV export ────────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(fields: unknown[]): string {
  return fields.map(csvEscape).join(",");
}

function trendText(trend: Trend, helper: string): string {
  if (!trend) return helper;
  return `${trend.dir === "up" ? "+" : "-"}${trend.pct}% ${helper}`;
}

function buildAnalyticsCsv(data: Overview, rangeLabel: string): string {
  const lines: string[] = [];

  lines.push(csvRow(["UniCrew Operations Dashboard Export"]));
  lines.push(csvRow(["Range", rangeLabel]));
  lines.push(csvRow(["Generated", new Date().toISOString()]));
  lines.push("");

  lines.push(csvRow(["Summary Metrics"]));
  lines.push(csvRow(["Metric", "Value", "Detail"]));
  lines.push(csvRow(["Total Students", data.metrics.totalStudents.value, data.metrics.totalStudents.helper]));
  lines.push(csvRow(["Open Inquiries", data.metrics.openInquiries.value, data.metrics.openInquiries.helper]));
  lines.push(csvRow([
    "Enrolled This Period",
    data.metrics.enrolledInRange.value,
    trendText(data.metrics.enrolledInRange.trend, data.metrics.enrolledInRange.helper),
  ]));
  lines.push(csvRow([
    "Avg First Response",
    data.metrics.avgResponseTime.display ?? "N/A",
    trendText(data.metrics.avgResponseTime.trend, data.metrics.avgResponseTime.helper),
  ]));
  lines.push("");

  lines.push(csvRow(["Inquiry Volume Trend"]));
  lines.push(csvRow(["Date", "Inbound Messages"]));
  for (const row of data.inquiryTrend) lines.push(csvRow([row.date, row.count]));
  if (data.inquiryTrend.length === 0) lines.push(csvRow(["(no data in range)"]));
  lines.push("");

  lines.push(csvRow(["Enrollments by Ambassador"]));
  lines.push(csvRow(["Ambassador", "Deals Closed"]));
  for (const row of data.enrollmentsByAmbassador) lines.push(csvRow([row.name, row.deals]));
  if (data.enrollmentsByAmbassador.length === 0) lines.push(csvRow(["(no data in range)"]));
  lines.push("");

  lines.push(csvRow(["Leaderboard"]));
  lines.push(csvRow(["Rank", "Ambassador", "Deals Closed", "Avg Response"]));
  for (const row of data.leaderboard) lines.push(csvRow([row.rank, row.name, row.deals, row.avgResponse ?? "N/A"]));
  if (data.leaderboard.length === 0) lines.push(csvRow(["(no data in range)"]));
  lines.push("");

  lines.push(csvRow(["Recent Activity"]));
  lines.push(csvRow(["Time", "Type", "Action", "Meta"]));
  for (const row of data.activityFeed) lines.push(csvRow([row.time, row.type, row.action, row.meta]));
  if (data.activityFeed.length === 0) lines.push(csvRow(["(no data in range)"]));

  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel opens UTF-8 CSVs (accented names, curly quotes, etc.) correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type MetricCardData = {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  trend: Trend;
  helper: string;
};

function SummaryCard({ card }: { card: MetricCardData }) {
  const Icon = card.icon;
  const TrendIcon = card.trend?.dir === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-none">{card.value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-blue-700" />
        </div>
      </div>
      {card.trend ? (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs mt-auto",
            card.trend.dir === "up" ? "text-emerald-600" : "text-red-600",
          )}
        >
          <TrendIcon className="w-3.5 h-3.5" />
          {card.trend.pct}% {card.helper}
        </div>
      ) : (
        <div className="text-xs text-gray-400 mt-auto">{card.helper}</div>
      )}
    </div>
  );
}

function CardShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col", className)}>
      <div className="mb-4 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
      {text}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [dateRange, setDateRange] = useState(dateRangeOptions[1]); // "This Month"
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/analytics/overview?range=${dateRange.value}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const handleExport = () => {
    if (!data) {
      toast.error("Nothing to export yet.");
      return;
    }
    const csv = buildAnalyticsCsv(data, dateRange.label);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`unicrew-analytics-${dateRange.value}-${today}.csv`, csv);
    toast.success("Report downloaded");
  };

  const metricCards: MetricCardData[] = data
    ? [
        { icon: Users, value: String(data.metrics.totalStudents.value), label: "Total Students", trend: null, helper: data.metrics.totalStudents.helper },
        { icon: MessageSquare, value: String(data.metrics.openInquiries.value), label: "Open Inquiries", trend: null, helper: data.metrics.openInquiries.helper },
        { icon: GraduationCap, value: String(data.metrics.enrolledInRange.value), label: "Enrolled This Period", trend: data.metrics.enrolledInRange.trend, helper: data.metrics.enrolledInRange.helper },
        { icon: Clock, value: data.metrics.avgResponseTime.display || "—", label: "Avg First Response", trend: data.metrics.avgResponseTime.trend, helper: data.metrics.avgResponseTime.helper },
      ]
    : [];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={cn("bg-white border-b border-gray-200 shrink-0", isMobile ? "px-4 py-3 space-y-3" : "h-16 px-6 flex items-center justify-between")}>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Operations Dashboard</h1>
          <p className="text-xs text-gray-500">Real-time pipeline monitoring and team activity stats</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {dateRange.label}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dateRangeOptions.map((r) => (
                <DropdownMenuItem key={r.value} onClick={() => setDateRange(r)}>{r.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
            size="sm"
            onClick={handleExport}
            disabled={loading || !data}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        /* ── Skeleton ─────────────────────────────────────────────────────── */
        <div className="p-6 space-y-5">
          <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-4")}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                  <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className={cn("grid gap-5", isMobile ? "grid-cols-1 h-auto" : "grid-cols-5 h-80")}>
            <Skeleton className={cn("rounded-xl h-80", isMobile ? "col-span-1" : "col-span-3")} />
            <Skeleton className={cn("rounded-xl h-80", isMobile ? "col-span-1" : "col-span-2")} />
          </div>
          <div className={cn("grid gap-5", isMobile ? "grid-cols-1 h-auto" : "grid-cols-9 h-96")}>
            <Skeleton className={cn("rounded-xl h-96", isMobile ? "col-span-1" : "col-span-5")} />
            <Skeleton className={cn("rounded-xl h-96", isMobile ? "col-span-1" : "col-span-4")} />
          </div>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            {error}
          </div>
        </div>
      ) : (
        /* ── Live content ─────────────────────────────────────────────────── */
        <div className="p-6 space-y-5">

          {/* Row 1 — Summary metric cards */}
          <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-4")}>
            {metricCards.map((card) => (
              <SummaryCard key={card.label} card={card} />
            ))}
          </div>

          {/* Row 2 — Charts */}
          <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-5")} style={isMobile ? undefined : { height: 320 }}>
            {/* Line chart — inquiry trend */}
            <CardShell
              className={cn(isMobile ? "col-span-1 h-80" : "col-span-3")}
              title="Inquiry Volume Trend"
              description="Daily inbound student messages in the selected range"
            >
              <div className="flex-1 min-h-0">
                {data && data.inquiryTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.inquiryTrend}
                      margin={{ top: 4, right: 12, bottom: 0, left: -16 }}
                    >
                      <defs>
                        <linearGradient id="inquiryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickCount={5}
                        domain={[0, "auto"]}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
                        }}
                        cursor={{ stroke: "#1d4ed8", strokeWidth: 1, strokeDasharray: "4 2" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#1d4ed8"
                        strokeWidth={2}
                        fill="url(#inquiryGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#1d4ed8", strokeWidth: 2, stroke: "#fff" }}
                        name="Inquiries"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="No inbound messages in this range yet." />
                )}
              </div>
            </CardShell>

            {/* Bar chart — enrollments by ambassador */}
            <CardShell
              className={cn(isMobile ? "col-span-1 h-80" : "col-span-2")}
              title="Enrollments by Ambassador"
              description="Cards moved to a completed stage in this range"
            >
              <div className="flex-1 min-h-0">
                {data && data.enrollmentsByAmbassador.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.enrollmentsByAmbassador}
                      margin={{ top: 4, right: 12, bottom: 0, left: -20 }}
                      barSize={28}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
                        }}
                        cursor={{ fill: "rgba(29,78,216,0.06)" }}
                      />
                      <Bar dataKey="deals" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Deals Closed" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="No enrollments in this range yet." />
                )}
              </div>
            </CardShell>
          </div>

          {/* Row 3 — Activity feed + Leaderboard */}
          <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-9")} style={isMobile ? undefined : { height: 360 }}>
            {/* Activity feed */}
            <CardShell
              className={cn("overflow-hidden", isMobile ? "col-span-1 h-80" : "col-span-5")}
              title="Recent Operational Activity"
              description="AI updates, pipeline moves, and new inquiries in this range"
            >
              <div className="flex-1 overflow-y-auto space-y-3">
                {data && data.activityFeed.length > 0 ? (
                  data.activityFeed.map((item, i) => {
                    const cfg = activityIcons[item.type] || activityIcons.new_contact;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 leading-snug">{item.action}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.meta} · {formatRelativeTime(item.time)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState text="No activity in this range yet." />
                )}
              </div>
            </CardShell>

            {/* Leaderboard */}
            <CardShell
              className={cn("overflow-hidden", isMobile ? "col-span-1 h-80" : "col-span-4")}
              title="Top Performers Leaderboard"
              description="Ranked by deals closed in this range"
            >
              <div className="flex-1 overflow-y-auto space-y-2.5">
                {data && data.leaderboard.length > 0 ? (
                  data.leaderboard.map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400 shrink-0 text-center">
                        {row.rank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {row.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{row.name}</p>
                        <p className="text-[11px] text-gray-500">{row.deals} deal{row.deals === 1 ? "" : "s"} closed</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-gray-400">Avg resp.</p>
                        <p className="text-[11px] text-gray-600 font-medium">{row.avgResponse || "—"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No closed deals in this range yet." />
                )}
              </div>
            </CardShell>
          </div>

        </div>
      )}
    </div>
  );
}
