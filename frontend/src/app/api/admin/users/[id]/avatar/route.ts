import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = getAdminClient();
  const { data: profile } = await adminClient
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

// POST: Admin uploads a photo on behalf of another user (avatar is
// admin-managed Peer Directory content). The image is already cropped to a
// square JPEG client-side; this route just needs to bypass the per-user
// Storage folder RLS (which only lets a user write their own folder) since
// the caller here isn't the account owner.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { fileBase64 } = await request.json();
  if (!fileBase64) {
    return NextResponse.json({ error: "Missing fileBase64" }, { status: 400 });
  }

  const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ error: "Invalid base64 image" }, { status: 400 });
  }
  const buffer = Buffer.from(matches[2], "base64");

  const adminClient = getAdminClient();
  const path = `${id}/${Date.now()}.jpg`;

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = adminClient.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await adminClient
    .from("internal_users")
    .update({ avatar_url: avatarUrl })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, avatar_url: avatarUrl });
}
