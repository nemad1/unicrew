import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Admin-only API: Create a new user or list all users
// Uses the Supabase Service Role key for admin.createUser()

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify the caller is an admin
async function verifyAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("internal_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

// GET: List all users (admin/staff accessible)
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS for listing all users
  const admin = getAdminClient();

  const { data: users, error } = await admin
    .from("internal_users")
    .select(
      `
      id,
      email,
      full_name,
      role,
      team_id,
      is_team_leader,
      is_active,
      created_at,
      contact_phone,
      avatar_url,
      teams!team_id (
        id,
        name
      ),
      ambassador_profiles (
        programme,
        programme_type,
        academic_year,
        majors,
        previous_qualification,
        favourite_courses,
        languages,
        origin_country,
        origin_flag,
        bio_short,
        bio_full,
        hobbies,
        clubs_societies,
        availability_schedule
      )
    `
    )
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users);
}

// POST: Create a new user (admin only)
export async function POST(request: Request) {
  const caller = await verifyAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, full_name, role, team_id, is_team_leader } = body;

  // Validate required fields
  if (!email || !password || !full_name || !role) {
    return NextResponse.json(
      { error: "Missing required fields: email, password, full_name, role" },
      { status: 400 }
    );
  }

  if (!["counselor", "ambassador"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be 'counselor' or 'ambassador'" },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can log in immediately
      user_metadata: { full_name, role },
    });

  if (authError) {
    return NextResponse.json(
      { error: `Auth error: ${authError.message}` },
      { status: 400 }
    );
  }

  const newUserId = authData.user.id;

  // 2. Insert into internal_users
  const { error: profileError } = await adminClient
    .from("internal_users")
    .insert({
      id: newUserId,
      email,
      full_name,
      role,
      team_id: team_id || null,
      is_team_leader: is_team_leader || false,
    });

  if (profileError) {
    // Rollback: delete the auth user if internal_users insert fails
    await adminClient.auth.admin.deleteUser(newUserId);
    return NextResponse.json(
      { error: `Profile error: ${profileError.message}` },
      { status: 500 }
    );
  }

  // 3. If ambassador, create ambassador_profiles record
  if (role === "ambassador") {
    await adminClient.from("ambassador_profiles").insert({
      user_id: newUserId,
    });
  }

  return NextResponse.json(
    {
      success: true,
      user: {
        id: newUserId,
        email,
        full_name,
        role,
        team_id,
        is_team_leader,
      },
    },
    { status: 201 }
  );
}
