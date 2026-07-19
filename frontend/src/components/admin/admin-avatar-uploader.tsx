"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { cropToSquareBlob, blobToBase64, AVATAR_MAX_SIZE_BYTES, AVATAR_ALLOWED_TYPES } from "@/lib/image";

// Admin uploads a photo on behalf of another user — avatar is admin-managed
// Peer Directory content. Posts to /api/admin/users/:id/avatar (service role,
// bypasses the per-user Storage folder RLS) instead of uploading directly
// from the browser like the self-service AvatarUploader does.
export function AdminAvatarUploader({
  targetUserId,
  currentUrl,
  initials,
  onUploaded,
}: {
  targetUserId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await cropToSquareBlob(file);
      const fileBase64 = await blobToBase64(blob);

      const res = await fetch(`/api/admin/users/${targetUserId}/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar.");

      onUploaded(data.avatar_url);
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-md group shrink-0"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 text-xl font-bold">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </div>
      </button>
      {error && <p className="text-xs text-red-600 text-center max-w-[10rem]">{error}</p>}
    </div>
  );
}
