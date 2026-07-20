-- ============================================================
-- 001_auth_rls_migration.sql
-- Renames enum 'counselor' -> 'counselor', adds assigned_to & team_id
-- on contacts, enables RLS, creates policies
-- ============================================================

-- =========================
-- 1. RENAME ENUM VALUE
-- =========================

-- Enum 'staff' was already renamed to 'counselor' in a previous run.
-- ALTER TYPE user_role RENAME VALUE 'staff' TO 'counselor';

-- =========================
-- 2. SCHEMA ADDITIONS
-- =========================

-- Add assigned_to: which specific user is handling this contact (set by counselor)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES internal_users(id) ON DELETE SET NULL;

-- Add team_id: which team owns this contact (set when first saved from a WhatsApp session)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_team_id ON contacts(team_id);

-- =========================
-- 3. HELPER FUNCTIONS
-- =========================

-- Returns the authenticated user's role from internal_users
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM internal_users WHERE id = auth.uid();
$$;

-- Returns the authenticated user's team_id from internal_users
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM internal_users WHERE id = auth.uid();
$$;

-- Returns all user IDs in the same team as the authenticated user
CREATE OR REPLACE FUNCTION get_my_team_member_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM internal_users WHERE team_id = get_my_team_id();
$$;

-- =========================
-- 4. ENABLE RLS
-- =========================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassador_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- 5. RLS POLICIES — contacts
-- =========================
-- Visibility:
--   Admin: sees all contacts (unrestricted)
--   Counselor: sees contacts where team_id matches their team
--   Ambassador: sees contacts where assigned_to = themselves

-- Admin: unrestricted read
CREATE POLICY contacts_admin_select ON contacts
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: can see contacts belonging to their team
CREATE POLICY contacts_counselor_select ON contacts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND team_id = get_my_team_id()
  );

-- Ambassador: can only see contacts assigned to themselves
CREATE POLICY contacts_ambassador_select ON contacts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND assigned_to = auth.uid()
  );

-- Admin: full write
CREATE POLICY contacts_admin_insert ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY contacts_admin_update ON contacts
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY contacts_admin_delete ON contacts
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: can insert and update contacts in their team
CREATE POLICY contacts_counselor_insert ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'counselor');

CREATE POLICY contacts_counselor_update ON contacts
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND team_id = get_my_team_id()
  );

-- =========================
-- 6. RLS POLICIES — interaction_logs
-- =========================
-- Follows contact visibility: if you can see the contact, you can see its logs

-- Admin: unrestricted read
CREATE POLICY logs_admin_select ON interaction_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: see logs for contacts in their team
CREATE POLICY logs_counselor_select ON interaction_logs
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND contact_id IN (
      SELECT id FROM contacts WHERE team_id = get_my_team_id()
    )
  );

-- Ambassador: see logs for contacts assigned to them
CREATE POLICY logs_ambassador_select ON interaction_logs
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND contact_id IN (
      SELECT id FROM contacts WHERE assigned_to = auth.uid()
    )
  );

-- All authenticated users can insert logs (for sending messages)
CREATE POLICY logs_authenticated_insert ON interaction_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =========================
-- 7. RLS POLICIES — kanban_cards
-- =========================

-- Admin: full access
CREATE POLICY cards_admin_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY cards_admin_all ON kanban_cards
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: see cards for contacts in their team
CREATE POLICY cards_counselor_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND (
      assignee_id = auth.uid()
      OR assignee_id IN (SELECT get_my_team_member_ids())
    )
  );

-- Counselor: can update cards they can see
CREATE POLICY cards_counselor_update ON kanban_cards
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND (
      assignee_id = auth.uid()
      OR assignee_id IN (SELECT get_my_team_member_ids())
    )
  );

-- Ambassador: only their own cards
CREATE POLICY cards_ambassador_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND assignee_id = auth.uid()
  );

CREATE POLICY cards_ambassador_update ON kanban_cards
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND assignee_id = auth.uid()
  );

-- =========================
-- 8. RLS POLICIES — kanban_boards & kanban_stages
-- =========================

-- Everyone can read boards and stages (structural data)
CREATE POLICY boards_authenticated_select ON kanban_boards
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY stages_authenticated_select ON kanban_stages
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify boards/stages
CREATE POLICY boards_admin_all ON kanban_boards
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY stages_admin_all ON kanban_stages
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- =========================
-- 9. RLS POLICIES — internal_users
-- =========================

-- Drop existing policies to safely re-run
DROP POLICY IF EXISTS users_admin_all ON internal_users;
DROP POLICY IF EXISTS users_counselor_select ON internal_users;
DROP POLICY IF EXISTS users_ambassador_select ON internal_users;
DROP POLICY IF EXISTS users_select_self ON internal_users;

-- Allow users to see their own record (Crucial for initial login fetch!)
CREATE POLICY users_select_self ON internal_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin: full access
CREATE POLICY users_admin_all ON internal_users
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: can see all users in their team + themselves
CREATE POLICY users_counselor_select ON internal_users
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND (
      id = auth.uid()
      OR team_id = get_my_team_id()
    )
  );

-- Ambassador: can see themselves + other ambassadors in their team (peer directory)
CREATE POLICY users_ambassador_select ON internal_users
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND (
      id = auth.uid()
      OR (team_id = get_my_team_id() AND role = 'ambassador')
    )
  );

-- =========================
-- 10. RLS POLICIES — teams
-- =========================

-- All authenticated users can see teams
CREATE POLICY teams_authenticated_select ON teams
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify teams
CREATE POLICY teams_admin_all ON teams
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- =========================
-- 11. RLS POLICIES — ambassador_profiles
-- =========================

-- All authenticated users can view ambassador profiles
CREATE POLICY profiles_authenticated_select ON ambassador_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Ambassadors can update their own profile
CREATE POLICY profiles_ambassador_update ON ambassador_profiles
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND user_id = auth.uid()
  );

-- Admin can manage all profiles
CREATE POLICY profiles_admin_all ON ambassador_profiles
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- =========================
-- 12. RLS POLICIES — contact_notes
-- =========================

-- Admin: full access
CREATE POLICY notes_admin_all ON contact_notes
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Counselor: see notes for contacts in their team
CREATE POLICY notes_counselor_select ON contact_notes
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND contact_id IN (
      SELECT id FROM contacts WHERE team_id = get_my_team_id()
    )
  );

-- Counselor: can create notes
CREATE POLICY notes_counselor_insert ON contact_notes
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'counselor');

-- Ambassador: see notes for their contacts
CREATE POLICY notes_ambassador_select ON contact_notes
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND contact_id IN (
      SELECT id FROM contacts WHERE assigned_to = auth.uid()
    )
  );

-- =========================
-- 13. RLS POLICIES — audit_logs
-- =========================

-- Admin: full access
CREATE POLICY audit_admin_select ON audit_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- All authenticated can insert audit logs
CREATE POLICY audit_authenticated_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =========================
-- 14. REVOKE BROAD GRANTS & REPLACE
-- =========================

-- Revoke the overly broad grants from the original schema
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- Re-grant to authenticated (RLS will filter what they see)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON vw_inbox_conversations TO authenticated;

-- Service role keeps full bypass (used by the Express backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- =========================
-- 15. BACKFILL contacts.team_id
-- =========================
-- For existing contacts, assign team_id based on the team of the user
-- who was assigned the kanban card (the person handling the customer).

UPDATE contacts c
SET team_id = iu.team_id
FROM (
  SELECT DISTINCT ON (kc.contact_id) kc.contact_id, iu_inner.team_id
  FROM kanban_cards kc
  JOIN internal_users iu_inner ON iu_inner.id = kc.assignee_id
  WHERE kc.assignee_id IS NOT NULL AND iu_inner.team_id IS NOT NULL
  ORDER BY kc.contact_id, kc.created_at ASC
) sub
JOIN internal_users iu ON iu.team_id = sub.team_id
WHERE c.id = sub.contact_id
  AND c.team_id IS NULL;

-- Also backfill assigned_to from the latest kanban_card assignee
UPDATE contacts c
SET assigned_to = sub.assignee_id
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, assignee_id
  FROM kanban_cards
  WHERE assignee_id IS NOT NULL
  ORDER BY contact_id, updated_at DESC
) sub
WHERE c.id = sub.contact_id
  AND c.assigned_to IS NULL;
