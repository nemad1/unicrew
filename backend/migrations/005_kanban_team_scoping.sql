-- ============================================================
-- 005_kanban_team_scoping.sql
-- Gives every team its own Kanban board (own stages/pipeline),
-- reassigns existing cards to the right team's board, and makes
-- contacts.assigned_to the single source of truth for assignment
-- (kanban_cards.assignee_id is left in place but no longer used by
-- RLS or the app — not dropped, since nothing depends on removing it).
-- ============================================================

-- =========================
-- 1. kanban_boards: add team_id (NULL = legacy/unassigned fallback board)
-- =========================

ALTER TABLE kanban_boards
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kanban_boards_team_id
  ON kanban_boards(team_id) WHERE team_id IS NOT NULL;

-- =========================
-- 2. Auto-provision one board per existing team, copying stages
--    from the legacy "Main Board" (falls back to the original 4
--    default stages if no legacy board exists)
-- =========================

DO $$
DECLARE
  legacy_board_id UUID;
  team_row RECORD;
  new_board_id UUID;
  stage_row RECORD;
BEGIN
  SELECT id INTO legacy_board_id FROM kanban_boards WHERE name = 'Main Board' AND team_id IS NULL LIMIT 1;

  FOR team_row IN SELECT id, name FROM teams LOOP
    IF EXISTS (SELECT 1 FROM kanban_boards WHERE team_id = team_row.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO kanban_boards (name, team_id)
    VALUES (team_row.name || ' Board', team_row.id)
    RETURNING id INTO new_board_id;

    IF legacy_board_id IS NOT NULL THEN
      FOR stage_row IN
        SELECT name, order_index, accent_color, is_completed
        FROM kanban_stages WHERE board_id = legacy_board_id ORDER BY order_index
      LOOP
        INSERT INTO kanban_stages (board_id, name, order_index, accent_color, is_completed)
        VALUES (new_board_id, stage_row.name, stage_row.order_index, stage_row.accent_color, stage_row.is_completed);
      END LOOP;
    ELSE
      INSERT INTO kanban_stages (board_id, name, order_index, accent_color)
      VALUES
        (new_board_id, 'New', 0, '#1d4ed8'),
        (new_board_id, 'Active', 1, '#d97706'),
        (new_board_id, 'Submitted', 2, '#7c3aed'),
        (new_board_id, 'Enrolled', 3, '#059669');
    END IF;
  END LOOP;
END $$;

-- =========================
-- 3. Reassign existing cards to their contact's team board
--    (matched by stage name; cards for contacts with no team stay
--    on the legacy board as an "Unassigned team" fallback)
-- =========================

UPDATE kanban_cards kc
SET stage_id = new_stage.id
FROM contacts c
JOIN kanban_boards nb ON nb.team_id = c.team_id
JOIN kanban_stages new_stage ON new_stage.board_id = nb.id
WHERE kc.contact_id = c.id
  AND c.team_id IS NOT NULL
  AND new_stage.name = (SELECT name FROM kanban_stages WHERE id = kc.stage_id)
  AND (SELECT board_id FROM kanban_stages WHERE id = kc.stage_id) <> nb.id;

-- =========================
-- 4. RLS — kanban_cards: rewrite to key off contacts.assigned_to /
--    contacts.team_id instead of kanban_cards.assignee_id
-- =========================

DROP POLICY IF EXISTS cards_counselor_select ON kanban_cards;
DROP POLICY IF EXISTS cards_counselor_update ON kanban_cards;
DROP POLICY IF EXISTS cards_ambassador_select ON kanban_cards;
DROP POLICY IF EXISTS cards_ambassador_update ON kanban_cards;

CREATE POLICY cards_counselor_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND contact_id IN (SELECT id FROM contacts WHERE team_id = get_my_team_id())
  );

CREATE POLICY cards_counselor_update ON kanban_cards
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND contact_id IN (SELECT id FROM contacts WHERE team_id = get_my_team_id())
  );

CREATE POLICY cards_ambassador_select ON kanban_cards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND contact_id IN (SELECT id FROM contacts WHERE assigned_to = auth.uid())
  );

CREATE POLICY cards_ambassador_update ON kanban_cards
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND contact_id IN (SELECT id FROM contacts WHERE assigned_to = auth.uid())
  );

-- =========================
-- 5. RLS — kanban_boards / kanban_stages: team-scoped select,
--    counselor+admin manage (ambassadors can view but not restructure
--    the pipeline)
-- =========================

DROP POLICY IF EXISTS boards_authenticated_select ON kanban_boards;
DROP POLICY IF EXISTS boards_admin_all ON kanban_boards;
DROP POLICY IF EXISTS stages_authenticated_select ON kanban_stages;
DROP POLICY IF EXISTS stages_admin_all ON kanban_stages;

CREATE POLICY boards_team_select ON kanban_boards
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    OR team_id = get_my_team_id()
    OR team_id IS NULL
  );

CREATE POLICY boards_admin_all ON kanban_boards
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY boards_counselor_manage ON kanban_boards
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'counselor' AND team_id = get_my_team_id());

CREATE POLICY stages_team_select ON kanban_stages
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    OR board_id IN (SELECT id FROM kanban_boards WHERE team_id = get_my_team_id() OR team_id IS NULL)
  );

CREATE POLICY stages_admin_all ON kanban_stages
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY stages_counselor_manage ON kanban_stages
  FOR ALL TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND board_id IN (SELECT id FROM kanban_boards WHERE team_id = get_my_team_id())
  );
