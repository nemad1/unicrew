// Shared, canonical taxonomy used across the entire app.
// Every screen imports Intent + intentStyles from here so categories and
// their colors stay consistent everywhere.

export type Role = "staff" | "ambassador" | "admin";

export type Intent =
  | "Fees"
  | "Campus Life"
  | "Visa & Immigration"
  | "Courses"
  | "Housing"
  | "Booking"
  | "Escalated"
  | "General";

// Exactly ONE color per intent across the whole application.
export const intentStyles: Record<Intent, string> = {
  Fees: "bg-amber-50 text-amber-700 border-amber-200",
  "Campus Life": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Visa & Immigration": "bg-violet-50 text-violet-700 border-violet-200",
  Courses: "bg-blue-50 text-blue-700 border-blue-200",
  Housing: "bg-pink-50 text-pink-700 border-pink-200",
  Booking: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Escalated: "bg-red-50 text-red-700 border-red-200",
  General: "bg-gray-100 text-gray-700 border-gray-200",
};

// Shared style for an INCOMING (student/prospect) chat bubble — used by every
// chat surface so distinction reads the same everywhere.
export const incomingBubbleClass =
  "bg-gray-100 text-gray-900 rounded-tl-none";
