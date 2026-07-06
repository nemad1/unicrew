"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/roles";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("counselor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailEmpty = email.trim() === "";
    const passwordEmpty = password.trim() === "";
    setEmailError(emailEmpty);
    setPasswordError(passwordEmpty);
    if (emailEmpty || passwordEmpty) return;

    // Store chosen role in sessionStorage for the AuthProvider to pick up.
    // Will be replaced by real Supabase auth later.
    sessionStorage.setItem("campuscrm_role", role);
    sessionStorage.setItem("campuscrm_authed", "true");
    router.push("/inbox");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50/40 to-white p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to CampusCRM, your student communication dashboard.
          </p>
        </div>

        <Tabs
          value={role}
          onValueChange={(v) => setRole(v as Role)}
          className="mt-6"
        >
          <TabsList className="w-full grid grid-cols-3 bg-gray-100 p-1 rounded-md">
            <TabsTrigger
              value="admin"
              className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 rounded"
            >
              Admin
            </TabsTrigger>
            <TabsTrigger
              value="counselor"
              className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 rounded"
            >
              Counselor
            </TabsTrigger>
            <TabsTrigger
              value="ambassador"
              className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 rounded"
            >
              Ambassador
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs text-gray-600">
              Staff Email / ID
            </Label>
            <Input
              id="login-email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(false);
              }}
              placeholder="amelia.park@university.edu"
              aria-invalid={emailError}
              className={cn(
                "bg-white border-gray-200",
                emailError && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            {emailError && (
              <p className="text-xs text-red-500">This field is required</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs text-gray-600">
                Password
              </Label>
              <button
                type="button"
                onClick={() => setShowReset((s) => !s)}
                className="text-xs text-blue-700 hover:text-blue-800"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(false);
              }}
              placeholder="••••••••"
              aria-invalid={passwordError}
              className={cn(
                "bg-white border-gray-200",
                passwordError && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            {passwordError && (
              <p className="text-xs text-red-500">This field is required</p>
            )}
            {showReset && (
              <p className="mt-1 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md p-2.5">
                Please contact IT Support at{" "}
                <a
                  href="mailto:itsupport@university.edu"
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  itsupport@university.edu
                </a>{" "}
                to reset your password.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Secure Single Sign-On (SSO) enabled. Contact IT Support for access issues.
        </p>
      </div>
    </div>
  );
}
