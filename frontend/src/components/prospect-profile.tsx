"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Mail,
  Sparkles,
  Pencil,
  Bot,
  UserCheck,
  MessageCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

// ─── Shared data model ────────────────────────────────────────────────────────

export type ProspectNote = {
  author: string;
  role: string;
  time: string;
  body: string;
};

export type ProspectTimelineEvent = {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  time: string;
};

export type ProspectData = {
  /** Two-letter initials shown in the avatar circle */
  initials: string;
  /** Avatar background + text colour (Tailwind classes, e.g. "bg-blue-100 text-blue-700") */
  avatarClass?: string;
  name: string;
  phone: string;
  email: string;
  leadStatus: "new" | "active" | "submitted" | "enrolled";
  enrollmentProbability: number;
  aiSummary: string;
  aiTags: { label: string; cls: string }[];
  fields: { label: string; value: string }[];
  notes: ProspectNote[];
  timeline: ProspectTimelineEvent[];
};

// ─── Default data (counselor view — Carlos Mendoza) ───────────────────────────

export const defaultProspect: ProspectData = {
  initials: "CM",
  avatarClass: "bg-blue-100 text-blue-700",
  name: "Carlos Mendoza",
  phone: "+52 55 1234 5678",
  email: "carlos.mendoza@gmail.com",
  leadStatus: "active",
  enrollmentProbability: 75,
  aiSummary:
    "Carlos is highly interested in the BSc Computer Science program. He exhibits high enthusiasm for the syllabus but has expressed underlying anxiety regarding hidden lab fees and off-campus safety at night. He is currently being advised by an external agent but prefers our peer-to-peer channel for authentic campus life queries.",
  aiTags: [
    { label: "Price Sensitive",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "Safety Concerns",  cls: "bg-red-50 text-red-700 border-red-200" },
    { label: "Agent Flight Risk", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  ],
  fields: [
    { label: "Current High School",  value: "Instituto Tecnológico de Monterrey" },
    { label: "Target Course",        value: "BSc Computer Science" },
    { label: "Intended Intake",      value: "September 2026" },
    { label: "Assigned Ambassador",  value: "Adel Zeinab" },
    { label: "Assigned Counselor",   value: "Amelia Park" },
    { label: "Source Channel",       value: "WhatsApp · Meta Campaign" },
  ],
  notes: [
    {
      author: "Adel Zeinab",
      role: "Ambassador",
      time: "Today, 10:42 AM",
      body: "Carlos seems much more relaxed after our call about hostel life. Wants to revisit fee questions next week.",
    },
    {
      author: "Amelia Park",
      role: "Admissions Lead",
      time: "Yesterday, 4:18 PM",
      body: "Followed up after intake forms — confirmed eligibility for the September 2026 intake.",
    },
  ],
  timeline: [
    {
      icon: Bot,
      iconClass: "bg-blue-100 text-blue-700",
      title: "AI Auto-Reply triggered (Fees intent)",
      time: "2 hours ago",
    },
    {
      icon: UserCheck,
      iconClass: "bg-emerald-100 text-emerald-700",
      title: "Handed off to Adel Zeinab",
      time: "Yesterday",
    },
    {
      icon: MessageCircle,
      iconClass: "bg-violet-100 text-violet-700",
      title: "Opted-in via WhatsApp Meta Campaign",
      time: "3 days ago",
    },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.55 3.74 1.5 5.27L2 22l4.95-1.59a9.86 9.86 0 0 0 5.09 1.41h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7C17.18 3.04 14.7 2 12.04 2zm5.83 14.04c-.25.7-1.44 1.34-2.02 1.42-.51.07-1.17.1-1.88-.12-.43-.13-.99-.32-1.71-.63-3-1.3-4.96-4.32-5.11-4.52-.15-.2-1.22-1.62-1.22-3.09s.77-2.19 1.04-2.49c.27-.3.59-.37.79-.37.2 0 .39 0 .57.01.18.01.42-.07.66.5.25.61.84 2.08.91 2.23.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.54-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.37 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.49.22.56.35.07.13.07.73-.18 1.43z" />
    </svg>
  );
}

function RadialProgress({ value }: { value: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#E5E7EB" strokeWidth="6" fill="none" />
        <circle
          cx="40" cy="40" r={r}
          stroke="#1D4ED8" strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-900 font-semibold">
        {value}%
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [fieldValue, setFieldValue] = useState(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500">{label}</label>
        <button
          onClick={() => setEditing((e) => !e)}
          className={cn(
            "transition-colors",
            editing ? "text-blue-700 hover:text-blue-800" : "text-gray-400 hover:text-gray-700",
          )}
          title={editing ? "Save" : "Edit"}
        >
          {editing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>
      <Input
        value={fieldValue}
        onChange={(e) => setFieldValue(e.target.value)}
        readOnly={!editing}
        className={cn(
          "bg-white",
          editing ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200 text-gray-700",
        )}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProspectProfile({
  onBack,
  backLabel = "Back to Pipeline",
  prospect = defaultProspect,
  /** When true, hides counselor-only controls (lead status selector, Edit All fields) */
  readOnly = false,
}: {
  onBack: () => void;
  backLabel?: string;
  prospect?: ProspectData;
  readOnly?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [notes, setNotes] = useState<ProspectNote[]>(prospect.notes);
  const [draft, setDraft] = useState("");

  const saveNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      {
        author: readOnly ? "Adel Zeinab" : "Amelia Park",
        role: readOnly ? "Ambassador" : "Admissions Lead",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        body: text,
      },
      ...prev,
    ]);
    setDraft("");
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-y-auto">
      <div className="px-8 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div
          className={cn(
            "bg-white rounded-lg border border-gray-200 shadow-sm p-6 gap-6",
            isMobile
              ? "flex flex-col items-center text-center"
              : "flex items-center",
          )}
        >
          <div
            className={cn(
              "min-w-0",
              isMobile
                ? "flex flex-col items-center gap-3 w-full"
                : "flex items-center gap-5 flex-1",
            )}
          >
            <div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold shrink-0",
                prospect.avatarClass ?? "bg-blue-100 text-blue-700",
              )}
            >
              {prospect.initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl text-gray-900 font-bold leading-tight">{prospect.name}</h1>
              <div
                className={cn(
                  "mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500",
                  isMobile && "justify-center",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <WhatsAppIcon className="w-4 h-4 text-green-500" />
                  {prospect.phone}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {prospect.email}
                </span>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-6 shrink-0",
              isMobile && "justify-center flex-wrap w-full pt-2",
            )}
          >
            {!readOnly && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">Lead Status</span>
                <Select defaultValue={prospect.leadStatus}>
                  <SelectTrigger className="w-48 bg-blue-50 border-blue-200 text-blue-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Inquiry</SelectItem>
                    <SelectItem value="active">Active Consulting</SelectItem>
                    <SelectItem value="submitted">Application Submitted</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-gray-500">Probability to Enroll</span>
              <RadialProgress value={prospect.enrollmentProbability} />
            </div>
          </div>
        </div>

        {/* ── Two-column body ─────────────────────────────────────────────── */}
        <div 
          className={cn("grid", isMobile ? "gap-6 grid-cols-1" : "gap-6")} 
          style={isMobile ? undefined : { gridTemplateColumns: "1.85fr 1fr" }}
        >
          {/* Column 1 */}
          <div className="space-y-6 min-w-0">
            {/* AI Context Summary */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm text-gray-900 font-medium">AI Context Summary</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Synthesized from conversation history.
              </p>
              <div className="bg-blue-50/60 border border-blue-100 rounded-md p-4 text-sm text-gray-800 leading-relaxed">
                {prospect.aiSummary}
              </div>
              {prospect.aiTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prospect.aiTags.map((t) => (
                    <span
                      key={t.label}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                        t.cls,
                      )}
                    >
                      Key Driver · {t.label}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Academic & Enrollment Details */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm text-gray-900 font-medium">Academic &amp; Enrollment Details</h2>
                {!readOnly && (
                  <Button variant="ghost" size="sm" className="text-blue-700">
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit All
                  </Button>
                )}
              </div>
              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                {prospect.fields.map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </div>
            </section>
          </div>

          {/* Column 2 */}
          <div className="space-y-6 min-w-0">
            {/* Notes */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm text-gray-900 font-medium mb-3">
                {readOnly ? "Your Notes on This Student" : "Staff & Ambassador Notes"}
              </h2>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Add an observation..."
                className="bg-gray-50 border-gray-200 text-sm resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-800 text-white"
                  onClick={saveNote}
                >
                  Save Note
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {notes.map((n, i) => (
                  <div key={i} className="border border-gray-200 rounded-md p-3 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-gray-900">
                        {n.author}{" "}
                        <span className="text-xs text-gray-500">({n.role})</span>
                      </span>
                      <span className="text-xs text-gray-400">{n.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{n.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Interaction Timeline */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm text-gray-900 font-medium mb-4">Interaction Timeline</h2>
              <div className="relative pl-8 space-y-5">
                <div className="absolute left-3.5 top-1 bottom-1 w-px bg-gray-200" />
                {prospect.timeline.map((ev, i) => {
                  const Icon = ev.icon;
                  return (
                     <div key={i} className="relative">
                      <span
                        className={cn(
                          "absolute -left-8 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white",
                          ev.iconClass,
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm text-gray-900">{ev.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{ev.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
