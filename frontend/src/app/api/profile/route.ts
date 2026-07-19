import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Both GET and PUT use the cookie-authenticated (RLS-respecting) client, not
// the service role — self-profile writes are scoped by the users_self_update
// / profiles_ambassador_update RLS policies plus column-level GRANTs
// (006_profile_avatar_contact.sql), so a bug here can't widen what a user
// can touch beyond their own contact_phone/avatar_url/ambassador_profiles.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("internal_users")
    .select(
      `
      id, full_name, email, role, team_id, is_team_leader, contact_phone, avatar_url,
      teams ( name ),
      ambassador_profiles (
        programme, programme_type, academic_year, majors, previous_qualification,
        favourite_courses, languages, origin_country, origin_flag, bio_short, bio_full,
        hobbies, clubs_societies, availability_schedule
      )
    `
    )
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!caller) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const body = await request.json();

  const userUpdates: Record<string, unknown> = {};
  if (body.contact_phone !== undefined) userUpdates.contact_phone = body.contact_phone || null;
  if (body.avatar_url !== undefined) userUpdates.avatar_url = body.avatar_url || null;

  if (Object.keys(userUpdates).length > 0) {
    const { error } = await supabase.from("internal_users").update(userUpdates).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (caller.role === "ambassador" && body.ambassador_profile) {
    const allowedFields = [
      "programme",
      "programme_type",
      "academic_year",
      "majors",
      "previous_qualification",
      "favourite_courses",
      "languages",
      "origin_country",
      "origin_flag",
      "bio_short",
      "bio_full",
      "hobbies",
      "clubs_societies",
      "availability_schedule",
    ];
    const profileUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body.ambassador_profile[field] !== undefined) {
        profileUpdates[field] = body.ambassador_profile[field];
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("ambassador_profiles")
        .update(profileUpdates)
        .eq("user_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
