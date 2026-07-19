"use client";

import { useEffect, useState } from "react";
import { Search, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { AmbassadorCard } from "@/components/peers/AmbassadorCard";
import { AmbassadorFullProfileModal } from "@/components/peers/AmbassadorFullProfileModal";
import type { PeerUser } from "@/components/peers/types";

type TeamMeta = {
  id: string;
  name: string;
  accent_color: string | null;
  lead: { id: string; full_name: string } | null;
};

type TeamStats = { avg_rating: number | null; ambassador_count: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PeersPage() {
  const { role: viewerRole } = useAuth();
  const isStaffViewer = viewerRole !== "ambassador";

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<PeerUser | null>(null);

  const [users, setUsers] = useState<PeerUser[]>([]);
  const [teamsMeta, setTeamsMeta] = useState<TeamMeta[]>([]);
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});
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
            contact_phone,
            teams!team_id ( id, name ),
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
              is_online,
              availability_schedule
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
            clubs: profile.clubs_societies || [],
            favouriteCourses: profile.favourite_courses || [],
            online: profile.is_online || false,
            availability: profile.availability_schedule || [],
            contactPhone: u.contact_phone || null,
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

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeamsMeta(
            data.map((t: any) => ({
              id: t.id,
              name: t.name,
              accent_color: t.accent_color || null,
              lead: Array.isArray(t.lead) ? t.lead[0] || null : t.lead || null,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  // Staff-only per-team rating rollup, once we know which teams have members
  useEffect(() => {
    if (!isStaffViewer) return;
    const teamIds = Array.from(new Set(users.map((u) => u.teamId).filter(Boolean))) as string[];
    if (teamIds.length === 0) return;

    Promise.all(
      teamIds.map((id) =>
        fetch(`/api/teams/${id}/stats`)
          .then((res) => (res.ok ? res.json() : null))
          .then((stats) => [id, stats] as const)
      )
    ).then((results) => {
      setTeamStats((prev) => {
        const next = { ...prev };
        results.forEach(([id, stats]) => {
          if (stats) next[id] = stats;
        });
        return next;
      });
    });
  }, [isStaffViewer, users]);

  // Grouping logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesTeam = teamFilter === "all" || u.teamName === teamFilter;
    return matchesSearch && matchesRole && matchesTeam;
  });

  const teamFilterOptions = Array.from(new Set(users.map((u) => u.teamName))).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
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
            {teamFilterOptions.length > 1 && (
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-gray-200 shadow-sm focus:ring-4 focus:ring-blue-500/10">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teamFilterOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

            const meta = teamsMeta.find((t) => t.name === teamName);
            const teamId = teamMembers[0]?.teamId;
            const stats = teamId ? teamStats[teamId] : undefined;

            return (
              <section key={teamName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta?.accent_color || "#9ca3af" }}
                  />
                  <h2 className="text-xl font-bold text-gray-900">{teamName}</h2>
                  <span className="bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                    {teamMembers.length}
                  </span>
                  <div className="h-px bg-gray-200 flex-1 ml-4" />
                </div>
                <div className="flex items-center gap-3 mb-4 pl-5 text-xs text-gray-500">
                  {meta?.lead && <span>Lead: {meta.lead.full_name}</span>}
                  {isStaffViewer && stats && stats.avg_rating !== null && (
                    <span>Avg rating: {stats.avg_rating}</span>
                  )}
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
        <AmbassadorFullProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
