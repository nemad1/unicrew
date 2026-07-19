"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FlagPicker } from "@/components/profile/FlagPicker";
import { AdminAvatarUploader } from "@/components/admin/admin-avatar-uploader";

type Team = { id: string; name: string };
type ClubEntry = { name: string; role: string | null };

export type EditableUser = {
  id: string;
  full_name: string;
  role: "admin" | "counselor" | "ambassador";
  team_id: string | null;
  is_team_leader: boolean;
  contact_phone: string | null;
  avatar_url: string | null;
  ambassador_profiles:
    | {
        programme: string | null;
        programme_type: string | null;
        academic_year: string | null;
        majors: string | null;
        previous_qualification: string | null;
        favourite_courses: string[] | null;
        languages: string[] | null;
        origin_country: string | null;
        origin_flag: string | null;
        bio_short: string | null;
        bio_full: string | null;
        hobbies: string[] | null;
        clubs_societies: ClubEntry[] | null;
      }
    | { [key: string]: unknown }[]
    | null;
};

interface EditUserModalProps {
  user: EditableUser | null;
  onClose: () => void;
  onUpdated: () => void;
}

function csvToList(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

// Extracted so both the lazy useState initializer and the (unlikely)
// re-render path read the same normalized shape.
function getAmbassadorProfile(user: EditableUser | null) {
  if (!user) return null;
  return Array.isArray(user.ambassador_profiles) ? user.ambassador_profiles[0] : user.ambassador_profiles;
}

export function EditUserModal({ user, onClose, onUpdated }: EditUserModalProps) {
  // This component is remounted per-user via a `key` on the parent
  // (admin/users/page.tsx), so lazy initializers below only ever run once
  // per edited user, with the real values already in hand. Re-deriving
  // these fields later via a `useEffect([user])` on an instance the parent
  // *doesn't* remount was the original design, and it's fragile: Radix's
  // Select can silently fail to reflect (or even reset) a value that's set
  // programmatically after the component already mounted with a different
  // one, since its item-registration is tied to first render, not later
  // prop changes.
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState<"counselor" | "ambassador">(
    user && user.role !== "admin" ? user.role : "counselor"
  );
  const [teamId, setTeamId] = useState<string>(user?.team_id ?? "");
  const [isTeamLeader, setIsTeamLeader] = useState(user?.is_team_leader ?? false);
  const [contactPhone, setContactPhone] = useState(user?.contact_phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);

  const initialAmb = getAmbassadorProfile(user);
  const [bioShort, setBioShort] = useState((initialAmb?.bio_short as string) ?? "");
  const [bioFull, setBioFull] = useState((initialAmb?.bio_full as string) ?? "");
  const [originCountry, setOriginCountry] = useState((initialAmb?.origin_country as string) ?? "");
  const [originFlag, setOriginFlag] = useState((initialAmb?.origin_flag as string) ?? "");
  const [languagesText, setLanguagesText] = useState(((initialAmb?.languages as string[]) ?? []).join(", "));
  const [hobbiesText, setHobbiesText] = useState(((initialAmb?.hobbies as string[]) ?? []).join(", "));
  const [favouriteCoursesText, setFavouriteCoursesText] = useState(
    ((initialAmb?.favourite_courses as string[]) ?? []).join(", ")
  );
  const [clubs, setClubs] = useState<ClubEntry[]>((initialAmb?.clubs_societies as ClubEntry[]) ?? []);
  const [majors, setMajors] = useState((initialAmb?.majors as string) ?? "");
  const [previousQualification, setPreviousQualification] = useState(
    (initialAmb?.previous_qualification as string) ?? ""
  );
  const [programme, setProgramme] = useState((initialAmb?.programme as string) ?? "");
  const [programmeType, setProgrammeType] = useState((initialAmb?.programme_type as string) ?? "");
  const [academicYear, setAcademicYear] = useState((initialAmb?.academic_year as string) ?? "");

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(console.error);
  }, []);

  if (!user) return null;

  const isAmbassador = role === "ambassador";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        full_name: fullName.trim(),
        role,
        team_id: teamId || null,
        is_team_leader: isTeamLeader,
        contact_phone: contactPhone || null,
      };

      if (isAmbassador) {
        body.ambassador_profile = {
          bio_short: bioShort,
          bio_full: bioFull,
          origin_country: originCountry,
          origin_flag: originFlag,
          languages: csvToList(languagesText),
          hobbies: csvToList(hobbiesText),
          favourite_courses: csvToList(favouriteCoursesText),
          clubs_societies: clubs.filter((c) => c.name.trim()),
          majors,
          previous_qualification: previousQualification,
          programme,
          programme_type: programmeType,
          academic_year: academicYear,
        };
      }

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update user.");
        setLoading(false);
        return;
      }

      onUpdated();
      onClose();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edit User</h2>
              <p className="text-xs text-gray-500">
                {isAmbassador
                  ? "Account details and Peer Directory profile content"
                  : "Update role, team, and leadership status"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-4">
            <AdminAvatarUploader
              targetUserId={user.id}
              currentUrl={avatarUrl}
              initials={getInitials(fullName || user.full_name)}
              onUploaded={setAvatarUrl}
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="edit-user-name" className="text-xs text-gray-600">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
              <Label htmlFor="edit-user-phone" className="text-xs text-gray-600 pt-1 block">
                WhatsApp number
              </Label>
              <Input
                id="edit-user-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 60123456789"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "counselor" | "ambassador")} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counselor">Counselor</SelectItem>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Team</Label>
              {teams.length === 0 ? (
                <div className="h-9 flex items-center px-3 text-xs text-gray-400 border border-gray-200 rounded-md">
                  Loading teams...
                </div>
              ) : (
                <Select value={teamId} onValueChange={setTeamId} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              role="switch"
              aria-checked={isTeamLeader}
              onClick={() => setIsTeamLeader(!isTeamLeader)}
              disabled={loading}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                isTeamLeader ? "bg-blue-700" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  isTeamLeader ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <span className="text-sm text-gray-700">Team Leader</span>
          </div>

          {isAmbassador && (
            <>
              <div className="h-px bg-gray-100" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Peer Directory Profile
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Short bio (card preview)</Label>
                <Textarea value={bioShort} onChange={(e) => setBioShort(e.target.value)} rows={2} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Full bio</Label>
                <Textarea value={bioFull} onChange={(e) => setBioFull(e.target.value)} rows={3} disabled={loading} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Country of origin</Label>
                  <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Languages (comma-separated)</Label>
                  <Input value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} disabled={loading} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Flag(s)</Label>
                <FlagPicker value={originFlag} onChange={setOriginFlag} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Area of study / degree</Label>
                  <Input value={programme} onChange={(e) => setProgramme(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Academic level</Label>
                  <Input value={programmeType} onChange={(e) => setProgrammeType(e.target.value)} placeholder="Undergraduate / Masters / PhD" disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Year of study</Label>
                  <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Majors / Minors</Label>
                  <Input value={majors} onChange={(e) => setMajors(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Previous qualification</Label>
                  <Input value={previousQualification} onChange={(e) => setPreviousQualification(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Favourite courses (comma-separated)</Label>
                  <Input value={favouriteCoursesText} onChange={(e) => setFavouriteCoursesText(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Interests / hashtags (comma-separated)</Label>
                <Input value={hobbiesText} onChange={(e) => setHobbiesText(e.target.value)} disabled={loading} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Clubs & societies</Label>
                {clubs.map((club, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={club.name}
                      onChange={(e) => setClubs((prev) => prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)))}
                      placeholder="Club name"
                      className="flex-1"
                      disabled={loading}
                    />
                    <Input
                      value={club.role || ""}
                      onChange={(e) => setClubs((prev) => prev.map((c, i) => (i === idx ? { ...c, role: e.target.value || null } : c)))}
                      placeholder="Role (optional)"
                      className="w-36"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setClubs((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-600 p-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClubs((prev) => [...prev, { name: "", role: null }])}
                  className="text-blue-700 border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add club
                </Button>
              </div>

              <p className="text-[11px] text-gray-400">
                Weekly availability is set by the ambassador themselves on their own profile page.
              </p>
            </>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="border-gray-200">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
