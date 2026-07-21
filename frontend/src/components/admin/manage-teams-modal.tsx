"use client";

import { useState } from "react";
import { X, Loader2, Pencil, Trash2, Plus, Check, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  accent_color: string | null;
  lead: { id: string; full_name: string } | null;
};

interface ManageTeamsModalProps {
  open: boolean;
  onClose: () => void;
  teams: Team[];
  memberCounts: Record<string, number>;
  onChanged: () => void;
}

const DEFAULT_COLOR = "#1d4ed8";

export function ManageTeamsModal({ open, onClose, teams, memberCounts, onChanged }: ManageTeamsModalProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  const startEdit = (team: Team) => {
    setError(null);
    setEditingId(team.id);
    setEditName(team.name);
    setEditColor(team.accent_color || DEFAULT_COLOR);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), accent_color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create team.");
        return;
      }
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      onChanged();
    } catch {
      setError("Failed to create team.");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), accent_color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update team.");
        return;
      }
      setEditingId(null);
      onChanged();
    } catch {
      setError("Failed to update team.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    const count = memberCounts[team.id] || 0;
    const warning =
      count > 0
        ? `Delete "${team.name}"? ${count} member${count !== 1 ? "s" : ""} will be unassigned from this team.`
        : `Delete "${team.name}"?`;
    if (!confirm(warning)) return;

    setError(null);
    setDeletingId(team.id);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete team.");
        return;
      }
      onChanged();
    } catch {
      setError("Failed to delete team.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users2 className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Manage Teams</h2>
              <p className="text-xs text-gray-500">Create, rename, or delete teams.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* New team form */}
          <div className="flex items-end gap-2 pb-4 border-b border-gray-100">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-gray-600">New team name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Engineering Outreach"
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Color</Label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                disabled={creating}
                className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer p-0.5"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="bg-blue-700 hover:bg-blue-800 text-white h-9"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Existing teams */}
          <div className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No teams yet.</p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white"
                >
                  {editingId === team.id ? (
                    <>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        disabled={saving}
                        className="h-8 w-8 rounded-md border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={saving}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(team.id);
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(team.id)}
                        disabled={saving}
                        className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Save"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.accent_color || "#9ca3af" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{team.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {memberCounts[team.id] || 0} member{(memberCounts[team.id] || 0) !== 1 ? "s" : ""}
                          {team.lead && ` · Lead: ${team.lead.full_name}`}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(team)}
                        className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        title="Rename / recolor"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(team)}
                        disabled={deletingId === team.id}
                        className={cn(
                          "p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        )}
                        title="Delete"
                      >
                        {deletingId === team.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-gray-200">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
