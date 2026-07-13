import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Conversation } from "@/types/messages";

interface ContactDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onContactUpdated: (rawPhone: string, newLabel: string) => void;
}

export function ContactDetailsModal({
  open,
  onOpenChange,
  conversation,
  onContactUpdated,
}: ContactDetailsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [crmLabel, setCrmLabel] = useState("");
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState("General");
  const [leadStatus, setLeadStatus] = useState("");
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/kanban/stages')
      .then(res => res.json())
      .then(data => {
        if (data.stages) setStages(data.stages);
      })
      .catch(console.error);
  }, []);

  // Pre-fill form when it opens
  useEffect(() => {
    if (open) {
      setCrmLabel(conversation.student_name || "");
      setIntent(conversation.intent || "General");
      
      if (stages.length > 0) {
        const matchingStage = stages.find(s => s.name === conversation.lead_status);
        if (matchingStage) setLeadStatus(matchingStage.id);
        else setLeadStatus(stages[0].id);
      }
    }
  }, [open, conversation, stages]);

  const handleSave = async () => {
    if (!conversation || !conversation.id) return;
    const rawPhone = conversation.id.split('@')[0];
    setIsSaving(true);
    
    try {
      const res = await fetch(`/api/contacts/${rawPhone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crm_label: crmLabel.trim() || undefined,
          email: email.trim() || undefined,
          intent
        })
      });

      if (leadStatus) {
        await fetch(`/api/contacts/${rawPhone}/stage`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage_id: leadStatus })
        });
      }

      if (res.ok) {
        toast.success("Contact updated successfully");
        onOpenChange(false);
        onContactUpdated(rawPhone, crmLabel.trim() || conversation.student_name);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update contact");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating contact");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact details and CRM status. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={crmLabel}
              onChange={(e) => setCrmLabel(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              placeholder="student@example.com"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="intent" className="text-right">
              Intent
            </Label>
            <div className="col-span-3">
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select intent" />
                </SelectTrigger>
                <SelectContent>
                  {['Fees', 'Campus Life', 'Visa & Immigration', 'Courses', 'Housing', 'Booking', 'Escalated', 'General'].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="leadStatus" className="text-right">
              Stage
            </Label>
            <div className="col-span-3">
              <Select value={leadStatus} onValueChange={setLeadStatus} disabled={stages.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
