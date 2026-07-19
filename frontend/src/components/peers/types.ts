export type ProgrammeType = "Undergraduate" | "Masters" | "PhD";

export type ClubMembership = { name: string; role: string | null };

export type AvailabilityDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type AvailabilityEntry = {
  day: AvailabilityDay;
  start: string | null;
  end: string | null;
};

export type AmbassadorStats = {
  total_consults: number | null;
  deals_closed: number | null;
  avg_response_seconds: number | null;
  hours_clocked: number | null;
  missed_chats: number | null;
  rating: number | null;
};

export type ActivityDay = { day: string; message_count: number };

export type PeerUser = {
  id: string;
  name: string;
  email: string;
  role: "counselor" | "ambassador" | "admin";
  initials: string;
  isTeamLeader: boolean;
  teamId: string | null;
  teamName: string;

  // Ambassador specific data
  colour: string;
  programme?: string;
  programmeType?: ProgrammeType | string;
  year?: string;
  languages?: string;
  from?: string;
  fromFlag?: string;
  qualification?: string;
  majors?: string;
  bio?: string;
  bioFull?: string;
  hobbies?: string[];
  clubs?: ClubMembership[];
  favouriteCourses?: string[];
  online?: boolean;
  availability?: AvailabilityEntry[];
  contactPhone?: string | null;
  avatarUrl?: string | null;
};

export const DAY_LABELS: Record<AvailabilityDay, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_ORDER: AvailabilityDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function formatTimeRange(entry: AvailabilityEntry | undefined): string {
  if (!entry || !entry.start || !entry.end) return "Unavailable";
  return `${entry.start} – ${entry.end}`;
}

export function whatsappLink(contactPhone: string | null | undefined): string | null {
  if (!contactPhone) return null;
  const digits = contactPhone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) {
    const wholeMinutes = Math.floor(minutes);
    const remSeconds = Math.round(seconds - wholeMinutes * 60);
    return remSeconds > 0 ? `${wholeMinutes}m ${remSeconds}s` : `${wholeMinutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = Math.round(minutes - hours * 60);
  return `${hours}h ${remMinutes}m`;
}
