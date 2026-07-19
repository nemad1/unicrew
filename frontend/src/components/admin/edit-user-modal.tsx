"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Team = { id: string; name: string };

type EditableUser = {
  id: string;
  full_name: string;
  role: "admin" | "counselor" | "ambassador";
  team_id: string | null;
  is_team_leader: boolean;
};

interface EditUserModalProps {
  user: EditableUser | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditUserModal({ user, onClose, onUpdated }: EditUserModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"counselor" | "ambassador">("counselor");
  const [teamId, setTeamId] = useState<string>("");
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  // teamId is only set once the teams list has loaded — setting a Select's
  // controlled value before its matching SelectItem exists causes Radix to
  // treat it as unrecognized and reset the value to "" on its own, silently
  // clearing the field even though the user never touched it.
  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setRole(user.role === "admin" ? "counselor" : user.role);
    setIsTeamLeader(user.is_team_leader);
    setError(null);

    fetch("/api/admin/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeams(data);
        setTeamId(user.team_id || "");
      })
      .catch(console.error);
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          role,
          team_id: teamId || null,
          is_team_leader: isTeamLeader,
        }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edit User</h2>
              <p className="text-xs text-gray-500">Update role, team, and leadership status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-user-name" className="text-xs text-gray-600">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-user-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
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
              {/* Mounting the Select before `teams` has loaded lets Radix see
                  a `value` with no matching SelectItem yet (SelectContent's
                  items don't exist until then) and it silently resets the
                  value to "" to "self-correct" — wiping a real team
                  assignment on save even though the user never touched this
                  field. Waiting for teams to load before this ever mounts
                  avoids that entirely. */}
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
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
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
