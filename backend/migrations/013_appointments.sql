-- ============================================================
-- 013_appointments.sql
-- Backs the Schedule Consultation/Appointment calendar with real
-- persistence. Previously events lived only in
-- useState<CalEvent[]>(initialEvents) on the calendar page
-- (frontend/src/app/(dashboard)/calendar/page.tsx) and reset on
-- every reload; nothing was ever read from or written to the DB.
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    context TEXT,
    tone TEXT NOT NULL DEFAULT 'blue' CHECK (tone IN ('amber', 'blue', 'green')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES internal_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- =========================
-- RLS + grants
-- Writes go through Next.js API routes (/api/appointments) on the
-- service role key (bypasses RLS), matching the existing
-- /api/admin/* and /api/routing-rules convention. RLS here is
-- defense-in-depth for direct client-side reads.
--
-- Note: supabase-schema.sql:2 declares the user_role enum as
-- 'admin' | 'staff' | 'ambassador', but the live enum actually
-- accepts 'counselor' (see e.g. frontend/src/app/api/admin/users/
-- route.ts, which inserts role: 'counselor', and the pre-existing
-- RLS policies in 001_auth_rls_migration.sql, which all compare
-- get_my_role() = 'counselor') — the CREATE TYPE line in
-- supabase-schema.sql is stale relative to the deployed database.
-- This migration follows the live, proven convention ('counselor'),
-- not the stale schema file.
-- =========================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;

DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR get_my_role() = 'admin'
    OR (
      get_my_role() = 'counselor'
      AND created_by IN (
        SELECT id FROM internal_users WHERE team_id = get_my_team_id()
      )
    )
  );

DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR get_my_role() = 'admin');

DROP POLICY IF EXISTS appointments_delete ON appointments;
CREATE POLICY appointments_delete ON appointments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR get_my_role() = 'admin');
