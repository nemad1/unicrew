-- 1. Create a default Kanban Board
INSERT INTO kanban_boards (name)
VALUES ('Main Board')
ON CONFLICT DO NOTHING;

-- Get the ID of the Main Board
DO $$
DECLARE
    main_board_id UUID;
BEGIN
    SELECT id INTO main_board_id FROM kanban_boards WHERE name = 'Main Board' LIMIT 1;

    -- 2. Create the default stages if they don't exist
    INSERT INTO kanban_stages (board_id, name, order_index, accent_color)
    VALUES 
        (main_board_id, 'New', 0, '#1d4ed8'),       -- Blue
        (main_board_id, 'Active', 1, '#d97706'),    -- Amber
        (main_board_id, 'Submitted', 2, '#7c3aed'), -- Violet
        (main_board_id, 'Enrolled', 3, '#059669')   -- Green
    ON CONFLICT (board_id, order_index) DO NOTHING;

    -- 3. Backfill contacts into kanban_cards
    -- For every contact that does not have a kanban_card, create one based on their lead_status enum
    INSERT INTO kanban_cards (stage_id, contact_id)
    SELECT 
        ks.id as stage_id,
        c.id as contact_id
    FROM contacts c
    LEFT JOIN kanban_cards kc ON kc.contact_id = c.id
    JOIN kanban_stages ks ON ks.board_id = main_board_id AND ks.name ILIKE c.lead_status::text
    WHERE kc.id IS NULL;

END $$;

-- 4. Recreate the vw_inbox_conversations view to pull lead_status dynamically from kanban_stages
DROP VIEW IF EXISTS vw_inbox_conversations;

CREATE OR REPLACE VIEW vw_inbox_conversations WITH (security_invoker = on) AS
SELECT 
  c.id,
  c.name AS student_name,
  c.channel,
  c.intent,
  c.unread_count,
  COALESCE(ks.name, c.lead_status::text) AS lead_status, -- Fallback to legacy enum if no card exists
  l.content AS last_message_preview,
  l.created_at AS last_message_at
FROM contacts c
LEFT JOIN LATERAL (
  SELECT content, created_at 
  FROM interaction_logs 
  WHERE contact_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) l ON true
LEFT JOIN LATERAL (
  SELECT stage_id 
  FROM kanban_cards 
  WHERE contact_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) kc ON true
LEFT JOIN kanban_stages ks ON ks.id = kc.stage_id;

-- Ensure permissions remain intact
GRANT SELECT ON vw_inbox_conversations TO anon, authenticated;
