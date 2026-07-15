"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, UserX, Trash2, Plus, Loader2, Crown, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateUserModal } from "@/components/admin/create-user-modal";

type InternalUser = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "counselor" | "ambassador";
  team_id: string | null;
  is_team_leader: boolean;
  created_at: string;
  teams: { id: string; name: string } | null;
};

function StatusBadge({ role }: { role: string }) {
  const styles = {
    admin: "bg-slate-100 text-slate-700 border-slate-200",
    counselor: "bg-blue-50 text-blue-700 border-blue-200",
    ambassador: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const labels = {
    admin: "Admin",
    counselor: "Counselor",
    ambassador: "Ambassador",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border capitalize",
        styles[role as keyof typeof styles] || styles.ambassador
      )}
    >
      {role === "admin" && <Shield className="w-3 h-3" />}
      {labels[role as keyof typeof labels] || role}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColour(index: number): string {
  const colours = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
  ];
  return colours[index % colours.length];
}

function NameCell({
  name,
  colour,
  isLeader,
}: {
  name: string;
  colour: string;
  isLeader: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold relative",
          colour
        )}
      >
        {getInitials(name)}
        {isLeader && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <Crown className="w-2.5 h-2.5 text-amber-900" />
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-gray-900">{name}</span>
        {isLeader && (
          <span className="text-[10px] text-amber-600 font-medium">Team Leader</span>
        )}
      </div>
    </div>
  );
}

function RowActions({
  userId,
  onDelete,
  isDeleting,
}: {
  userId: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        title="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        className="p-1.5 rounded text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
        title="Deactivate"
      >
        <UserX className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(userId)}
        disabled={isDeleting}
        className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Remove"
      >
        {isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

export default function UserManagementPage() {
  const [tab, setTab] = useState<"all" | "counselors" | "ambassadors">("all");
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    setDeletingId(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      alert("Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  // Group users by team
  const groupByTeam = (userList: InternalUser[]) => {
    const groups: Record<string, { teamName: string; members: InternalUser[] }> = {};

    userList.forEach((u) => {
      const key = u.team_id || "unassigned";
      const teamName = u.teams?.name || "No Team Assigned";
      if (!groups[key]) {
        groups[key] = { teamName, members: [] };
      }
      groups[key].members.push(u);
    });

    // Sort each team's members: leaders first, then alphabetical
    Object.values(groups).forEach((g) => {
      g.members.sort((a, b) => {
        if (a.is_team_leader && !b.is_team_leader) return -1;
        if (!a.is_team_leader && b.is_team_leader) return 1;
        return a.full_name.localeCompare(b.full_name);
      });
    });

    return groups;
  };

  const filteredUsers =
    tab === "counselors"
      ? users.filter((u) => u.role === "counselor")
      : tab === "ambassadors"
        ? users.filter((u) => u.role === "ambassador")
        : users;

  const teamGroups = groupByTeam(filteredUsers);

  const counselorCount = users.filter((u) => u.role === "counselor").length;
  const ambassadorCount = users.filter((u) => u.role === "ambassador").length;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      {/* Header */}
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-500">
            Manage Counselors and Student Ambassadors.
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add New User
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-6 shrink-0">
        {(
          [
            { id: "all", label: `All Users (${users.length})` },
            { id: "counselors", label: `Counselors (${counselorCount})` },
            { id: "ambassadors", label: `Ambassadors (${ambassadorCount})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "py-3 text-sm border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-blue-700 text-blue-700 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No users found.</p>
            <p className="text-xs mt-1">Click "Add New User" to create one.</p>
          </div>
        ) : (
          Object.entries(teamGroups).map(([teamKey, group], gi) => (
            <div key={teamKey}>
              {/* Team Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">{group.teamName}</h3>
                <span className="text-xs text-gray-400">
                  ({group.members.length} member{group.members.length !== 1 ? "s" : ""})
                </span>
              </div>

              {/* Team Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                      <th className="px-5 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((u, ui) => (
                      <tr
                        key={u.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40"
                      >
                        <td className="px-5 py-3">
                          <NameCell
                            name={u.full_name}
                            colour={getAvatarColour(gi * 10 + ui)}
                            isLeader={u.is_team_leader}
                          />
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{u.email}</td>
                        <td className="px-5 py-3">
                          <StatusBadge role={u.role} />
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {u.role !== "admin" ? (
                            <RowActions
                              userId={u.id}
                              onDelete={handleDelete}
                              isDeleting={deletingId === u.id}
                            />
                          ) : (
                            <span className="text-xs text-gray-400 text-right block">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateUserModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchUsers}
      />
    </div>
  );
}
