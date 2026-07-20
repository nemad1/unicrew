"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addSuggestion } from "@/lib/admin-store";

const ruleOptions = [
  "Fees & Tuition",
  "Campus Life",
  "Visa & Immigration",
  "Appointment Booking",
  "Escalated / Emotional",
  "General / Unknown",
];

export function SuggestRuleChange({ onSubmitted }: { onSubmitted?: () => void }) {
  const [rule, setRule] = useState<string>("");
  const [proposedChange, setProposedChange] = useState("");
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = rule && proposedChange.trim() && reason.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addSuggestion({
        rule,
        proposedChange: proposedChange.trim(),
        reason: reason.trim(),
      });
      setSuccess(true);
      onSubmitted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRule("");
    setProposedChange("");
    setReason("");
    setSuccess(false);
  };

  if (success) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-emerald-900 leading-relaxed">
            Your suggestion has been sent to the admin for review. You will be notified when it is
            approved or rejected.
          </p>
          <button
            onClick={handleReset}
            className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
          >
            Submit another suggestion
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-700" />
        <h2 className="text-sm text-gray-900 font-medium">Suggest Intent Rule Change</h2>
      </div>
      <p className="text-xs text-gray-500">
        Submit a routing change for an admin to review. You&apos;ll be notified of the decision.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">Rule</Label>
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select trigger keyword rule..." />
          </SelectTrigger>
          <SelectContent>
            {ruleOptions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">Proposed change</Label>
        <Textarea
          rows={2}
          value={proposedChange}
          onChange={(e) => setProposedChange(e.target.value)}
          placeholder="Describe what should change..."
          className="bg-white border-gray-200 text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">Reason</Label>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for this adjustment..."
          className="bg-white border-gray-200 text-sm resize-none"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Suggestion to Admin"
        )}
      </Button>
    </section>
  );
}
