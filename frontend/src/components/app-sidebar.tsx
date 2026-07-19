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
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/auth-context";
import { ShiftClockToggle } from "@/components/peers/ShiftClockToggle";
import type { Role } from "@/types/roles";

const getNavItems = (role: Role) => {
  if (role === "admin") {
    return [
      { name: "Dashboard", href: "/admin", icon: BarChart3 },
      { name: "Inbox", href: "/inbox", icon: Inbox },
      { name: "User Management", href: "/admin/users", icon: Users },
      { name: "AI Router Admin", href: "/settings/intent-router", icon: GitBranch },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ];
  } else if (role === "ambassador") {
    return [
      { name: "My Chats", href: "/inbox", icon: Inbox },
      { name: "My Pipeline", href: "/kanban", icon: KanbanSquare },
      { name: "Peer Directory", href: "/peers", icon: Users },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
    ];
  } else {
    // counselor
    return [
      { name: "Unified Inbox", href: "/inbox", icon: Inbox },
      { name: "Kanban Pipeline", href: "/kanban", icon: KanbanSquare },
      { name: "Peer Directory", href: "/peers", icon: Users },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ];
  }
};

const getBottomNavItems = (role: Role) => {
  if (role === "counselor") {
    return [{ name: "Intent Router", href: "/settings/intent-router", icon: GitBranch }];
  }
  return [];
};

// Views where the sidebar auto-collapses to rail mode to maximise chat width.
const RAIL_PATHS = new Set(["/inbox"]);

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === "admin";

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

  const role = user?.role ?? "counselor";
  const navItems = getNavItems(role);
  const bottomNavItems = getBottomNavItems(role);

  const displayName = user?.full_name ?? "User";
  const displayInitials = user?.initials ?? "??";
  const jobTitle = role === "admin"
    ? "System Administrator"
    : role === "counselor"
      ? "Admissions Counselor"
      : "Student Ambassador";

  return (
    <aside
      className={cn(
        "relative shrink-0 border-r flex flex-col",
        isAdmin ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-gray-200",
        collapsed
          ? "w-[64px] transition-[width] duration-200 ease-out"
          : "w-60 transition-[width] duration-250 ease-in-out",
      )}
    >
      {/* Header */}
      <div className={cn("h-16 flex items-center border-b px-4 gap-2", isAdmin ? "border-slate-800" : "border-gray-200")}>
        {/* Logo square — doubles as expand button when rail is collapsed */}
        <button
          onClick={collapsed ? toggleCollapse : undefined}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            isAdmin ? "bg-blue-600" : "bg-blue-700",
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
              <span className={cn("text-sm font-medium", isAdmin ? "text-slate-100" : "text-gray-900")}>UniCrew</span>
              <span className={cn("text-xs", isAdmin ? "text-slate-400" : "text-gray-500")}>
                {isAdmin ? "Admin Console" : "Student Comms"}
              </span>
            </div>
            <button
              onClick={toggleCollapse}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                isAdmin ? "text-slate-400 hover:bg-slate-800 hover:text-slate-300" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              aria-label="Collapse sidebar"
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1",
          collapsed ? "px-2 py-3 overflow-visible" : "p-3 overflow-y-auto",
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
                  ? (isAdmin ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700")
                  : (isAdmin ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
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
            <div className={cn("pt-3 border-t", isAdmin ? "border-slate-800" : "border-gray-200")}>
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
          "border-t", isAdmin ? "border-slate-800" : "border-gray-200",
          collapsed ? "px-2 py-3" : "p-3",
        )}
      >
        {role === "ambassador" && <ShiftClockToggle collapsed={collapsed} />}

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
                  ? (isAdmin ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700")
                  : (isAdmin ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
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
          "border-t", isAdmin ? "border-slate-800" : "border-gray-200",
          collapsed ? "px-2 py-3" : "p-3",
        )}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full text-white flex items-center justify-center text-xs",
                isAdmin ? "bg-slate-700" : "bg-blue-700"
              )}
              title={`${displayName} · ${jobTitle}`}
            >
              {displayInitials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full text-white flex items-center justify-center text-xs shrink-0",
                isAdmin ? "bg-slate-700 font-semibold" : "bg-blue-700"
              )}
            >
              {displayInitials}
            </div>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className={cn("text-sm truncate", isAdmin ? "text-slate-100" : "text-gray-900")}>
                {displayName}
              </span>
              <span className={cn("text-xs truncate", isAdmin ? "text-slate-400" : "text-gray-500")}>
                {jobTitle}
              </span>
            </div>
            <button
              onClick={signOut}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors shrink-0",
                isAdmin ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
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
