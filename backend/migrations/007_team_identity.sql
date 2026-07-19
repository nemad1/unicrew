-- ============================================================
-- 007_team_identity.sql
-- Shared team identity (color + lead) so Kanban, the Peer Directory,
-- and User Management all render the same team identity instead of
-- three separate ad hoc groupings, plus a staff-only team-level
-- rating rollup for the Directory's per-team summary line.
-- ============================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#1d4ed8',
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES internal_users(id) ON DELETE SET NULL;

-- Staff-only (mirrors get_ambassador_stats' self-gate): average rating and
-- ambassador headcount across a team, for the Directory section header.
CREATE OR REPLACE FUNCTION get_team_stats(target_team_id UUID)
RETURNS TABLE (avg_rating NUMERIC, ambassador_count INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() = 'ambassador' THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT ROUND(AVG(ap.rating)::numeric, 1)
       FROM ambassador_profiles ap
       JOIN internal_users iu ON iu.id = ap.user_id
       WHERE iu.team_id = target_team_id AND iu.role = 'ambassador'),
    (SELECT COUNT(*)::INT FROM internal_users WHERE team_id = target_team_id AND role = 'ambassador');
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_stats(UUID) TO authenticated;
