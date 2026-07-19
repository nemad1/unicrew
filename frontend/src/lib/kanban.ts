// Sentinel for the legacy team_id IS NULL Kanban board — holds contacts that
// were never assigned a team. Admin-only in the team switcher: it's not any
// real team's data, so counselors/ambassadors never resolve here implicitly.
export const UNASSIGNED_TEAM_VALUE = '__unassigned__';
