"use client";

import { Crown, X, MapPin, Globe2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { PerformanceStatsPanel } from "./PerformanceStatsPanel";
import { HashtagList } from "./HashtagList";
import { ClubsSocietiesList } from "./ClubsSocietiesList";
import { WeeklyAvailabilityTable } from "./WeeklyAvailabilityTable";
import { whatsappLink, type PeerUser } from "./types";

export function AmbassadorFullProfileModal({
  user,
  onClose,
}: {
  user: PeerUser;
  onClose: () => void;
}) {
  const isCounselor = user.role === "counselor";
  const { role: viewerRole } = useAuth();
  const isStaffViewer = viewerRole !== "ambassador";
  const firstName = user.name.split(" ")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-white z-20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* Header Banner */}
          <div className={cn("p-6 pb-20 flex items-start justify-between gap-4", isCounselor ? "bg-slate-700" : user.colour.split(' ')[0].replace('100', '700'))}>
            <div className="flex items-center gap-4">
              <div className={cn("w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg text-white", isCounselor ? "bg-slate-600" : user.colour.split(' ')[0].replace('100', '600'))}>
                {user.initials}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold drop-shadow-md">{user.name}</h2>
                  {user.isTeamLeader && (
                    <div className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded text-xs font-bold shadow-sm flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Team Leader
                    </div>
                  )}
                </div>
                <p className="text-white/90 text-sm font-medium drop-shadow-sm">
                  {isCounselor
                    ? `Admissions Counselor • ${user.teamName}`
                    : `${user.year || "Enrolled"} · ${user.programmeType || "Undergraduate"}`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {!isCounselor && (
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px] font-medium">
                      {user.programmeType || "Undergraduate"}
                    </span>
                  )}
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        user.online ? "bg-emerald-400" : "bg-gray-300"
                      )}
                    />
                    {user.online ? "Online now" : "Offline"}
                  </span>
                </div>
              </div>
            </div>

            {!isCounselor && (
              <div className="flex flex-col gap-2 shrink-0 mt-1">
                <Button
                  className="bg-white text-blue-700 hover:bg-blue-50 shadow-sm whitespace-nowrap disabled:opacity-50"
                  disabled={!whatsappLink(user.contactPhone)}
                  title={whatsappLink(user.contactPhone) ? undefined : "No WhatsApp number on file"}
                  onClick={() => {
                    const link = whatsappLink(user.contactPhone);
                    if (link) window.open(link, "_blank", "noopener,noreferrer");
                  }}
                >
                  Chat with {firstName}
                </Button>
                <Button variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 whitespace-nowrap">
                  Mentor {firstName}
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 pt-6 pb-8 space-y-8">
            {!isCounselor && isStaffViewer && (
              <PerformanceStatsPanel userId={user.id} variant="modal" />
            )}

            {isCounselor ? (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
                <p className="text-sm text-gray-700">{user.email}</p>
              </div>
            ) : (
              <>
                {/* In Short */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">In Short</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        I come from: {user.fromFlag && <span className="mr-1">{user.fromFlag}</span>}
                        {user.from || "Not specified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Globe2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>I speak: {user.languages || "Not specified"}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    I am currently in: {user.year || "Enrolled"} ({user.programme || "Not specified"})
                  </p>
                </div>

                {/* Area of Study */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Area of Study</h4>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
                    {user.programme || "Not specified"}
                  </div>
                </div>

                {/* Academic Life */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Academic Life</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Favourite courses:</p>
                      {user.favouriteCourses && user.favouriteCourses.length > 0 ? (
                        <ul className="text-sm text-gray-700 space-y-1">
                          {user.favouriteCourses.map((course, idx) => (
                            <li key={idx}>— {course}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400">None listed</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Previous Qualification:</p>
                      <p className="text-sm text-gray-700">{user.qualification || "Not specified"}</p>
                      {user.majors && (
                        <>
                          <p className="text-xs font-semibold text-gray-500 mt-3 mb-1">Majors/Minors:</p>
                          <p className="text-sm text-gray-700">{user.majors}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Life */}
                {((user.hobbies && user.hobbies.length > 0) || (user.clubs && user.clubs.length > 0)) && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Social Life</h4>
                    <div className="space-y-3">
                      {user.hobbies && user.hobbies.length > 0 && <HashtagList tags={user.hobbies} />}
                      {user.clubs && user.clubs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Clubs & Societies:</p>
                          <ClubsSocietiesList clubs={user.clubs} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* About Me */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About Me</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {user.bioFull || user.bio || "No biography provided."}
                  </p>
                </div>

                {/* Weekly Availability */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Weekly Availability</h4>
                  <WeeklyAvailabilityTable availability={user.availability || []} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
