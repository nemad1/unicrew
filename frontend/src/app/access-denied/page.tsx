"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function AccessDeniedPage() {
  const router = useRouter();
  const { role, signOut } = useAuth();

  const roleName =
    role === "ambassador" ? "Student Ambassador" : 
    role === "admin" ? "System Administrator" : 
    "Counselor";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center bg-amber-50 p-4 rounded-full">
          <ShieldAlert className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-1 text-sm text-gray-500">
          Error 403: Insufficient Role Permissions
        </p>

        <div className="mt-5 bg-gray-50/60 border border-gray-200/70 rounded-md p-4 text-sm text-left text-gray-700 leading-relaxed">
          You are currently logged in as a{" "}
          <span className="font-medium text-gray-900">{roleName}</span>. The page
          you are trying to access requires different or higher-level permissions.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={() => router.push("/inbox")}
            className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white"
          >
            Return to Dashboard
          </Button>
          <Button
            onClick={signOut}
            variant="outline"
            className="w-full sm:w-auto border-gray-200 text-gray-700"
          >
            Switch Account
          </Button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Session ID: rbac_auth_7892 • Contact IT if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}
