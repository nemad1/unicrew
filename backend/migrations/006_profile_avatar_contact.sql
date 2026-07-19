-- ============================================================
-- 006_profile_avatar_contact.sql
-- Self-service profile: avatar photo, personal WhatsApp contact
-- number ("Chat with [Name]" deep link), account deactivation, and
-- a security tightening of ambassador self-update (rating must stay
-- computed-only, not self-editable).
-- ============================================================

-- =========================
-- 1. internal_users: new columns
-- =========================

ALTER TABLE internal_users
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- =========================
-- 2. internal_users: self-service update (own row only), restricted by
--    column-level GRANT to contact_phone/avatar_url — the RLS USING/WITH
--    CHECK clause is row-scoped, not column-scoped, so without the GRANT
--    restriction a self-update policy would let a user rewrite their own
--    role/team_id/is_active. Admin writes still go through the service
--    role key (bypasses RLS and grants entirely), so this doesn't affect
--    /api/admin/users.
-- =========================

DROP POLICY IF EXISTS users_self_update ON internal_users;
CREATE POLICY users_self_update ON internal_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

REVOKE UPDATE ON internal_users FROM authenticated;
GRANT UPDATE (contact_phone, avatar_url) ON internal_users TO authenticated;

-- =========================
-- 3. ambassador_profiles: tighten self-update column grant
-- =========================
-- profiles_ambassador_update (001_auth_rls_migration.sql) already lets an
-- ambassador update any column of their own row. `rating` is now a
-- computed average maintained by the ambassador_feedback trigger
-- (004_ambassador_directory_enhancement.sql) — without this grant
-- restriction, an ambassador could directly overwrite their own rating.

REVOKE UPDATE ON ambassador_profiles FROM authenticated;
GRANT UPDATE (
  avatar_colour, programme, programme_type, academic_year, majors,
  previous_qualification, favourite_courses, languages, origin_country,
  origin_flag, bio_short, bio_full, hobbies, clubs_societies, is_online,
  availability_schedule
) ON ambassador_profiles TO authenticated;

-- =========================
-- 4. Storage: avatars bucket
-- =========================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_select ON storage.objects;
CREATE POLICY avatars_public_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Objects are stored at avatars/<user_id>/<filename> — these policies
-- restrict writes to the caller's own uid-prefixed folder.
DROP POLICY IF EXISTS avatars_own_insert ON storage.objects;
CREATE POLICY avatars_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_own_update ON storage.objects;
CREATE POLICY avatars_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_own_delete ON storage.objects;
CREATE POLICY avatars_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
