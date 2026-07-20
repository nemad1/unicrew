"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  Mail,
  Sparkles,
  Pencil,
  Bot,
  UserCheck,
  MessageCircle,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
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

export type ProspectInterest = { label: string; confidence?: number };
export type ProspectConcern = { label: string; confidence?: number; sentiment?: string | null };

export type ProspectData = {
  /** Two-letter initials shown in the avatar circle */
  initials: string;
  /** Avatar background + text colour (Tailwind classes, e.g. "bg-blue-100 text-blue-700") */
  avatarClass?: string;
  name: string;
  phone: string;
  email: string;
  leadStatus: string;
  enrollmentProbability: number;
  aiSummary: string;
  topInterests: ProspectInterest[];
  fields: { label: string; value: string }[];
  notes: ProspectNote[];
  timeline: ProspectTimelineEvent[];
};

/** Legacy contacts.ai_tags is a bare string[]; top_interests is the new
 * structured cache. Prefer top_interests, fall back to ai_tags for
 * contacts analyzed before migration 009 ever ran. */
function deriveInterests(contact: { top_interests?: unknown; ai_tags?: unknown }): ProspectInterest[] {
  if (Array.isArray(contact.top_interests) && contact.top_interests.length > 0) {
    return contact.top_interests as ProspectInterest[];
  }
  if (Array.isArray(contact.ai_tags)) {
    return contact.ai_tags.map((t: any) => (typeof t === "string" ? { label: t } : t));
  }
  return [];
}

function SentimentIcon({ sentiment, className }: { sentiment?: string | null; className?: string }) {
  if (sentiment === "positive") return <TrendingUp className={className} />;
  if (sentiment === "negative") return <TrendingDown className={className} />;
  return <Minus className={className} />;
}



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

function Field({
  label,
  value,
  isEditing,
  onEditToggle,
  onChange,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onEditToggle: () => void;
  onChange: (val: string) => void;
}) {
  const [fieldValue, setFieldValue] = useState(value);

  useEffect(() => {
    setFieldValue(value);
  }, [value]);

  const handleToggle = () => {
    if (isEditing && fieldValue !== value) {
      onChange(fieldValue);
    }
    onEditToggle();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500">{label}</label>
        <button
          onClick={handleToggle}
          className={cn(
            "transition-colors",
            isEditing ? "text-blue-700 hover:text-blue-800" : "text-gray-400 hover:text-gray-700",
          )}
          title={isEditing ? "Save" : "Edit"}
        >
          {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>
      <Input
        value={fieldValue}
        onChange={(e) => setFieldValue(e.target.value)}
        readOnly={!isEditing}
        className={cn(
          "bg-white",
          isEditing ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200 text-gray-700",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleToggle();
        }}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProspectProfile({
  onBack,
  backLabel = "Back to Pipeline",
  rawPhone,
  readOnly = false,
}: {
  onBack: () => void;
  backLabel?: string;
  rawPhone?: string;
  readOnly?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [draft, setDraft] = useState("");
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [concerns, setConcerns] = useState<ProspectConcern[]>([]);
  const [concernsLoading, setConcernsLoading] = useState(true);
  const supabase = createClient();

  const fetchConcerns = async () => {
    if (!rawPhone) return;
    setConcernsLoading(true);
    try {
      const res = await fetch(`/api/contacts/${rawPhone}/signals?type=concern&limit=5`);
      const data = await res.json();
      setConcerns(Array.isArray(data.concerns) ? data.concerns : []);
    } catch (err) {
      console.error("Error fetching concerns:", err);
    } finally {
      setConcernsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!rawPhone) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch(`/api/ai/analyze/${rawPhone}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze profile');
      }
      if (prospect && data.profile) {
        setProspect({
          ...prospect,
          aiSummary: data.profile.ai_summary,
          topInterests: deriveInterests(data.profile),
          enrollmentProbability: data.profile.enrollment_probability,
          fields: data.profile.fields
        });
      }
      // A fresh analysis run may have added new concern signals — re-fetch.
      fetchConcerns();
    } catch (err: any) {
      setAnalyzeError(err.message || "Failed to trigger analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchConcerns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPhone]);

  useEffect(() => {
    fetch('/api/kanban/stages')
      .then(res => res.json())
      .then(data => {
        if (data.stages) setStages(data.stages);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!rawPhone) {
      setLoading(false);
      return;
    }

    async function fetchContact() {
      setLoading(true);
      try {
        const res = await fetch(`/api/contacts/${rawPhone}`);
        const json = await res.json();
        
        if (!res.ok || !json.contact) {
          setProspect({
             initials: "??",
             avatarClass: "bg-gray-100 text-gray-700",
             name: "Unknown Contact",
             phone: rawPhone || "",
             email: "-",
             leadStatus: "new",
             enrollmentProbability: 0,
             aiSummary: "Pending AI Analysis...",
             topInterests: [],
             fields: [
               { label: "Current High School", value: "" },
               { label: "Target Course", value: "" },
               { label: "Intended Intake", value: "" },
               { label: "Assigned Ambassador", value: "" },
               { label: "Assigned Counselor", value: "" },
               { label: "Source Channel", value: "" },
             ],
             notes: [],
             timeline: []
          });
        } else {
          const contact = json.contact;
          const name = contact.name || contact.phone_number;
          setProspect({
             initials: name.substring(0, 2).toUpperCase(),
             avatarClass: "bg-blue-100 text-blue-700",
             name,
             phone: contact.phone_number,
             email: contact.email || "-",
             leadStatus: contact.lead_status || "new",
             enrollmentProbability: contact.enrollment_probability || 0,
             aiSummary: contact.ai_summary || "Pending AI Analysis...",
             topInterests: deriveInterests(contact),
             fields: Array.isArray(contact.fields) && contact.fields.length > 0 ? contact.fields : [
               { label: "Current High School", value: "" },
               { label: "Target Course", value: "" },
               { label: "Intended Intake", value: "" },
               { label: "Assigned Ambassador", value: "" },
               { label: "Assigned Counselor", value: "" },
               { label: "Source Channel", value: contact.channel || "WhatsApp" },
             ],
             notes: [],
             timeline: Array.isArray(contact.interaction_logs) ? contact.interaction_logs.map((log: any) => ({
               icon: Sparkles,
               iconClass: 'bg-purple-100 text-purple-700',
               title: log.content,
               time: new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
             })) : []
          });
        }
      } catch (err) {
        console.error("Error fetching contact:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchContact();
  }, [rawPhone, supabase]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <p className="mt-4 text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex-1 flex flex-col bg-white items-center justify-center">
        <p className="text-gray-500">Contact not saved in CRM</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

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

  const handleFieldSave = async (label: string, newValue: string) => {
    if (!prospect || !rawPhone) return;
    const updatedFields = prospect.fields.map(f => f.label === label ? { ...f, value: newValue } : f);
    setProspect({ ...prospect, fields: updatedFields });
    
    try {
      await fetch(`/api/contacts/${rawPhone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: updatedFields })
      });
    } catch (err) {
      console.error("Error saving field:", err);
    }
  };

  const handleStatusChange = async (stageId: string) => {
    if (!prospect || !rawPhone) return;
    try {
      await fetch(`/api/contacts/${rawPhone}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId })
      });
      const stageName = stages.find(s => s.id === stageId)?.name;
      if (stageName) {
         setProspect({ ...prospect, leadStatus: stageName });
      }
    } catch (err) {
      console.error("Error updating stage:", err);
    }
  };

  const toggleEditAll = () => {
    const allEditing = Object.values(editingFields).some(Boolean);
    const newEditingFields: Record<string, boolean> = {};
    if (!allEditing) {
      prospect.fields.forEach(f => {
        newEditingFields[f.label] = true;
      });
    }
    setEditingFields(newEditingFields);
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
            {!readOnly && stages.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">Lead Status</span>
                <Select
                  value={stages.find(s => s.name === prospect.leadStatus)?.id || stages[0]?.id}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-48 bg-blue-50 border-blue-200 text-blue-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  <h2 className="text-sm text-gray-900 font-medium">AI Context Summary</h2>
                </div>
                {!readOnly && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs" 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                    ) : (
                      <Bot className="w-3.5 h-3.5 mr-1" />
                    )}
                    {isAnalyzing ? "Analyzing..." : "Refresh AI Insights"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Synthesized from conversation history.
              </p>
              {analyzeError && (
                <div className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded border border-red-100">
                  {analyzeError}
                </div>
              )}
              <div className="bg-blue-50/60 border border-blue-100 rounded-md p-4 text-sm text-gray-800 leading-relaxed">
                {prospect.aiSummary}
              </div>
              {prospect.topInterests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prospect.topInterests.map((t) => (
                    <span
                      key={t.label}
                      className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      Interest · {t.label}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Concerns */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm text-gray-900 font-medium">Concerns</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Objections and hesitations raised in conversation.
              </p>
              {concernsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  Loading concerns...
                </div>
              ) : concerns.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {concerns.map((c) => (
                    <span
                      key={c.label}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs",
                        c.sentiment === "negative"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200",
                      )}
                    >
                      <SentimentIcon sentiment={c.sentiment} className="w-3 h-3" />
                      {c.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No concerns identified yet.</p>
              )}
            </section>

            {/* Academic & Enrollment Details */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm text-gray-900 font-medium">Academic &amp; Enrollment Details</h2>
                {!readOnly && (
                  <Button variant="ghost" size="sm" className="text-blue-700" onClick={toggleEditAll}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {Object.values(editingFields).some(Boolean) ? "Done Editing" : "Edit All"}
                  </Button>
                )}
              </div>
              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                {prospect.fields.map((f) => (
                  <Field
                    key={f.label}
                    label={f.label}
                    value={f.value}
                    isEditing={!!editingFields[f.label]}
                    onEditToggle={() => setEditingFields(prev => ({ ...prev, [f.label]: !prev[f.label] }))}
                    onChange={(val) => handleFieldSave(f.label, val)}
                  />
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
