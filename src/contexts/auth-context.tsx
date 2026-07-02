"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/types/roles";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  jobTitle: string;
}

interface AuthContextValue {
  user: User;
  role: Role;
  setRole: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Mock users for each role — will be replaced by real Supabase Auth.
const MOCK_USERS: Record<Role, User> = {
  counselor: {
    id: "mock-counselor-1",
    name: "Amelia Park",
    email: "amelia.park@campuscrm.io",
    role: "counselor",
    initials: "AM",
    jobTitle: "Admissions Lead",
  },
  ambassador: {
    id: "mock-ambassador-1",
    name: "Jordan Lee",
    email: "jordan.lee@campuscrm.io",
    role: "ambassador",
    initials: "JL",
    jobTitle: "Student Ambassador",
  },
  admin: {
    id: "mock-admin-1",
    name: "Sarah Chen",
    email: "sarah.chen@campuscrm.io",
    role: "admin",
    initials: "SC",
    jobTitle: "System Administrator",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("counselor");

  const user = MOCK_USERS[role];

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
  }, []);

  const signOut = useCallback(() => {
    // For now, just reset to counselor — will redirect to /login with Supabase.
    setRoleState("counselor");
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, setRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
