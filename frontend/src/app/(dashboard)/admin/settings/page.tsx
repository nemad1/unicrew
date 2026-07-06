"use client";

import { useState } from "react";
import { Palette, Bell, Shield, Plug } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function CardShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-blue-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  defaultOn,
}: {
  title: string;
  subtitle: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

function IntegrationRow({
  name,
  status,
  defaultOn,
}: {
  name: string;
  status: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            on ? "bg-emerald-500" : "bg-gray-300",
          )}
        />
        <div>
          <p className="text-sm text-gray-900">{name}</p>
          <p className="text-[11px] text-gray-500">{status}</p>
        </div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

export default function SystemSettingsPage() {
  const [logoUrl, setLogoUrl] = useState("https://campuscrm.app/logo.svg");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [bgColor, setBgColor] = useState("#ffffff");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
          <p className="text-xs text-gray-500">Global configuration for the entire CampusCRM tenant.</p>
        </div>
        <Button
          className="bg-blue-700 hover:bg-blue-800 text-white"
          size="sm"
          onClick={() => toast.success("System settings saved")}
        >
          Save Changes
        </Button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-5">
          {/* Card 1 — Branding */}
          <CardShell icon={Palette} title="Branding" description="Customize the look and feel of the dashboard.">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="logo-url" className="text-xs text-gray-600">Logo URL</Label>
                <Input
                  id="logo-url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-white border-gray-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="primary" className="text-xs text-gray-600">Primary color</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-9 h-9 rounded-md border border-gray-200 shrink-0"
                      style={{ background: primaryColor }}
                    />
                    <Input
                      id="primary"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="bg-white border-gray-200 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bg-color" className="text-xs text-gray-600">Background color</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-9 h-9 rounded-md border border-gray-200 shrink-0"
                      style={{ background: bgColor }}
                    />
                    <Input
                      id="bg-color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="bg-white border-gray-200 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardShell>

          {/* Card 2 — Notifications */}
          <CardShell icon={Bell} title="Notifications" description="Choose which alerts the team receives.">
            <div className="space-y-4">
              <ToggleRow
                title="Email alerts"
                subtitle="Send a summary email when chats are escalated."
                defaultOn
              />
              <ToggleRow
                title="Slack alerts"
                subtitle="Post to #admissions-pulse on new escalations."
                defaultOn={false}
              />
              <ToggleRow
                title="Escalation sound trigger"
                subtitle="Play a short tone in active dashboard tabs."
                defaultOn
              />
            </div>
          </CardShell>

          {/* Card 3 — Privacy & Security */}
          <CardShell icon={Shield} title="Privacy & Security" description="Data residency and automatic cleanup policies.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Data residency</Label>
                <Select defaultValue="apac">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apac">Asia-Pacific (Singapore)</SelectItem>
                    <SelectItem value="eu">European Union (Frankfurt)</SelectItem>
                    <SelectItem value="us">United States (Virginia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow
                title="Automatic overnight log cleaning"
                subtitle="Purge raw conversation logs older than 90 days at 02:00 local time."
                defaultOn
              />
            </div>
          </CardShell>

          {/* Card 4 — Integrations */}
          <CardShell icon={Plug} title="Integrations" description="Connected services for messaging and learning.">
            <div className="divide-y divide-gray-100">
              <IntegrationRow name="WhatsApp Business API" status="Connected — Meta Cloud" defaultOn />
              <IntegrationRow name="Instagram Direct API"   status="Connected — Meta Cloud" defaultOn />
              <IntegrationRow name="Canvas LMS"              status="Sandbox connection"     defaultOn={false} />
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}
