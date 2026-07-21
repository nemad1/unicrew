"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The recovery link's `?code=` param is exchanged for a session by the
    // browser client on load; that emits a PASSWORD_RECOVERY event once done.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    // Cover the case where the exchange already completed before this
    // listener was attached.
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    toast.success("Password updated. Please sign in with your new password.");
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50/40 to-white p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Reset Password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a new password for your account.</p>
        </div>

        {checking ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-blue-700 animate-spin" />
          </div>
        ) : !ready ? (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              This reset link is invalid or has expired. Request a new one from the login page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs text-gray-600">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs text-gray-600">
                Confirm new password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={saving}
              />
              <p className="text-[11px] text-gray-400">At least 8 characters.</p>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
