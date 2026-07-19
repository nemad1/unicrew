import type { ClubMembership } from "./types";

export function ClubsSocietiesList({ clubs }: { clubs: ClubMembership[] }) {
  if (!clubs || clubs.length === 0) return null;

  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      {clubs
        .map((club) => (club.role ? `${club.role} of ${club.name}` : club.name))
        .join(", ")}
    </p>
  );
}
