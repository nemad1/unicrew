"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
  authed: boolean;
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
  const router = useRouter();
  const [role, setRoleState] = useState<Role>("counselor");
  const [authed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // On mount, read auth state from sessionStorage
  useEffect(() => {
    const storedAuthed = sessionStorage.getItem("campuscrm_authed");
    const storedRole = sessionStorage.getItem("campuscrm_role") as Role | null;

    if (storedAuthed === "true" && storedRole) {
      setRoleState(storedRole);
      setAuthed(true);
    } else {
      // Not authenticated — redirect to login
      router.replace("/login");
    }
    setHydrated(true);
  }, [router]);

  const user = MOCK_USERS[role];

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    sessionStorage.setItem("campuscrm_role", newRole);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("campuscrm_authed");
    sessionStorage.removeItem("campuscrm_role");
    setAuthed(false);
    router.push("/login");
  }, [router]);

  // Don't render children until we've checked auth state to avoid flash
  if (!hydrated) {
    return null;
  }

  if (!authed) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, role, authed, setRole, signOut }}>
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
