"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailEmpty = email.trim() === "";
    const passwordEmpty = password.trim() === "";
    setEmailError(emailEmpty);
    setPasswordError(passwordEmpty);
    if (emailEmpty || passwordEmpty) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Fetch the user's role to determine where to redirect
        const { data: profile } = await supabase
          .from("internal_users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/inbox");
        }
        // Note: router.push + middleware will handle refresh
        router.refresh();
      }
    } catch (err) {
      setAuthError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
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
            Sign in to UniCrew, your student communication dashboard.
          </p>
        </div>

        {authError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs text-gray-600">
              Staff Email
            </Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(false);
                if (authError) setAuthError(null);
              }}
              placeholder="amelia.park@university.edu"
              aria-invalid={emailError}
              disabled={isLoading}
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
                if (authError) setAuthError(null);
              }}
              placeholder="••••••••"
              aria-invalid={passwordError}
              disabled={isLoading}
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
            disabled={isLoading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Contact your administrator for account access. Self-registration is disabled.
        </p>
      </div>
    </div>
  );
}
