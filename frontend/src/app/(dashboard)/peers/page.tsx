"use client";

import { useEffect, useState } from "react";
import { Search, Users, Crown, Loader2, BookOpen, MapPin, Award, Star, Clock, Calendar, MessageSquare, Plus, ChevronDown, ChevronUp, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgrammeType = "Undergraduate" | "Masters" | "PhD";

type PeerUser = {
  id: string;
  name: string;
  email: string;
  role: "counselor" | "ambassador" | "admin";
  initials: string;
  isTeamLeader: boolean;
  teamId: string | null;
  teamName: string;
  
  // Ambassador specific data
  colour: string; 
  programme?: string; 
  programmeType?: ProgrammeType | string;
  year?: string;
  languages?: string;
  from?: string;
  fromFlag?: string;
  qualification?: string;
  majors?: string;
  bio?: string;
  bioFull?: string;
  hobbies?: string[];
  clubs?: string;
  favouriteCourses?: string[];
  online?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AmbassadorCard({ user, onSelect }: { user: PeerUser; onSelect: (u: PeerUser) => void }) {
  const isCounselor = user.role === "counselor";

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
            "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md border-4 border-white mb-3",
            isCounselor ? "bg-slate-200 text-slate-700" : user.colour,
          )}
        >
          {user.initials}
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

        <div className="mt-auto pt-4 w-full">
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

function AmbassadorModal({ user, onClose }: { user: PeerUser; onClose: () => void }) {
  const isCounselor = user.role === "counselor";

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
          <div className={cn("h-32 p-6 flex items-end", isCounselor ? "bg-slate-700" : user.colour.split(' ')[0].replace('100', '700'))}>
            <div className="flex items-center gap-4 translate-y-12">
              <div className={cn("w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg text-white", isCounselor ? "bg-slate-600" : user.colour.split(' ')[0].replace('100', '600'))}>
                {user.initials}
              </div>
              <div className="pb-1 text-white">
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
                  {user.role === "counselor" ? "Admissions Counselor" : "Student Ambassador"} • {user.teamName}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-16 pb-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column: Details */}
              <div className="flex-1 space-y-6">
                {!isCounselor && (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About Me</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {user.bioFull || user.bio || "No biography provided."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-xs font-semibold">Programme</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{user.programme || "Not specified"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user.year || "Enrolled"}</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-emerald-700 mb-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs font-semibold">From</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.fromFlag && <span className="mr-1.5">{user.fromFlag}</span>}
                          {user.from || "Not specified"}
                        </p>
                      </div>
                    </div>

                    {user.favouriteCourses && user.favouriteCourses.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Favourite Courses</h4>
                        <div className="flex flex-wrap gap-2">
                          {user.favouriteCourses.map((course, idx) => (
                            <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md text-xs font-medium">
                              {course}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isCounselor && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
                    <p className="text-sm text-gray-700">{user.email}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Meta & Actions */}
              <div className="w-full md:w-64 shrink-0 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Connect</h4>
                  <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white mb-2 shadow-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Internal Chat
                  </Button>
                  <Button variant="outline" className="w-full bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Schedule
                  </Button>
                </div>

                {!isCounselor && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    {user.languages && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Languages</h4>
                        <p className="text-sm text-gray-700 font-medium">{user.languages}</p>
                      </div>
                    )}
                    {user.qualification && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Previous Qual.</h4>
                        <p className="text-sm text-gray-700 font-medium">{user.qualification}</p>
                      </div>
                    )}
                    {user.majors && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Majors/Minors</h4>
                        <p className="text-sm text-gray-700 font-medium">{user.majors}</p>
                      </div>
                    )}
                    {user.hobbies && user.hobbies.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {user.hobbies.map((hobby, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-600">
                              {hobby}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PeersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);
  
  const [users, setUsers] = useState<PeerUser[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchPeers() {
      try {
        setLoading(true);
        // RLS policies automatically filter this down to the user's team
        // (or all users for admin)
        const { data, error } = await supabase
          .from("internal_users")
          .select(`
            id,
            full_name,
            email,
            role,
            is_team_leader,
            team_id,
            teams ( id, name ),
            ambassador_profiles (
              avatar_colour,
              programme,
              programme_type,
              academic_year,
              languages,
              origin_country,
              origin_flag,
              previous_qualification,
              majors,
              bio_short,
              bio_full,
              hobbies,
              clubs_societies,
              favourite_courses,
              is_online
            )
          `)
          .order("full_name");

        if (error) throw error;

        const mapped: PeerUser[] = (data || []).map((u: any) => {
          const profile = u.ambassador_profiles || {};
          
          return {
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: u.role,
            initials: getInitials(u.full_name),
            isTeamLeader: u.is_team_leader,
            teamId: u.team_id,
            teamName: u.teams?.name || "Unassigned",
            colour: profile.avatar_colour || "bg-gray-100 text-gray-700",
            programme: profile.programme || "",
            programmeType: profile.programme_type || "",
            year: profile.academic_year || "",
            languages: profile.languages?.join(", ") || "",
            from: profile.origin_country || "",
            fromFlag: profile.origin_flag || "",
            qualification: profile.previous_qualification || "",
            majors: profile.majors || "",
            bio: profile.bio_short || "",
            bioFull: profile.bio_full || "",
            hobbies: profile.hobbies || [],
            clubs: profile.clubs_societies || "",
            favouriteCourses: profile.favourite_courses || [],
            online: profile.is_online || false,
          };
        });

        setUsers(mapped);
      } catch (err) {
        console.error("Failed to fetch peers:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPeers();
  }, [supabase]);

  // Grouping logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const teamName = user.teamName;
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(user);
    return acc;
  }, {} as Record<string, PeerUser[]>);

  // Sort groups alphabetically, but move "Unassigned" to end
  const sortedTeams = Object.keys(groupedUsers).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <div className="bg-blue-100 p-1.5 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-semibold tracking-wide uppercase text-xs">Directory</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Team Peers</h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-lg">
              Connect with your fellow counselors and student ambassadors. Find colleagues by team, role, or expertise.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                placeholder="Search peers..."
                className="pl-9 w-full sm:w-64 bg-white border-gray-200 shadow-sm transition-all focus:ring-4 focus:ring-blue-500/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white border-gray-200 shadow-sm focus:ring-4 focus:ring-blue-500/10">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="counselor">Counselors</SelectItem>
                <SelectItem value="ambassador">Ambassadors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-10 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
            <p>Loading directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Users className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No peers found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          sortedTeams.map((teamName) => {
            const teamMembers = groupedUsers[teamName];
            
            // Sort team members: Leaders first, then alphabetical
            teamMembers.sort((a, b) => {
              if (a.isTeamLeader && !b.isTeamLeader) return -1;
              if (!a.isTeamLeader && b.isTeamLeader) return 1;
              return a.name.localeCompare(b.name);
            });

            return (
              <section key={teamName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{teamName}</h2>
                  <span className="bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                    {teamMembers.length}
                  </span>
                  <div className="h-px bg-gray-200 flex-1 ml-4" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {teamMembers.map((user) => (
                    <AmbassadorCard key={user.id} user={user} onSelect={setSelectedUser} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {selectedUser && (
        <AmbassadorModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
