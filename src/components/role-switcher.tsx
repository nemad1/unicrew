"use client";

import { useAuth } from "@/contexts/auth-context";
import type { Role } from "@/types/roles";

const options: { id: Role; label: string }[] = [
  { id: "admin", label: "Admin" },
  { id: "counselor", label: "Counselor" },
  { id: "ambassador", label: "Ambassador" },
];

export function RoleSwitcher() {
  const { role, setRole } = useAuth();

  return (
    <div className="fixed top-3 right-3 z-50 inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md p-0.5">
      {options.map((opt) => {
        const active = role === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setRole(opt.id)}
            className={
              "text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors " +
              (active
                ? "bg-blue-700 text-white"
                : "text-gray-600 hover:bg-gray-100")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
