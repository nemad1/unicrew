"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  KanbanSquare,
  Users,
  BarChart3,
  GraduationCap,
  GitBranch,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { name: "Unified Inbox", href: "/inbox", icon: Inbox },
  { name: "Kanban Pipeline", href: "/kanban", icon: KanbanSquare },
  { name: "Peer Directory", href: "/peers", icon: Users },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const bottomNavItems = [
  { name: "Intent Router", href: "/settings/intent-router", icon: GitBranch },
];

// Views where the sidebar auto-collapses to rail mode to maximise chat width.
const RAIL_PATHS = new Set(["/inbox"]);

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const [date, setDate] = useState<Date | undefined>(new Date());
  // null = follow auto-collapse rule; true/false = user has pinned a state
  const [userOverride, setUserOverride] = useState<boolean | null>(null);

  const autoCollapse = RAIL_PATHS.has(pathname);

  // When the pathname changes, clear any override so auto-collapse re-engages.
  useEffect(() => {
    setUserOverride(null);
  }, [pathname]);

  const collapsed = userOverride !== null ? userOverride : autoCollapse;
  const toggleCollapse = () => setUserOverride(!collapsed);

  const showCalendar = pathname === "/calendar" && !collapsed;

  const isActive = (href: string) => {
    if (href === "/inbox") return pathname === "/inbox" || pathname.startsWith("/inbox/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "relative shrink-0 border-r border-gray-200 bg-white flex flex-col",
        collapsed
          ? "w-[64px] transition-[width] duration-200 ease-out"
          : "w-60 transition-[width] duration-250 ease-in-out",
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center border-b border-gray-200 px-4 gap-2">
        {/* Logo square — doubles as expand button when rail is collapsed */}
        <button
          onClick={collapsed ? toggleCollapse : undefined}
          className={cn(
            "w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0",
            collapsed && "cursor-pointer hover:opacity-80 transition-opacity",
            "mx-auto",
            !collapsed && "mx-0",
          )}
          title={collapsed ? "Expand navigation" : undefined}
          aria-label={collapsed ? "Expand navigation" : undefined}
        >
          <GraduationCap className="w-5 h-5 text-white" />
        </button>

        {/* Brand text + inline collapse button — only in expanded state */}
        {!collapsed && (
          <>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">CampusCRM</span>
              <span className="text-xs text-gray-500">Student Comms</span>
            </div>
            <button
              onClick={toggleCollapse}
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Collapse sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto",
          collapsed ? "px-2 py-3" : "p-3",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                "rounded-lg text-sm transition-colors flex items-center group relative",
                collapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "w-full gap-3 px-3 py-2",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className={collapsed ? "w-[18px] h-[18px]" : "w-4 h-4"} />
              {!collapsed && <span>{item.name}</span>}
              {/* Rail mode: floating label on hover */}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              showCalendar ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0",
            )}
          >
            <div className="pt-3 border-t border-gray-200">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                showOutsideDays
                className="p-0 [&_button]:h-7 [&_button]:w-7 [&_button]:text-xs"
              />
            </div>
          </div>
        )}
      </nav>

      <div
        className={cn(
          "border-t border-gray-200",
          collapsed ? "px-2 py-3" : "p-3",
        )}
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                "rounded-lg text-sm transition-colors flex items-center group relative",
                collapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "w-full gap-3 px-3 py-2 mb-2",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className={collapsed ? "w-[18px] h-[18px]" : "w-4 h-4"} />
              {!collapsed && <span>{item.name}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div
        className={cn(
          "border-t border-gray-200",
          collapsed ? "px-2 py-3" : "p-3",
        )}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs"
              title={`${user.name} · ${user.jobTitle}`}
            >
              {user.initials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs">
              {user.initials}
            </div>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-sm text-gray-900 truncate">{user.name}</span>
              <span className="text-xs text-gray-500 truncate">{user.jobTitle}</span>
            </div>
            <button
              onClick={signOut}
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
