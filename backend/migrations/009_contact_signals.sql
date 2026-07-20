-- ============================================================
-- 009_contact_signals.sql
-- Replaces "one intent, one overwritten tag list" with an append-only
-- signals ledger: every AI analysis run inserts intent/interest/concern
-- rows into contact_signals instead of clobbering the contacts row.
-- contacts.intent stays as-is (now documented as "primary intent," a
-- denormalized pointer to the top intent signal) so the Kanban board,
-- the manual override dropdown, and existing filters keep working
-- unchanged. top_interests/top_concerns are cheap denormalized caches
-- so list views never need to aggregate contact_signals just to render
-- a badge. See ANALYSIS_FEATURE_PLAN.md for the full design writeup.
-- ============================================================

-- =========================
-- 1. signal_type enum + contact_signals table
-- =========================

-- CREATE TYPE has no IF NOT EXISTS in Postgres — DO block + catch
-- duplicate_object is the standard idempotent-enum pattern.
DO $$ BEGIN
  CREATE TYPE signal_type AS ENUM ('intent', 'interest', 'concern');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contact_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    signal_type signal_type NOT NULL,
    label TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.5,
    sentiment TEXT,
    source_message_id UUID REFERENCES interaction_logs(id) ON DELETE SET NULL,
    analysis_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-contact reads (e.g. "this contact's concerns, newest first")
CREATE INDEX IF NOT EXISTS idx_contact_signals_contact_type_created
  ON contact_signals(contact_id, signal_type, created_at DESC);

-- Cross-contact aggregation later (e.g. "how many contacts raised 'Visa Delay'")
CREATE INDEX IF NOT EXISTS idx_contact_signals_type_label
  ON contact_signals(signal_type, label);

-- Append-only: no UPDATE/DELETE policy is granted anywhere in this
-- migration on purpose. Every analysis run is one INSERT.

-- =========================
-- 2. contacts: denormalized caches + delta-analysis pointer
-- =========================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS top_interests JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS top_concerns JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_analyzed_message_id UUID REFERENCES interaction_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_signals_updated_at TIMESTAMPTZ;

-- =========================
-- 3. RLS — contact_signals follows the same visibility rules as
--    interaction_logs/contacts (admin: all, counselor: own team,
--    ambassador: own assigned contacts). Only the backend's service
--    role writes to this table (bypasses RLS), so no INSERT policy
--    is added here for `authenticated`.
-- =========================

ALTER TABLE contact_signals ENABLE ROW LEVEL SECURITY;

-- service_role (used by the backend) bypasses RLS but still needs an
-- explicit table-level grant — without this, the backend gets
-- "permission denied for table contact_signals" even with the service key.
GRANT ALL ON contact_signals TO service_role;
GRANT SELECT ON contact_signals TO anon, authenticated;

DROP POLICY IF EXISTS signals_admin_select ON contact_signals;
CREATE POLICY signals_admin_select ON contact_signals
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS signals_counselor_select ON contact_signals;
CREATE POLICY signals_counselor_select ON contact_signals
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'counselor'
    AND contact_id IN (
      SELECT id FROM contacts WHERE team_id = get_my_team_id()
    )
  );

DROP POLICY IF EXISTS signals_ambassador_select ON contact_signals;
CREATE POLICY signals_ambassador_select ON contact_signals
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'ambassador'
    AND contact_id IN (
      SELECT id FROM contacts WHERE assigned_to = auth.uid()
    )
  );
