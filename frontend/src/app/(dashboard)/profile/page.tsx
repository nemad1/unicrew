"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { HashtagList } from "@/components/peers/HashtagList";
import { ClubsSocietiesList } from "@/components/peers/ClubsSocietiesList";
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

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-400">Not set</span>}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [contactPhone, setContactPhone] = useState("");
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setAvatarUrl(data.avatar_url || null);
        setContactPhone(data.contact_phone || "");
        setAvailability(data.ambassador_profiles?.availability_schedule || []);
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
      const body: Record<string, unknown> =
        profile?.role === "ambassador"
          ? { ambassador_profile: { availability_schedule: availability } }
          : { contact_phone: contactPhone || null };

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
  const amb = profile.ambassador_profiles;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto h-full">
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAmbassador
            ? "Your Peer Directory profile is managed by your administrator — set your weekly availability below."
            : "Manage your photo and contact number."}
        </p>
      </div>

      <div className="p-8 max-w-3xl w-full mx-auto space-y-8">
        {/* Identity */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-6">
          {isAmbassador ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 text-2xl font-bold">
                  {getInitials(profile.full_name)}
                </div>
              )}
            </div>
          ) : (
            <AvatarUploader
              userId={profile.id}
              currentUrl={avatarUrl}
              initials={getInitials(profile.full_name)}
              onUploaded={setAvatarUrl}
            />
          )}
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-bold text-gray-900">{profile.full_name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 capitalize">
              {profile.role} {profile.teams?.name ? `· ${profile.teams.name}` : ""}
              {profile.is_team_leader && " · Team Leader"}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              {isAmbassador
                ? "Name, email, role, team, photo, and directory profile are managed by your administrator."
                : "Name, email, role, and team are managed by your administrator."}
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Contact</h3>
          {isAmbassador ? (
            <ReadOnlyField label="WhatsApp number" value={profile.contact_phone} />
          ) : (
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
          )}
        </section>

        {isAmbassador && (
          <>
            {/* About Me */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">About Me</h3>
              <ReadOnlyField label="Short bio (card preview)" value={amb?.bio_short} />
              <ReadOnlyField label="Full bio" value={amb?.bio_full} />
            </section>

            {/* Origin & Languages */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">In Short</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadOnlyField
                  label="Country of origin"
                  value={amb?.origin_country ? `${amb.origin_flag || ""} ${amb.origin_country}`.trim() : null}
                />
                <ReadOnlyField label="Languages" value={(amb?.languages || []).join(", ") || null} />
              </div>
            </section>

            {/* Academic */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Academic Life</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadOnlyField label="Area of study / degree" value={amb?.programme} />
                <ReadOnlyField label="Academic level" value={amb?.programme_type} />
                <ReadOnlyField label="Year of study" value={amb?.academic_year} />
                <ReadOnlyField label="Majors / Minors" value={amb?.majors} />
                <ReadOnlyField label="Previous qualification" value={amb?.previous_qualification} />
                <ReadOnlyField label="Favourite courses" value={(amb?.favourite_courses || []).join(", ") || null} />
              </div>
            </section>

            {/* Social Life */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Social Life</h3>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Interests</p>
                {amb?.hobbies && amb.hobbies.length > 0 ? (
                  <HashtagList tags={amb.hobbies} />
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Clubs & societies</p>
                {amb?.clubs_societies && amb.clubs_societies.length > 0 ? (
                  <ClubsSocietiesList clubs={amb.clubs_societies} />
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
            </section>

            {/* Weekly Availability */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Weekly Availability</h3>
              <p className="text-xs text-gray-400 -mt-2">This is the one thing you set yourself.</p>
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
