"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays as CalendarIcon,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Tone = "amber" | "blue" | "green";

type CalEvent = {
  id: string;
  title: string;
  subtitle?: string;
  attendees: string[];
  context: string;
  tone: Tone;
  startTime: Date;
  endTime: Date;
  contactId: string | null;
  createdBy: string;
};

type AttendeeOption = { value: string; name: string };

type AppointmentRow = {
  id: string;
  title: string;
  context: string | null;
  tone: string;
  start_time: string;
  end_time: string;
  contact_id: string | null;
  created_by: string;
  contact: { id: string; name: string | null; phone_number: string } | null;
  creator: { id: string; full_name: string } | null;
};

type InboxContactRow = { contact_id: string | null; student_name: string };

function mapAppointment(row: AppointmentRow): CalEvent {
  const contactName: string | null = row.contact?.name || row.contact?.phone_number || null;
  const creatorName: string | null = row.creator?.full_name || null;
  return {
    id: row.id,
    title: row.title,
    subtitle: contactName ? `With ${contactName}` : undefined,
    attendees: [contactName, creatorName].filter((v): v is string => Boolean(v)),
    context: row.context || "",
    tone: (row.tone as Tone) || "blue",
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    contactId: row.contact_id ?? null,
    createdBy: row.created_by,
  };
}

type View = "Day" | "Work Week" | "Week" | "Month";

const SLOT_HEIGHT = 64;
const START_HOUR = 9;
const END_HOUR = 17;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * SLOT_HEIGHT;

const toneStyles: Record<Tone, string> = {
  amber: "bg-amber-50 border-l-amber-500",
  blue: "bg-blue-50 border-l-blue-500",
  green: "bg-green-50 border-l-green-500",
};

function MicrosoftTeamsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M14 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-3 7h7a1 1 0 0 1 1 1v7a4 4 0 0 1-4 4 4 4 0 0 1-4-4v-8Zm-9 0h8v9.5a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 2 19.5V10Zm3-1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function getVisibleDays(currentDate: Date, view: View): Date[] {
  if (view === "Day") return [currentDate];
  const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
  if (view === "Work Week") {
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  }
  // Week (7 days) & Month fallback to 7 days for grid simplicity
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function EventBlock({ ev, onClick }: { ev: CalEvent; onClick: () => void }) {
  const startMinutes =
    (ev.startTime.getHours() - START_HOUR) * 60 + ev.startTime.getMinutes();
  const durMinutes =
    (ev.endTime.getTime() - ev.startTime.getTime()) / 60000;
  const top = startMinutes * (SLOT_HEIGHT / 60);
  const height = durMinutes * (SLOT_HEIGHT / 60);
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute left-1.5 right-1.5 rounded-md border-l-4 border border-gray-200/70 px-2.5 py-1.5 overflow-hidden text-left hover:shadow-md transition-shadow",
        toneStyles[ev.tone],
      )}
      style={{ top, height }}
    >
      <div className="text-sm text-gray-900 font-medium leading-tight truncate">
        {ev.title}
      </div>
      {ev.subtitle && (
        <div className="text-xs text-gray-600 mt-0.5 truncate">{ev.subtitle}</div>
      )}
    </button>
  );
}

function formatHourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h;
  return `${display}:00 ${period}`;
}

import { useMediaQuery } from "@/hooks/use-media-query";

export default function CalendarPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { authUser, role } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(isMobile ? "Day" : "Work Week");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [attendeeOptions, setAttendeeOptions] = useState<AttendeeOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data.map(mapAppointment));
    } catch {
      toast.error("Failed to load appointments.");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    // Contacts eligible as an appointment attendee — scoped the same way
    // /api/inbox already scopes chats (own for ambassadors, team for
    // counselors, all for admins).
    fetch("/api/inbox")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAttendeeOptions(
            (data as InboxContactRow[])
              .filter((c) => c.contact_id)
              .map((c) => ({ value: c.contact_id as string, name: c.student_name }))
          );
        }
      })
      .catch(() => {});
  }, [loadEvents]);

  // Force Day view on mobile if it isn't already Day or Agenda (if agenda existed)
  useEffect(() => {
    if (isMobile && currentView !== "Day") {
      setCurrentView("Day");
    }
  }, [isMobile]);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Appointment form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formTime, setFormTime] = useState("10:00");
  const [formAttendee, setFormAttendee] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormDate(format(currentDate, "yyyy-MM-dd"));
    setFormTime("10:00");
    setFormAttendee("");
  };

  const openNewAppointment = () => {
    resetForm();
    setNewOpen(true);
  };

  const openEditAppointment = (ev: CalEvent) => {
    setEditingId(ev.id);
    setFormTitle(ev.title);
    setFormDate(format(ev.startTime, "yyyy-MM-dd"));
    setFormTime(format(ev.startTime, "HH:mm"));
    setFormAttendee(ev.contactId || "");
    setSelectedEvent(null);
    setNewOpen(true);
  };

  const handleSubmitAppointment = async () => {
    if (!formTitle.trim()) return;
    const [year, month, day] = formDate.split("-").map(Number);
    const [hh, mm] = formTime.split(":").map(Number);
    const startTime = new Date(year, month - 1, day, hh, mm);
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        contact_id: formAttendee || null,
      };
      if (!editingId) body.context = "Manually scheduled appointment.";

      const res = await fetch(editingId ? `/api/appointments/${editingId}` : "/api/appointments", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save appointment.");
        return;
      }

      const mapped = mapAppointment(data.appointment);
      setEvents((prev) =>
        editingId ? prev.map((e) => (e.id === editingId ? mapped : e)) : [...prev, mapped]
      );
      setCurrentDate(startTime);
      setNewOpen(false);
      resetForm();
      toast.success(editingId ? "Appointment updated." : "Appointment scheduled.");
    } catch {
      toast.error("Failed to save appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (ev: CalEvent) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    setDeletingId(ev.id);
    try {
      const res = await fetch(`/api/appointments/${ev.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete appointment.");
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      setSelectedEvent(null);
      toast.success("Appointment deleted.");
    } catch {
      toast.error("Failed to delete appointment.");
    } finally {
      setDeletingId(null);
    }
  };

  const today = new Date();
  const now = new Date();
  const showNowIndicator = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) * (SLOT_HEIGHT / 60);

  const days = getVisibleDays(currentDate, currentView);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const navigate = (dir: -1 | 1) => {
    if (currentView === "Day") setCurrentDate((d) => addDays(d, dir));
    else if (currentView === "Month") setCurrentDate((d) => addMonths(d, dir));
    else setCurrentDate((d) => addWeeks(d, dir));
  };

  const monthLabel = format(currentDate, "MMMM yyyy");

  const gridCols = `80px repeat(${days.length}, 1fr)`;

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Header */}
      <div className={cn("border-b border-gray-200 shrink-0", isMobile ? "px-4 py-3 flex flex-col gap-3" : "px-6 py-4 flex items-center gap-4")}>
        <div className={cn("flex items-center justify-between", isMobile ? "w-full" : "gap-3")}>
          <div className="flex items-center gap-3">
            <h1 className="text-xl text-gray-900 font-semibold">{monthLabel}</h1>
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-700"
                onClick={() => setCurrentDate(today)}
              >
                Today
              </Button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className={cn("flex items-center", isMobile ? "w-full justify-between" : "mx-auto")}>
          <div className="inline-flex items-center bg-gray-100 rounded-md p-1 overflow-x-auto w-full max-w-full no-scrollbar">
            {(["Day", "Work Week", "Week", "Month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap",
                  currentView === v
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {!isMobile && (
          <div className="flex items-center gap-2">
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white"
              onClick={openNewAppointment}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Appointment
            </Button>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">
              <MicrosoftTeamsIcon className="w-4 h-4 mr-1.5 text-[#5059C9]" />
              Sync Enabled
            </Button>
          </div>
        )}
      </div>

      {loadingEvents ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
        </div>
      ) : currentView === "Month" ? (
        <MonthView currentDate={currentDate} events={events} onSelect={setSelectedEvent} />
      ) : (
        <>
          {/* Day headers */}
          <div
            className="grid border-b border-gray-200 shrink-0"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div />
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <div key={d.toISOString()} className="py-3 text-center">
                  <div className={cn("text-xs", isToday ? "text-blue-700" : "text-gray-500")}>
                    {format(d, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-medium mt-0.5 inline-block px-2",
                      isToday
                        ? "text-blue-700 border-b-2 border-blue-700"
                        : "text-gray-900",
                    )}
                  >
                    {format(d, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: gridCols,
                height: TOTAL_HEIGHT + "px",
              }}
            >
              <div className="border-r border-gray-200 relative">
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute right-2 text-xs text-gray-400"
                    style={{ top: i * SLOT_HEIGHT - 6 }}
                  >
                    {i === 0 ? "" : formatHourLabel(h)}
                  </div>
                ))}
              </div>

              {days.map((d) => {
                const isToday = isSameDay(d, today);
                const dayEvents = events.filter((e) => isSameDay(e.startTime, d));
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "relative border-r border-gray-200 last:border-r-0",
                      isToday && "bg-blue-50/20",
                    )}
                  >
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: i * SLOT_HEIGHT }}
                      />
                    ))}
                    {dayEvents.map((e) => (
                      <EventBlock key={e.id} ev={e} onClick={() => setSelectedEvent(e)} />
                    ))}
                  </div>
                );
              })}

              {/* Current time indicator — only when today is in range */}
              {showNowIndicator && days.some((d) => isSameDay(d, today)) && (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-10"
                  style={{ top: nowTop }}
                >
                  <div className="relative flex items-center" style={{ marginLeft: 80 - 6 }}>
                    <span className="w-3 h-3 rounded-full bg-blue-600 -ml-1.5 shrink-0" />
                    <div className="flex-1 h-0.5 bg-blue-600" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Event detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <SheetContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedEvent.title}</SheetTitle>
                <SheetDescription>
                  {format(selectedEvent.startTime, "EEEE, MMMM d, yyyy")} ·{" "}
                  {format(selectedEvent.startTime, "h:mm a")} –{" "}
                  {format(selectedEvent.endTime, "h:mm a")}
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Attendees</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.attendees.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-700"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                          {a
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Context / Intent</Label>
                  <div className="text-sm text-gray-700 bg-blue-50/60 border border-blue-100 rounded-md p-3">
                    {selectedEvent.context}
                  </div>
                </div>
                <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                  Join Consultation / View Chat
                </Button>

                {(selectedEvent.createdBy === authUser?.id || role === "admin") && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-200"
                      onClick={() => openEditAppointment(selectedEvent)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deletingId === selectedEvent.id}
                      onClick={() => handleDeleteEvent(selectedEvent)}
                    >
                      {deletingId === selectedEvent.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Appointment Dialog */}
      <Dialog
        open={newOpen}
        onOpenChange={(open) => {
          setNewOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Appointment" : "New Appointment"}</DialogTitle>
            <DialogDescription>
              Schedule a consultation, peer chat, or orientation event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Visa follow-up with Carlos"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Select value={formTime} onValueChange={setFormTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.flatMap((h) =>
                      ["00", "30"].map((m) => {
                        const v = `${String(h).padStart(2, "0")}:${m}`;
                        return (
                          <SelectItem key={v} value={v}>
                            {formatHourLabel(h).replace(":00", `:${m}`)}
                          </SelectItem>
                        );
                      }),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attendee</Label>
              <Select value={formAttendee} onValueChange={setFormAttendee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select prospect" />
                </SelectTrigger>
                <SelectContent>
                  {attendeeOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={!formTitle.trim() || submitting}
              onClick={handleSubmitAppointment}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  onSelect,
}: {
  currentDate: Date;
  events: CalEvent[];
  onSelect: (e: CalEvent) => void;
}) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-7 border-l border-t border-gray-200 rounded-md overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="text-xs text-gray-500 px-2 py-2 bg-gray-50 border-r border-b border-gray-200"
          >
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const dayEvents = events.filter((e) => isSameDay(e.startTime, d));
          const isToday = isSameDay(d, today);
          const otherMonth = d.getMonth() !== currentDate.getMonth();
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-24 p-1.5 border-r border-b border-gray-200 bg-white",
                otherMonth && "bg-gray-50/50",
              )}
            >
              <div
                className={cn(
                  "text-xs inline-block px-1.5 rounded",
                  isToday
                    ? "bg-blue-700 text-white"
                    : otherMonth
                      ? "text-gray-400"
                      : "text-gray-700",
                )}
              >
                {format(d, "d")}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className={cn(
                      "w-full text-left text-[11px] px-1.5 py-0.5 rounded border-l-2 truncate",
                      toneStyles[e.tone],
                    )}
                  >
                    {format(e.startTime, "h:mm a")} {e.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
