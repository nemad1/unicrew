"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { FlagPicker } from "@/components/profile/FlagPicker";
import { DAY_ORDER, DAY_LABELS, type AvailabilityDay, type AvailabilityEntry } from "@/components/peers/types";

type ClubEntry = { name: string; role: string | null };

type ProfileData = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  team_id: string | null;
  is_team_leader: boolean;
  contact_phone: string | null;
  avatar_url: string | null;
  teams: { name: string } | null;
  ambassador_profiles: {
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
    availability_schedule: AvailabilityEntry[] | null;
  } | null;
};

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function csvToList(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [contactPhone, setContactPhone] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bioFull, setBioFull] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [originFlag, setOriginFlag] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [hobbiesText, setHobbiesText] = useState("");
  const [favouriteCoursesText, setFavouriteCoursesText] = useState("");
  const [clubs, setClubs] = useState<ClubEntry[]>([]);
  const [majors, setMajors] = useState("");
  const [previousQualification, setPreviousQualification] = useState("");
  const [programme, setProgramme] = useState("");
  const [programmeType, setProgrammeType] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setAvatarUrl(data.avatar_url || null);
        setContactPhone(data.contact_phone || "");
        const amb = data.ambassador_profiles;
        if (amb) {
          setBioShort(amb.bio_short || "");
          setBioFull(amb.bio_full || "");
          setOriginCountry(amb.origin_country || "");
          setOriginFlag(amb.origin_flag || "");
          setLanguagesText((amb.languages || []).join(", "));
          setHobbiesText((amb.hobbies || []).join(", "));
          setFavouriteCoursesText((amb.favourite_courses || []).join(", "));
          setClubs(amb.clubs_societies || []);
          setMajors(amb.majors || "");
          setPreviousQualification(amb.previous_qualification || "");
          setProgramme(amb.programme || "");
          setProgrammeType(amb.programme_type || "");
          setAcademicYear(amb.academic_year || "");
          setAvailability(amb.availability_schedule || []);
        }
      })
      .catch(() => toast.error("Failed to load your profile."))
      .finally(() => setLoading(false));
  }, []);

  function availabilityFor(day: AvailabilityDay) {
    return availability.find((e) => e.day === day);
  }

  function updateAvailability(day: AvailabilityDay, field: "start" | "end", value: string) {
    setAvailability((prev) => {
      const existing = prev.find((e) => e.day === day);
      if (existing) {
        return prev.map((e) => (e.day === day ? { ...e, [field]: value || null } : e));
      }
      return [
        ...prev,
        { day, start: field === "start" ? value || null : null, end: field === "end" ? value || null : null },
      ];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { contact_phone: contactPhone || null };

      if (profile?.role === "ambassador") {
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
          availability_schedule: availability,
        };
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save profile.");
      }
      toast.success("Profile saved.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
      </div>
    );
  }

  const isAmbassador = profile.role === "ambassador";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto h-full">
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your photo, contact number, and (if you're an ambassador) the details shown on your directory profile.
        </p>
      </div>

      <div className="p-8 max-w-3xl w-full mx-auto space-y-8">
        {/* Identity */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-6">
          <AvatarUploader
            userId={profile.id}
            currentUrl={avatarUrl}
            initials={getInitials(profile.full_name)}
            onUploaded={setAvatarUrl}
          />
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-bold text-gray-900">{profile.full_name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 capitalize">
              {profile.role} {profile.teams?.name ? `· ${profile.teams.name}` : ""}
              {profile.is_team_leader && " · Team Leader"}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              Name, email, role, and team are managed by your administrator.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Contact</h3>
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs text-gray-600">WhatsApp number</Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. 60123456789"
            />
            <p className="text-[11px] text-gray-400">
              Used for the "Chat with {profile.full_name.split(" ")[0]}" button in the Peer Directory.
            </p>
          </div>
        </section>

        {isAmbassador && (
          <>
            {/* About Me */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">About Me</h3>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Short bio (shown on your directory card)</Label>
                <Textarea value={bioShort} onChange={(e) => setBioShort(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Full bio (shown on your full profile)</Label>
                <Textarea value={bioFull} onChange={(e) => setBioFull(e.target.value)} rows={4} />
              </div>
            </section>

            {/* Origin & Languages */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">In Short</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Country of origin</Label>
                  <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="e.g. Cairo, Egypt" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Languages (comma-separated)</Label>
                  <Input value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} placeholder="English, Arabic" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Flag(s) — tap to add, supports multiple for mixed heritage</Label>
                <FlagPicker value={originFlag} onChange={setOriginFlag} />
              </div>
            </section>

            {/* Academic */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Academic Life</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Area of study / degree</Label>
                  <Input value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. Bachelor of Science (Honours) in Computer Science" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Academic level</Label>
                  <Input value={programmeType} onChange={(e) => setProgrammeType(e.target.value)} placeholder="Undergraduate / Masters / PhD" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Year of study</Label>
                  <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 3rd Year" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Majors / Minors</Label>
                  <Input value={majors} onChange={(e) => setMajors(e.target.value)} placeholder="e.g. BSc Computer Science / Minor in Math" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Previous qualification</Label>
                  <Input value={previousQualification} onChange={(e) => setPreviousQualification(e.target.value)} placeholder="e.g. GCE A-Levels (3 A*s)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Favourite courses (comma-separated)</Label>
                  <Input value={favouriteCoursesText} onChange={(e) => setFavouriteCoursesText(e.target.value)} placeholder="Advanced Algorithms, Databases" />
                </div>
              </div>
            </section>

            {/* Social Life */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Social Life</h3>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Interests / hashtags (comma-separated)</Label>
                <Input value={hobbiesText} onChange={(e) => setHobbiesText(e.target.value)} placeholder="Badminton, Basketball, Fitness" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Clubs & societies</Label>
                {clubs.map((club, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={club.name}
                      onChange={(e) =>
                        setClubs((prev) => prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)))
                      }
                      placeholder="Club name"
                      className="flex-1"
                    />
                    <Input
                      value={club.role || ""}
                      onChange={(e) =>
                        setClubs((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, role: e.target.value || null } : c))
                        )
                      }
                      placeholder="Role (optional)"
                      className="w-40"
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
            </section>

            {/* Weekly Availability */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Weekly Availability</h3>
              <div className="space-y-2">
                {DAY_ORDER.map((day) => {
                  const entry = availabilityFor(day);
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-10 text-xs font-medium text-gray-600 shrink-0">{DAY_LABELS[day]}</span>
                      <Input
                        type="time"
                        value={entry?.start || ""}
                        onChange={(e) => updateAvailability(day, "start", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <Input
                        type="time"
                        value={entry?.end || ""}
                        onChange={(e) => updateAvailability(day, "end", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-[11px] text-gray-400">(leave blank for unavailable)</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
