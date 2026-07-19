"use client";

import { useState } from "react";
import { Crown, BookOpen, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { PerformanceStatsPanel } from "./PerformanceStatsPanel";
import { whatsappLink, type PeerUser } from "./types";

export function AmbassadorCard({
  user,
  onSelect,
}: {
  user: PeerUser;
  onSelect: (u: PeerUser) => void;
}) {
  const isCounselor = user.role === "counselor";
  const { role: viewerRole } = useAuth();
  const isStaffViewer = viewerRole !== "ambassador";
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group h-full">
      {/* Top Banner (Colour logic) */}
      <div className={cn("h-16 relative", isCounselor ? "bg-slate-100" : user.colour.split(' ')[0])}>
        {/* Status Dot */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              user.online ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-gray-300"
            )}
          />
          <span className="text-[10px] font-medium text-gray-700">
            {user.online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Avatar & Basic Info */}
      <div className="px-5 pt-0 pb-4 flex flex-col items-center -mt-10 relative z-10 flex-1">
        <div
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md border-4 border-white mb-3 overflow-hidden",
            isCounselor ? "bg-slate-200 text-slate-700" : user.colour,
          )}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.initials
          )}
        </div>
        <div className="text-center mb-1 w-full flex items-center justify-center gap-1.5">
          <h3 className="font-bold text-gray-900 text-lg truncate">{user.name}</h3>
          {user.isTeamLeader && (
            <div className="bg-amber-100 text-amber-700 p-1 rounded-md" title="Team Leader">
              <Crown className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3 text-center">
          {user.role === "counselor" ? "Admissions Counselor" : "Student Ambassador"}
        </p>

        {/* Dynamic Tags */}
        {!isCounselor && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium">
              <BookOpen className="w-3 h-3 mr-1" />
              {user.programmeType || "Student"}
            </span>
            {user.from && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                {user.fromFlag && <span className="mr-1">{user.fromFlag}</span>}
                {user.from}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium">
              <Star className="w-3 h-3 mr-1" />
              {user.year || "Enrolled"}
            </span>
          </div>
        )}

        {/* Bio Preview */}
        {!isCounselor && user.bio && (
          <p className="text-xs text-gray-600 text-center line-clamp-3 mb-4 leading-relaxed">
            "{user.bio}"
          </p>
        )}

        {isCounselor && (
          <div className="flex flex-col items-center gap-2 mt-2 text-sm text-gray-600">
            <p>{user.email}</p>
          </div>
        )}

        {/* Performance Stats — staff-only, collapsed by default */}
        {!isCounselor && isStaffViewer && (
          <div className="w-full">
            <button
              onClick={() => setStatsOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 py-1"
            >
              {statsOpen ? "Hide Performance Stats" : "Show Performance Stats"}
              {statsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {statsOpen && <PerformanceStatsPanel userId={user.id} variant="card" />}
          </div>
        )}

        <div className="mt-auto pt-4 w-full space-y-2">
          {!isCounselor && (
            <Button
              className="w-full bg-blue-700 hover:bg-blue-800 text-white shadow-sm disabled:opacity-50"
              disabled={!whatsappLink(user.contactPhone)}
              title={whatsappLink(user.contactPhone) ? undefined : "No WhatsApp number on file"}
              onClick={() => {
                const link = whatsappLink(user.contactPhone);
                if (link) window.open(link, "_blank", "noopener,noreferrer");
              }}
            >
              Chat with {user.name.split(" ")[0]}
            </Button>
          )}
          <Button
            onClick={() => onSelect(user)}
            variant="outline"
            className="w-full text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800 transition-colors"
          >
            {isCounselor ? "View Details" : "View Full Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
