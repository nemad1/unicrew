"use client";

import { useState } from "react";
import { Pencil, UserX, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "Active" | "Inactive";

type Counselor = {
  id: string;
  name: string;
  initials: string;
  colour: string;
  email: string;
  status: Status;
  dateAdded: string;
};

type Ambassador = {
  id: string;
  name: string;
  initials: string;
  colour: string;
  email: string;
  status: Status;
  supervisor: string;
};

const counselors: Counselor[] = [
  { id: "c1", name: "Amelia Park",      initials: "AM", colour: "bg-blue-100 text-blue-700",       email: "amelia.park@university.edu",      status: "Active",   dateAdded: "Jan 14, 2026" },
  { id: "c2", name: "Daniel Wright",    initials: "DW", colour: "bg-violet-100 text-violet-700",   email: "daniel.wright@university.edu",    status: "Active",   dateAdded: "Feb 03, 2026" },
  { id: "c3", name: "Priya Nair",       initials: "PN", colour: "bg-emerald-100 text-emerald-700", email: "priya.nair@university.edu",       status: "Inactive", dateAdded: "Mar 21, 2026" },
  { id: "c4", name: "Marco Bianchi",    initials: "MB", colour: "bg-amber-100 text-amber-700",     email: "marco.bianchi@university.edu",    status: "Active",   dateAdded: "Apr 09, 2026" },
];

const ambassadorsList: Ambassador[] = [
  { id: "a1", name: "Adel Zeinab",       initials: "AZ", colour: "bg-blue-100 text-blue-700",       email: "adel.zeinab@university.edu",       status: "Active",   supervisor: "Amelia Park"   },
  { id: "a2", name: "Alyssandra Fong",   initials: "AF", colour: "bg-pink-100 text-pink-700",       email: "alyssandra.fong@university.edu",   status: "Active",   supervisor: "Daniel Wright" },
  { id: "a3", name: "Hana Kobayashi",    initials: "HK", colour: "bg-violet-100 text-violet-700",   email: "hana.kobayashi@university.edu",    status: "Active",   supervisor: "Amelia Park"   },
  { id: "a4", name: "Sara Okonkwo",      initials: "SO", colour: "bg-rose-100 text-rose-700",       email: "sara.okonkwo@university.edu",      status: "Inactive", supervisor: "Marco Bianchi" },
  { id: "a5", name: "Mateus Oliveira",   initials: "MO", colour: "bg-amber-100 text-amber-700",     email: "mateus.oliveira@university.edu",   status: "Active",   supervisor: "Daniel Wright" },
];

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border",
        status === "Active"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-gray-100 text-gray-600 border-gray-200",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "Active" ? "bg-emerald-500" : "bg-gray-400")} />
      {status}
    </span>
  );
}

function NameCell({ name, initials, colour }: { name: string; initials: string; colour: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold", colour)}>
        {initials}
      </div>
      <span className="text-sm text-gray-900">{name}</span>
    </div>
  );
}

function RowActions() {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="Edit">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button className="p-1.5 rounded text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Deactivate">
        <UserX className="w-3.5 h-3.5" />
      </button>
      <button className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function UserManagementPage() {
  const [tab, setTab] = useState<"counselors" | "ambassadors">("counselors");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      {/* Header */}
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-500">Manage Counselors and Student Ambassadors.</p>
        </div>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add New User
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-6 shrink-0">
        {(["counselors", "ambassadors"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "py-3 text-sm border-b-2 -mb-px transition-colors capitalize",
              tab === id
                ? "border-blue-700 text-blue-700 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-900",
            )}
          >
            {id === "counselors" ? "Counselors" : "Ambassadors"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {tab === "counselors" ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">ID / Email</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date Added</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {counselors.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40">
                    <td className="px-5 py-3"><NameCell name={c.name} initials={c.initials} colour={c.colour} /></td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{c.email}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{c.dateAdded}</td>
                    <td className="px-5 py-3"><RowActions /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">ID / Email</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Assigned Supervisor</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ambassadorsList.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40">
                    <td className="px-5 py-3"><NameCell name={a.name} initials={a.initials} colour={a.colour} /></td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{a.email}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 text-gray-700 text-xs">{a.supervisor}</td>
                    <td className="px-5 py-3"><RowActions /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
