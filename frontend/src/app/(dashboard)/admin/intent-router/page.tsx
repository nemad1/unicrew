"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Check,
  X,
  MessageSquare,
  BookOpen,
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAdminStore,
  updateSuggestionStatus,
  formatRelativeTime,
  type PolicySuggestion,
} from "@/lib/admin-store";
import { RuleModal, type RoutingRule, type Handler } from "@/components/admin/rule-modal";
import { intentStyles, type Intent } from "@/types/roles";

type UploadStatus = "idle" | "uploading" | "success" | "error";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function KnowledgeBaseSection() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setUploadStatus("idle");
    setResultMessage(null);
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a PDF or Word document first.");
      return;
    }

    setUploadStatus("uploading");
    setResultMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      setUploadStatus("success");
      setResultMessage(
        `Ingested ${data.insertedChunks}/${data.totalChunks} chunks from "${data.fileName}".`
      );
      toast.success("Document added to the knowledge base");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setUploadStatus("error");
      setResultMessage(err.message || "Something went wrong while processing the document.");
      toast.error(err.message || "Failed to upload document");
    }
  }

  const isUploading = uploadStatus === "uploading";

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Knowledge Base</h2>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-[18px] h-[18px] text-blue-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Add a source document</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              PDF or Word files are split into chunks, embedded, and stored so the AI Assistant can use them for replies.
            </p>
          </div>
        </div>

        <label
          htmlFor="kb-file-input"
          className={cn(
            "border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <UploadCloud className="w-6 h-6 text-gray-400" />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <FileText className="w-4 h-4 text-blue-700" />
              {file.name}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Click to choose a <span className="font-medium text-gray-700">.pdf</span>,{" "}
              <span className="font-medium text-gray-700">.doc</span>, or{" "}
              <span className="font-medium text-gray-700">.docx</span> file
            </p>
          )}
          <input
            id="kb-file-input"
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        {uploadStatus === "success" && resultMessage && (
          <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{resultMessage}</span>
          </div>
        )}
        {uploadStatus === "error" && resultMessage && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{resultMessage}</span>
          </div>
        )}

        <Button
          className="bg-blue-700 hover:bg-blue-800 text-white self-start"
          size="sm"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing document...
            </>
          ) : (
            "Upload to knowledge base"
          )}
        </Button>
      </div>
    </section>
  );
}

function HandlerBadge({ handler }: { handler: Handler }) {
  const isAI = handler === "AI Bot";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border",
        isAI
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      )}
    >
      {handler}
    </span>
  );
}

function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs border", intentStyles[intent])}>
      {intent}
    </span>
  );
}

function SuggestionCard({ s, onChanged }: { s: PolicySuggestion; onChanged: () => void }) {
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<"approved" | "rejected" | null>(null);

  const handleDecision = async (status: "approved" | "rejected") => {
    setSubmittingStatus(status);
    try {
      await updateSuggestionStatus(s.id, status, reviewNote ?? undefined);
      toast.success(status === "approved" ? "Suggestion approved" : "Suggestion rejected");
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to update suggestion");
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {s.submittedBy.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-900 font-medium leading-tight">{s.submittedBy}</p>
            <p className="text-[11px] text-gray-400">Submitted {formatRelativeTime(s.submittedAt)}</p>
          </div>
        </div>
        {s.status !== "pending" && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs border shrink-0",
              s.status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200",
            )}
          >
            {s.status === "approved" ? "Approved" : "Rejected"}
          </span>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-md p-3 space-y-1.5">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Rule: </span>
          {s.rule}
        </p>
        <p className="text-sm text-gray-900 leading-relaxed">
          <span className="font-semibold">Counselor {s.submittedBy.split(" ")[0]} requested: </span>
          {s.proposedChange}
        </p>
        <p className="text-xs text-gray-600 italic leading-relaxed">
          Reason: {s.reason}
        </p>
      </div>

      {s.status !== "pending" && s.reviewNote && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-md p-3">
          <p className="text-xs text-blue-900">
            <span className="font-semibold">Review note: </span>
            {s.reviewNote}
          </p>
        </div>
      )}

      {s.status === "pending" && reviewNote !== null && (
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={2}
          placeholder="Review note for the counselor..."
          className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400 resize-none bg-white"
        />
      )}

      {s.status === "pending" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDecision("approved")}
            disabled={submittingStatus !== null}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
          >
            {submittingStatus === "approved" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Approve Request
          </button>
          <button
            onClick={() => handleDecision("rejected")}
            disabled={submittingStatus !== null}
            className="inline-flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
          >
            {submittingStatus === "rejected" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
            Reject Request
          </button>
          <button
            onClick={() => setReviewNote((n) => (n === null ? "" : null))}
            disabled={submittingStatus !== null}
            className="text-xs text-blue-700 hover:underline ml-auto disabled:opacity-60"
          >
            {reviewNote === null ? "Add Review Note" : "Hide Review Note"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AIIntentRouterAdminPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const { suggestions, refresh: refreshSuggestions } = useAdminStore();

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/routing-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (rule: RoutingRule) => {
    const nextActive = !rule.active;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: nextActive } : r)));
    try {
      const res = await fetch(`/api/routing-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)));
      toast.error("Failed to update rule status");
    }
  };

  const deleteRule = async (rule: RoutingRule) => {
    if (!confirm(`Delete the "${rule.keyword}" routing rule?`)) return;
    try {
      const res = await fetch(`/api/routing-rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Routing rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setRuleModalOpen(true);
  };

  const openEditModal = (rule: RoutingRule) => {
    setEditingRule(rule);
    setRuleModalOpen(true);
  };

  const pending = suggestions.filter((s) => s.status === "pending");
  const resolved = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Intent Router</h1>
          <p className="text-xs text-gray-500">
            Manage keyword triggers, review counselor policy change requests, and maintain the AI knowledge base.
          </p>
        </div>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white" size="sm" onClick={openCreateModal}>
          + Add Rule
        </Button>
      </div>

      <RuleModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSaved={fetchRules}
        rule={editingRule}
      />

      <div className="p-6 space-y-6">
        <KnowledgeBaseSection />

        {/* Rules table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Routing Rules</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Keyword Trigger</th>
                  <th className="px-5 py-3 font-medium">Mapped Intent</th>
                  <th className="px-5 py-3 font-medium">Assigned Handler</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40">
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-800">
                        {rule.keyword}
                      </code>
                    </td>
                    <td className="px-5 py-3"><IntentBadge intent={rule.intent} /></td>
                    <td className="px-5 py-3"><HandlerBadge handler={rule.handler} /></td>
                    <td className="px-5 py-3">
                      <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule)} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rulesLoading && rules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                      No routing rules yet. Click &ldquo;+ Add Rule&rdquo; to create one.
                    </td>
                  </tr>
                )}
                {rulesLoading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading rules...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending suggestions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Counselor Policy Change Requests
            </h2>
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
              {pending.length}
            </span>
          </div>

          {pending.length === 0 && resolved.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center text-center">
              <MessageSquare className="w-7 h-7 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">No counselor change requests yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Suggestions submitted by counselors will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((s) => <SuggestionCard key={s.id} s={s} onChanged={refreshSuggestions} />)}
              {resolved.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wider pt-2">Recently resolved</p>
                  {resolved.map((s) => <SuggestionCard key={s.id} s={s} onChanged={refreshSuggestions} />)}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
