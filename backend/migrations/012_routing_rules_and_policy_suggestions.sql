-- ============================================================
-- 012_routing_rules_and_policy_suggestions.sql
-- Backs the AI Intent Router admin page with real persistence.
-- Previously "routing rules" lived only in React useState (reset on
-- every reload) and "policy suggestions" lived in a fake shared
-- client-side JS module (admin-store.ts) that reset on reload and
-- was never actually shared between browsers. Both are now real
-- tables written through Next.js API routes using the service role.
-- ============================================================

-- =========================
-- 1. routing_rules
-- =========================

CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    intent contact_intent NOT NULL,
    handler TEXT NOT NULL CHECK (handler IN ('AI Bot', 'Human Ambassador')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- 2. policy_suggestions
-- =========================

CREATE TABLE IF NOT EXISTS policy_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    rule TEXT NOT NULL,
    proposed_change TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_note TEXT,
    reviewed_by UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_suggestions_submitted_by ON policy_suggestions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_policy_suggestions_status ON policy_suggestions(status);

-- =========================
-- 3. RLS + grants
-- All writes go through Next.js API routes on the service role key
-- (bypasses RLS), matching the existing /api/admin/* convention. RLS
-- here is defense-in-depth for direct client-side reads.
-- =========================

ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_suggestions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON routing_rules TO service_role;
GRANT ALL ON policy_suggestions TO service_role;
GRANT SELECT ON routing_rules TO anon, authenticated;
GRANT SELECT, INSERT ON policy_suggestions TO authenticated;

DROP POLICY IF EXISTS routing_rules_select ON routing_rules;
CREATE POLICY routing_rules_select ON routing_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_suggestions_admin_select ON policy_suggestions;
CREATE POLICY policy_suggestions_admin_select ON policy_suggestions
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS policy_suggestions_own_select ON policy_suggestions;
CREATE POLICY policy_suggestions_own_select ON policy_suggestions
  FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS policy_suggestions_own_insert ON policy_suggestions;
CREATE POLICY policy_suggestions_own_insert ON policy_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
