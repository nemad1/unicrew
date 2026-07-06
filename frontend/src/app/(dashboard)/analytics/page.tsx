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
  FileText,
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const dateRanges = ["This Week", "This Month", "Last 30 Days", "Last 90 Days"];

const inquiryTrend = [
  { date: "May 25", count: 28 },
  { date: "May 28", count: 35 },
  { date: "Jun 1", count: 42 },
  { date: "Jun 4", count: 38 },
  { date: "Jun 8", count: 55 },
  { date: "Jun 11", count: 48 },
  { date: "Jun 15", count: 62 },
  { date: "Jun 18", count: 58 },
  { date: "Jun 22", count: 71 },
  { date: "Jun 25", count: 66 },
];

const enrollmentsByAmbassador = [
  { name: "Adel Z.", deals: 14 },
  { name: "Alyssa F.", deals: 12 },
  { name: "Hana K.", deals: 9 },
  { name: "Sara O.", deals: 7 },
];

const activityFeed = [
  {
    icon: FileCheck,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    action: "Priya Shah moved to Application Submitted",
    meta: "by Alyssa F. · 5m ago",
  },
  {
    icon: FileText,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    action: "Internal note added on Carlos Mendoza",
    meta: "by Counselor Amelia P. · 12m ago",
  },
  {
    icon: UserPlus,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    action: "New inquiry assigned to Adel Z.",
    meta: "Student: Yuki Tanaka · 25m ago",
  },
  {
    icon: Clock,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    action: "Shift Clock-in recorded",
    meta: "Ambassador Hana K. · 45m ago",
  },
];

const leaderboard = [
  { rank: 1, initials: "AZ", colour: "bg-blue-100 text-blue-700", name: "Adel Zeinab", deals: 8, avgResponse: "1.8m" },
  { rank: 2, initials: "AF", colour: "bg-pink-100 text-pink-700", name: "Alyssandra Fong", deals: 6, avgResponse: "2.1m" },
  { rank: 3, initials: "HK", colour: "bg-violet-100 text-violet-700", name: "Hana Kobayashi", deals: 5, avgResponse: "2.3m" },
  { rank: 4, initials: "SO", colour: "bg-rose-100 text-rose-700", name: "Sara Okonkwo", deals: 3, avgResponse: "2.7m" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

type MetricCard = {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  trend: string;
  trendDir: "up" | "down";
};

const metricCards: MetricCard[] = [
  { icon: Users, value: "432", label: "Total Active Students", trend: "+8% this week", trendDir: "up" },
  { icon: MessageSquare, value: "18", label: "Open Inquiries", trend: "-15% today", trendDir: "down" },
  { icon: GraduationCap, value: "42", label: "Enrolled This Month", trend: "+10% vs target", trendDir: "up" },
  { icon: Clock, value: "2m 14s", label: "Avg Response Time", trend: "-45s faster", trendDir: "down" },
];

function SummaryCard({ card }: { card: MetricCard }) {
  const Icon = card.icon;
  const TrendIcon = card.trendDir === "up" ? ArrowUpRight : ArrowDownRight;
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
      <div className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-auto">
        <TrendIcon className="w-3.5 h-3.5" />
        {card.trend}
      </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

import { useMediaQuery } from "@/hooks/use-media-query";

export default function AnalyticsPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [dateRange, setDateRange] = useState("This Month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

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
                {dateRange}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dateRanges.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setDateRange(r)}>{r}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
            size="sm"
            onClick={() => toast.success("Report exported to Downloads")}
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
              description="Daily student inquiries over past 30 days"
            >
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={inquiryTrend}
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
              </div>
            </CardShell>

            {/* Bar chart — enrollments by ambassador */}
            <CardShell
              className={cn(isMobile ? "col-span-1 h-80" : "col-span-2")}
              title="Enrollments by Ambassador"
              description="Closed deals this calendar month"
            >
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={enrollmentsByAmbassador}
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
              </div>
            </CardShell>
          </div>

          {/* Row 3 — Activity feed + Leaderboard */}
          <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-9")} style={isMobile ? undefined : { height: 360 }}>
            {/* Activity feed */}
            <CardShell
              className={cn("overflow-hidden", isMobile ? "col-span-1 h-80" : "col-span-5")}
              title="Recent Operational Activity"
              description="Real-time updates across the dashboard"
            >
              <div className="flex-1 overflow-y-auto space-y-3">
                {activityFeed.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          item.iconBg,
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", item.iconColor)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-900 leading-snug">{item.action}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.meta}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardShell>

            {/* Leaderboard */}
            <CardShell
              className={cn("overflow-hidden", isMobile ? "col-span-1 h-80" : "col-span-4")}
              title="Top Performers Leaderboard"
              description="Ranked by deals closed (enrolled students) this week"
            >
              <div className="flex-1 overflow-y-auto space-y-2.5">
                {leaderboard.map((row) => (
                  <div key={row.rank} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400 shrink-0 text-center">
                      {row.rank}
                    </span>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0",
                        row.colour,
                      )}
                    >
                      {row.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{row.name}</p>
                      <p className="text-[11px] text-gray-500">{row.deals} deals closed</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400">Avg resp.</p>
                      <p className="text-[11px] text-gray-600 font-medium">{row.avgResponse}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardShell>
          </div>

        </div>
      )}
    </div>
  );
}
