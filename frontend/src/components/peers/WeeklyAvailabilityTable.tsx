import { cn } from "@/lib/utils";
import { DAY_LABELS, DAY_ORDER, formatTimeRange, type AvailabilityEntry } from "./types";

export function WeeklyAvailabilityTable({ availability }: { availability: AvailabilityEntry[] }) {
  const byDay = new Map(availability?.map((entry) => [entry.day, entry]) ?? []);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {DAY_ORDER.map((day, idx) => {
        const entry = byDay.get(day);
        const isUnavailable = !entry || !entry.start || !entry.end;
        return (
          <div
            key={day}
            className={cn(
              "flex items-center justify-between px-4 py-2.5 text-sm",
              idx !== DAY_ORDER.length - 1 && "border-b border-gray-100"
            )}
          >
            <span className="font-medium text-gray-700">{DAY_LABELS[day]}</span>
            <span className={cn(isUnavailable ? "text-gray-400" : "text-gray-900")}>
              {formatTimeRange(entry)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
