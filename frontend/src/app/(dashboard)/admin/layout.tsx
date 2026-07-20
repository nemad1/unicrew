"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role !== "admin") {
      router.replace("/access-denied");
    }
  }, [role, router]);

  if (role !== "admin") return null;

  return <>{children}</>;
}
