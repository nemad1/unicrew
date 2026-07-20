-- ============================================================
-- 010_contact_signals_view.sql
-- Read layer on top of contact_signals (migration 009). Per-contact
-- deep-dive reads go through vw_contact_top_signals, which collapses
-- repeated mentions of the same label down to its most recent
-- confidence/sentiment so the app never has to de-duplicate itself.
-- List views (Inbox, Kanban) keep reading contacts.top_interests /
-- contacts.top_concerns directly — vw_inbox_conversations is extended
-- with top_concerns so it can offer that without an extra query, but
-- neither list view joins contact_signals. Cross-contact aggregation
-- (the admin "Top Concerns" widget) goes through the top_signals()
-- function, mirroring the existing match_documents() RPC pattern.
-- ============================================================

-- =========================
-- 1. vw_contact_top_signals — per-contact, latest mention of each
--    (signal_type, label) pair
-- =========================

CREATE OR REPLACE VIEW vw_contact_top_signals WITH (security_invoker = on) AS
SELECT DISTINCT ON (contact_id, signal_type, label)
  contact_id, signal_type, label, confidence, sentiment, created_at
FROM contact_signals
ORDER BY contact_id, signal_type, label, created_at DESC;

-- security_invoker = on means this view enforces RLS as the calling
-- role, same as vw_inbox_conversations — but views are still separate
-- objects from their underlying tables and need their own grant
-- (see the contact_signals service_role lesson from migration 009).
GRANT SELECT ON vw_contact_top_signals TO service_role, anon, authenticated;

-- =========================
-- 2. vw_inbox_conversations: add top_concerns so the inbox list can
--    optionally show a concern indicator without an extra query.
--    The live view's column types have drifted from what's in
--    supabase-schema.sql (lead_status is deployed as text, not the
--    lead_status enum), so CREATE OR REPLACE fails with a column-type
--    mismatch. DROP + CREATE sidesteps that reconciliation entirely;
--    the explicit re-GRANT below restores what DROP revokes.
-- =========================

DROP VIEW IF EXISTS vw_inbox_conversations;

CREATE VIEW vw_inbox_conversations WITH (security_invoker = on) AS
SELECT
  c.id,
  c.name AS student_name,
  c.channel,
  c.intent,
  c.unread_count,
  c.lead_status,
  c.top_concerns,
  l.content AS last_message_preview,
  l.created_at AS last_message_at
FROM contacts c
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM interaction_logs
  WHERE contact_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) l ON true;

GRANT SELECT ON vw_inbox_conversations TO service_role, anon, authenticated;

-- =========================
-- 3. top_signals() — cross-contact aggregation for the admin
--    dashboard's "Top Concerns This Week" widget. Supabase-js's query
--    builder can't express GROUP BY + AVG, so this is exposed as an
--    RPC, same pattern as match_documents() in supabase-schema.sql.
--    Functions default to EXECUTE granted to PUBLIC, so no explicit
--    grant is needed (match_documents() has none either).
-- =========================

CREATE OR REPLACE FUNCTION top_signals(
  p_signal_type signal_type,
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  label TEXT,
  student_count BIGINT,
  avg_confidence NUMERIC
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    label,
    COUNT(DISTINCT contact_id) AS student_count,
    AVG(confidence) AS avg_confidence
  FROM contact_signals
  WHERE signal_type = p_signal_type
    AND created_at > NOW() - (p_days || ' days')::interval
  GROUP BY label
  ORDER BY student_count DESC
  LIMIT p_limit;
$$;
