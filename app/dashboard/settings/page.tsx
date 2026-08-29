"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import {
  isWorkspaceAdminRole,
  type UserProfile,
  type WorkspaceSettings,
} from "@/src/lib/workspace";
import { cn } from "@/src/lib/utils";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { AppButton } from "@/src/components/ui/app-button";

const EMPTY_SETTINGS: WorkspaceSettings = {
  id: "",
  name: "",
  slug: "",
  status: "active",
  plan: "pilot",
  logo_url: "",
  primary_color: "#14B8A6",
  welcome_message: "",
  assistant_name: "",
  support_email: "",
  industry: "",
  website: "",
  updated_at: null,
};

const fieldClassName =
  "h-12 rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]";

function getContrastText(hex: string): string {
  const value = (hex || "").replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#04110e" : "#ffffff";
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (!currentProfile || !isWorkspaceAdminRole(currentProfile.role)) {
        router.replace("/dashboard");
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/workspace/settings", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setError("Failed to load workspace settings");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSettings(data.workspace);
      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleChange = (field: keyof WorkspaceSettings, value: string) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save workspace settings");
      }

      setSettings(data.workspace);
      setMessage("Workspace settings updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save workspace settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (profile && !isWorkspaceAdminRole(profile.role)) {
    return null;
  }

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Configuration"
        title="Workspace settings"
        subtitle="Customize your workspace identity, branding, and assistant persona."
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8 text-sm text-[var(--ink-soft)] font-medium">
          <Loader2 size={18} className="animate-spin text-[var(--ink-muted)]" />
          Loading workspace settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="admin-shell-card border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                    Workspace Profile
                  </h2>
                  <p className="text-xs text-[var(--ink-muted)] font-medium">
                    Core metadata used across the platform.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Organization Name">
                  <Input
                    value={settings.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={fieldClassName}
                    placeholder="Acme Corp"
                  />
                </Field>
                <Field label="System Identifier">
                  <Input
                    value={settings.slug || ""}
                    disabled
                    className={`${fieldClassName} bg-[var(--surface-2)] text-[var(--ink-muted)] border-dashed`}
                  />
                </Field>
                <Field label="Assistant Persona">
                  <Input
                    value={settings.assistant_name || ""}
                    onChange={(e) =>
                      handleChange("assistant_name", e.target.value)
                    }
                    className={fieldClassName}
                    placeholder="Rekall-IQ AI"
                  />
                </Field>
                <Field label="Primary Brand Color">
                  <div className="relative">
                    <Input
                      value={settings.primary_color || ""}
                      onChange={(e) =>
                        handleChange("primary_color", e.target.value)
                      }
                      className={fieldClassName}
                      placeholder="#1e293b"
                    />
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-[var(--line)]"
                      style={{
                        backgroundColor: settings.primary_color || "#14B8A6",
                      }}
                    />
                  </div>
                </Field>
                <Field label="Operational Email">
                  <Input
                    value={settings.support_email || ""}
                    onChange={(e) =>
                      handleChange("support_email", e.target.value)
                    }
                    className={fieldClassName}
                    placeholder="admin@company.com"
                  />
                </Field>
                <Field label="Official Website">
                  <Input
                    value={settings.website || ""}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className={fieldClassName}
                    placeholder="https://company.com"
                  />
                </Field>
                <Field label="Industry Sector">
                  <Input
                    value={settings.industry || ""}
                    onChange={(e) => handleChange("industry", e.target.value)}
                    className={fieldClassName}
                    placeholder="Technology"
                  />
                </Field>
                <Field label="Global Logo Assets">
                  <Input
                    value={settings.logo_url || ""}
                    onChange={(e) => handleChange("logo_url", e.target.value)}
                    className={fieldClassName}
                    placeholder="https://assets.company.com/logo.png"
                  />
                </Field>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--line)]">
                <Field label="Default System Welcome">
                  <Textarea
                    rows={4}
                    value={settings.welcome_message || ""}
                    onChange={(e) =>
                      handleChange("welcome_message", e.target.value)
                    }
                    className={`${fieldClassName} min-h-28 resize-none leading-relaxed`}
                    placeholder="Describe how the assistant should greet users..."
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-6">
              <div className="admin-shell-card border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)] mb-6">
                  Interface Preview
                </p>
                <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
                  <div className="flex items-center gap-4">
                    {settings.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt={settings.name || "Workspace logo"}
                        className="h-12 w-12 rounded-2xl object-cover border border-[var(--line)] shadow-sm"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl font-bold shadow-sm"
                        style={{
                          backgroundColor: settings.primary_color || "#14B8A6",
                          color: getContrastText(settings.primary_color || "#14B8A6"),
                        }}
                      >
                        {(settings.name || "S").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)] leading-tight">
                        {settings.name || "Enterprise Workspace"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mt-0.5">
                        {settings.assistant_name || "System Assistant"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-2">
                        Greeting Simulation
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--ink-soft)] italic">
                        "
                        {settings.welcome_message ||
                          "Ask questions from your approved company documents."}
                        "
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                          Support
                        </p>
                        <p className="text-[11px] font-bold text-[var(--ink)] truncate">
                          {settings.support_email || "Not configured"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                          Sector
                        </p>
                        <p className="text-[11px] font-bold text-[var(--ink)] truncate">
                          {settings.industry || "Global"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] p-4">
                  <p className="text-[10px] font-bold leading-relaxed text-[var(--accent-jade)]">
                    Changes made here will propagate across all user sessions
                    immediately upon saving.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(message || error) && (
            <Alert
              className={cn(
                "rounded-2xl",
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              )}
            >
              <AlertDescription>{error || message}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-6">
            <AppButton
              type="submit"
              disabled={saving}
              className="inline-flex w-full px-8 sm:w-auto"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </AppButton>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] ml-1">
        {label}
      </span>
      {children}
    </div>
  );
}
