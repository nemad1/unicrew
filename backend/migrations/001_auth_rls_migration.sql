-- ============================================================
-- 001_auth_rls_migration.sql
-- Adds assigned_to on contacts, enables RLS, creates policies
-- ============================================================

-- =========================
-- 1. SCHEMA ADDITIONS
-- =========================

-- Add assigned_to to contacts so we know which internal_user owns the contact
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES internal_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);

-- =========================
-- 2. HELPER FUNCTIONS
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
-- 3. ENABLE RLS
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
-- 4. RLS POLICIES — contacts
-- =========================

-- Admin: unrestricted read
CREATE POLICY contacts_admin_select ON contacts
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Staff: can see contacts assigned to themselves or to any team member
CREATE POLICY contacts_staff_select ON contacts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'staff'
    AND (
      assigned_to = auth.uid()
      OR assigned_to IN (SELECT get_my_team_member_ids())
    )
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

-- Staff: can update contacts they can see
CREATE POLICY contacts_staff_update ON contacts
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'staff'
    AND (
      assigned_to = auth.uid()
      OR assigned_to IN (SELECT get_my_team_member_ids())
    )
  );

-- Staff: can insert contacts (e.g., saving a new prospect)
CREATE POLICY contacts_staff_insert ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'staff');

-- =========================
-- 5. RLS POLICIES — interaction_logs
-- =========================

-- Admin: unrestricted read
CREATE POLICY logs_admin_select ON interaction_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Staff: see logs for contacts they can access
CREATE POLICY logs_staff_select ON interaction_logs
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'staff'
    AND contact_id IN (
      SELECT id FROM contacts
      WHERE assigned_to = auth.uid()
         OR assigned_to IN (SELECT get_my_team_member_ids())
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
-- 6. RLS POLICIES — kanban_cards
-- =========================

-- Admin: full access
CREATE POLICY cards_admin_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY cards_admin_all ON kanban_cards
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Staff: see cards assigned to themselves or team members
CREATE POLICY cards_staff_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'staff'
    AND (
      assignee_id = auth.uid()
      OR assignee_id IN (SELECT get_my_team_member_ids())
    )
  );

-- Staff: can update cards they can see
CREATE POLICY cards_staff_update ON kanban_cards
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'staff'
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
-- 7. RLS POLICIES — kanban_boards & kanban_stages
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
-- 8. RLS POLICIES — internal_users
-- =========================

-- Admin: full access
CREATE POLICY users_admin_all ON internal_users
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Staff: can see all users in their team + themselves
CREATE POLICY users_staff_select ON internal_users
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'staff'
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
-- 9. RLS POLICIES — teams
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
-- 10. RLS POLICIES — ambassador_profiles
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
-- 11. RLS POLICIES — contact_notes
-- =========================

-- Admin: full access
CREATE POLICY notes_admin_all ON contact_notes
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- Staff: see notes for contacts they can access
CREATE POLICY notes_staff_select ON contact_notes
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'staff'
    AND contact_id IN (
      SELECT id FROM contacts
      WHERE assigned_to = auth.uid()
         OR assigned_to IN (SELECT get_my_team_member_ids())
    )
  );

-- Staff: can create notes
CREATE POLICY notes_staff_insert ON contact_notes
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'staff');

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
-- 12. RLS POLICIES — audit_logs
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
-- 13. REVOKE BROAD GRANTS & REPLACE
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
-- 14. BACKFILL assigned_to
-- =========================

-- Populate contacts.assigned_to from the most recent kanban_card assignee
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
