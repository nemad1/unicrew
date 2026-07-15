-- ============================================================
-- 002_seed_admin_user.sql
-- Seeds the first admin user into the system
-- Run this AFTER 001_auth_rls_migration.sql
--
-- IMPORTANT: You must first create this user in Supabase Auth.
-- Go to Supabase Dashboard → Authentication → Users → "Add user"
-- Email: admin@unicrew.io
-- Password: UniCrew@Admin2026
-- Then get the user's UUID from the dashboard and replace below.
-- ============================================================

-- 1. Create a default team for administrators
INSERT INTO teams (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Administration')
ON CONFLICT (id) DO NOTHING;

-- 2. Create sample teams
INSERT INTO teams (id, name)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Admissions - Asia Pacific'),
  ('00000000-0000-0000-0000-000000000003', 'Admissions - EMEA'),
  ('00000000-0000-0000-0000-000000000004', 'Admissions - Americas')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert admin user into internal_users
-- REPLACE 'YOUR_ADMIN_AUTH_UUID' with the actual UUID from Supabase Auth dashboard
-- after you create the user there.
--
-- To create the admin via Supabase SQL (if you have access to auth schema):
-- 
-- INSERT INTO auth.users (
--   id, instance_id, email, encrypted_password, email_confirmed_at,
--   raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
-- ) VALUES (
--   gen_random_uuid(),
--   '00000000-0000-0000-0000-000000000000',
--   'admin@unicrew.io',
--   crypt('UniCrew@Admin2026', gen_salt('bf')),
--   NOW(),
--   '{"provider":"email","providers":["email"]}',
--   '{"full_name":"System Admin","role":"admin"}',
--   'authenticated',
--   'authenticated',
--   NOW(),
--   NOW()
-- );

-- After you have the admin UUID, run:
-- INSERT INTO internal_users (id, email, full_name, role, team_id, is_team_leader)
-- VALUES (
--   'YOUR_ADMIN_AUTH_UUID',
--   'admin@unicrew.io',
--   'System Administrator',
--   'admin',
--   '00000000-0000-0000-0000-000000000001',
--   true
-- );
