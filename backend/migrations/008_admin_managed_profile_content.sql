-- ============================================================
-- 008_admin_managed_profile_content.sql
-- Policy change: everything shown in the Peer Directory is admin-filled
-- (avatar, contact number, bio, academic info, languages, hobbies,
-- clubs, favourite courses, origin/flag) — the ONE thing an ambassador
-- still self-manages is their weekly availability schedule (plus
-- is_online, a live presence toggle, not curated content).
-- ============================================================

-- =========================
-- 1. ambassador_profiles: narrow the self-update column grant down to
--    availability_schedule + is_online. Everything else now goes through
--    the admin PATCH endpoint (service role, bypasses this entirely).
-- =========================

REVOKE UPDATE ON ambassador_profiles FROM authenticated;
GRANT UPDATE (availability_schedule, is_online) ON ambassador_profiles TO authenticated;

-- =========================
-- 2. internal_users: ambassadors can no longer self-update contact_phone
--    or avatar_url — only admin/counselor can touch their own row via this
--    policy now. (Admins already write these for ambassadors through the
--    service-role client in /api/admin/users, which bypasses RLS.)
-- =========================

DROP POLICY IF EXISTS users_self_update ON internal_users;
CREATE POLICY users_self_update ON internal_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND get_my_role() <> 'ambassador')
  WITH CHECK (id = auth.uid() AND get_my_role() <> 'ambassador');
