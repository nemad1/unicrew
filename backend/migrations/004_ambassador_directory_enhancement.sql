-- ============================================================
-- 004_ambassador_directory_enhancement.sql
-- Ambassador Directory full-profile enhancement:
--   - clubs_societies becomes structured (name + role)
--   - availability_schedule shape documented (7-day Mon..Sun)
--   - new ambassador_feedback table backing a computed `rating`
--   - contacts.pending_feedback_for to correlate the next WhatsApp
--     reply after a card reaches "Enrolled" with a rating prompt
--   - staff-only aggregate stats via SECURITY DEFINER functions
--     (get_ambassador_stats / get_ambassador_activity_trend), not a
--     stored table, so numbers are always live and there is no
--     separate cache to keep in sync
--   - RLS added for ambassador_shifts (previously had none) and the
--     new ambassador_feedback table
-- ============================================================

-- =========================
-- 1. clubs_societies: TEXT -> JSONB [{ "name": string, "role": string|null }]
-- =========================

ALTER TABLE ambassador_profiles
  ALTER COLUMN clubs_societies TYPE JSONB
  USING (
    CASE
      WHEN clubs_societies IS NULL OR btrim(clubs_societies) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('name', btrim(clubs_societies), 'role', NULL))
    END
  );

ALTER TABLE ambassador_profiles
  ALTER COLUMN clubs_societies SET DEFAULT '[]'::jsonb;

-- availability_schedule already exists as JSONB DEFAULT '[]'. Documenting the
-- shape the app reads/writes (no column change needed):
--   [{ "day": "mon".."sun", "start": "HH:MM" | null, "end": "HH:MM" | null }, ...]
--   (start/end null means "Unavailable" for that day)

-- =========================
-- 2. contacts: track which ambassador a pending post-chat rating belongs to
-- =========================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS pending_feedback_for UUID REFERENCES internal_users(id) ON DELETE SET NULL;

-- =========================
-- 3. AMBASSADOR FEEDBACK (backs the computed `rating`)
-- =========================

CREATE TABLE IF NOT EXISTS ambassador_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES internal_users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambassador_feedback_user_id ON ambassador_feedback(user_id);

-- Recompute the cached average rating whenever feedback comes in
CREATE OR REPLACE FUNCTION update_ambassador_rating()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  UPDATE ambassador_profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM ambassador_feedback
    WHERE user_id = NEW.user_id
  )
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ambassador_rating ON ambassador_feedback;
CREATE TRIGGER trigger_update_ambassador_rating
AFTER INSERT ON ambassador_feedback
FOR EACH ROW EXECUTE FUNCTION update_ambassador_rating();

-- =========================
-- 4. STAFF-ONLY STATS FUNCTIONS
-- =========================
-- Both are SECURITY DEFINER (bypass RLS internally) but self-gate on role,
-- mirroring get_my_role()/get_my_team_id() below. This is the primary DB-side
-- gate; the Next.js API route performs the same role check before calling
-- these, so staff-only visibility does not depend on RLS on ambassador_profiles
-- (which currently allows any authenticated user to SELECT that table).

CREATE OR REPLACE FUNCTION get_ambassador_stats(target_user_id UUID)
RETURNS TABLE (
  total_consults INT,
  deals_closed INT,
  avg_response_seconds INT,
  hours_clocked NUMERIC,
  missed_chats INT,
  rating NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() = 'ambassador' THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH my_contacts AS (
    SELECT id FROM contacts WHERE assigned_to = target_user_id
  ),
  response_pairs AS (
    SELECT l.created_at AS inbound_at, nr.created_at AS reply_at
    FROM interaction_logs l
    JOIN LATERAL (
      SELECT r.created_at
      FROM interaction_logs r
      WHERE r.contact_id = l.contact_id
        AND r.sender_type = 'ambassador'
        AND r.created_at > l.created_at
      ORDER BY r.created_at ASC
      LIMIT 1
    ) nr ON true
    WHERE l.sender_type = 'student'
      AND l.contact_id IN (SELECT id FROM my_contacts)
  )
  SELECT
    (SELECT COUNT(*)::INT FROM my_contacts),
    (SELECT COUNT(*)::INT
       FROM my_contacts mc
       JOIN kanban_cards kc ON kc.contact_id = mc.id
       JOIN kanban_stages ks ON ks.id = kc.stage_id
       WHERE ks.is_completed OR ks.name ILIKE 'Enrolled'),
    (SELECT AVG(EXTRACT(EPOCH FROM (reply_at - inbound_at)))::INT FROM response_pairs),
    (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600.0), 0)
       FROM ambassador_shifts WHERE user_id = target_user_id),
    (SELECT COUNT(*)::INT
       FROM interaction_logs l
       WHERE l.sender_type = 'student'
         AND l.is_read = false
         AND l.created_at < NOW() - INTERVAL '24 hours'
         AND l.contact_id IN (SELECT id FROM my_contacts)),
    (SELECT ap.rating FROM ambassador_profiles ap WHERE ap.user_id = target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_ambassador_activity_trend(target_user_id UUID)
RETURNS TABLE (day DATE, message_count INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() = 'ambassador' THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT d::date AS day, COUNT(l.id)::INT AS message_count
  FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
  LEFT JOIN interaction_logs l
    ON l.created_at::date = d::date
    AND l.sender_type = 'ambassador'
    AND l.contact_id IN (SELECT id FROM contacts WHERE assigned_to = target_user_id)
  GROUP BY d
  ORDER BY d;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ambassador_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ambassador_activity_trend(UUID) TO authenticated;

-- =========================
-- 5. RLS — ambassador_feedback
-- =========================

ALTER TABLE ambassador_feedback ENABLE ROW LEVEL SECURITY;

-- Staff/admin only; students submit via the WhatsApp webhook using the
-- service role key, which bypasses RLS, so no INSERT policy is needed here.
CREATE POLICY feedback_staff_select ON ambassador_feedback
  FOR SELECT TO authenticated
  USING (get_my_role() <> 'ambassador');

CREATE POLICY feedback_admin_all ON ambassador_feedback
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- =========================
-- 6. RLS — ambassador_shifts (previously unsecured, RLS was never enabled)
-- =========================

ALTER TABLE ambassador_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY shifts_admin_all ON ambassador_shifts
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY shifts_staff_select ON ambassador_shifts
  FOR SELECT TO authenticated
  USING (get_my_role() <> 'ambassador');

CREATE POLICY shifts_ambassador_own_select ON ambassador_shifts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY shifts_ambassador_own_insert ON ambassador_shifts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY shifts_ambassador_own_update ON ambassador_shifts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =========================
-- 7. GRANTS (keep service_role bypass, matches 001_auth_rls_migration.sql)
-- =========================

GRANT ALL ON ambassador_feedback TO service_role;
GRANT ALL ON ambassador_shifts TO service_role;
GRANT SELECT, INSERT, UPDATE ON ambassador_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ambassador_shifts TO authenticated;
