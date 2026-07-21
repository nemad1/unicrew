-- ============================================================
-- 011_last_analyzed_message_at.sql
-- Delta-fetch optimization: getDeltaMessages() previously spent an
-- extra round trip looking up interaction_logs.created_at for
-- contacts.last_analyzed_message_id before it could filter for
-- messages newer than it. Caching that timestamp directly on contacts
-- means the delta query can filter on it immediately — no lookup.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS last_analyzed_message_at TIMESTAMPTZ;

-- Backfill for contacts that already have last_analyzed_message_id set
-- from before this column existed. Safe to re-run — recomputes the same
-- value each time.
UPDATE contacts c
SET last_analyzed_message_at = l.created_at
FROM interaction_logs l
WHERE c.last_analyzed_message_id = l.id;
d