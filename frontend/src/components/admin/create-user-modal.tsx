"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
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

type Team = {
  id: string;
  name: string;
};

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"counselor" | "ambassador">("counselor");
  const [teamId, setTeamId] = useState<string>("");
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  // Fetch teams on mount
  useEffect(() => {
    if (open) {
      fetch("/api/admin/teams")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTeams(data);
        })
        .catch(console.error);
    }
  }, [open]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("counselor");
    setTeamId("");
    setIsTeamLeader(false);
    setError(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
          team_id: teamId || null,
          is_team_leader: isTeamLeader,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user.");
        setLoading(false);
        return;
      }

      onCreated();
      handleClose();
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create New User</h2>
              <p className="text-xs text-gray-500">Add a counselor or ambassador to the platform</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="user-name" className="text-xs text-gray-600">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="user-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Amelia Park"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs text-gray-600">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. amelia.park@university.edu"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="user-password" className="text-xs text-gray-600">
              Temporary Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Share this password with the user out-of-band. They should change it after first login.
            </p>
          </div>

          {/* Role & Team — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "counselor" | "ambassador")}
                disabled={loading}
              >
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
              <Select
                value={teamId}
                onValueChange={setTeamId}
                disabled={loading}
              >
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
            </div>
          </div>

          {/* Team Leader Toggle */}
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
            <div>
              <span className="text-sm text-gray-700">Team Leader</span>
              <p className="text-[11px] text-gray-400">
                Grants elevated oversight of the team&apos;s conversations
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="border-gray-200"
          >
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
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Create User
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
