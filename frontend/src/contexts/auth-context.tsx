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
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/types/roles";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface InternalUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  team_id: string | null;
  is_team_leader: boolean;
  initials: string;
  avatar_url: string | null;
}

interface AuthContextValue {
  /** Supabase Auth user */
  authUser: SupabaseUser | null;
  /** Internal user profile from internal_users table */
  user: InternalUser | null;
  role: Role;
  teamId: string | null;
  isTeamLeader: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [internalUser, setInternalUser] = useState<InternalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the internal_users record for a given auth user ID
  const fetchInternalUser = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("internal_users")
        .select("id, email, full_name, role, team_id, is_team_leader, avatar_url")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.error("Failed to fetch internal user:", error);
        return null;
      }

      // Map DB role 'staff' to frontend role 'counselor'
      const mappedRole = data.role === "staff" ? "counselor" : data.role;

      return {
        ...data,
        role: mappedRole as Role,
        initials: getInitials(data.full_name),
      } as InternalUser;
    },
    [supabase]
  );

  // Bootstrap: check current session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setAuthUser(user);
          const profile = await fetchInternalUser(user.id);
          setInternalUser(profile);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_IN" && session?.user) {
        setAuthUser(session.user);
        const profile = await fetchInternalUser(session.user.id);
        setInternalUser(profile);
      } else if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setInternalUser(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchInternalUser, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setInternalUser(null);
    router.push("/login");
  }, [supabase, router]);

  // Show nothing while loading to prevent flash
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render dashboard children
  // (middleware should redirect, but this is a safety net)
  if (!authUser || !internalUser) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        authUser,
        user: internalUser,
        role: internalUser.role,
        teamId: internalUser.team_id,
        isTeamLeader: internalUser.is_team_leader,
        loading,
        signOut,
      }}
    >
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
