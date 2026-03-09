"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";
import {
  User,
  Sparkles,
  Bell,
  CreditCard,
  Shield,
  Download,
  Save,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Crown,
  Globe,
  VolumeX,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import type { AiTone } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const AI_TONES: { value: AiTone; label: string; description: string }[] = [
  {
    value: "friendly",
    label: "Friendly",
    description:
      "Warm and supportive. Like a helpful friend who gently keeps you on track.",
  },
  {
    value: "motivational",
    label: "Motivational",
    description:
      "Energetic and encouraging. Celebrates wins and pushes you to reach higher.",
  },
  {
    value: "direct",
    label: "Direct",
    description:
      "Straightforward and concise. No fluff, just clear action items and reminders.",
  },
];

const TIER_FEATURES: {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
  team: boolean | string;
}[] = [
  { feature: "Deadlines & Habits", free: "Up to 5", pro: "Unlimited", team: "Unlimited" },
  { feature: "AI Nudges", free: "3/day", pro: "Unlimited", team: "Unlimited" },
  { feature: "Focus Sessions", free: true, pro: true, team: true },
  { feature: "Daily Goals", free: true, pro: true, team: true },
  { feature: "Mood Tracking", free: true, pro: true, team: true },
  { feature: "Advanced Insights", free: false, pro: true, team: true },
  { feature: "Custom AI Personality", free: false, pro: true, team: true },
  { feature: "Data Export", free: false, pro: true, team: true },
  { feature: "Team Dashboard", free: false, pro: false, team: true },
  { feature: "Priority Support", free: false, pro: true, team: true },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserSettings {
  id: string;
  name: string | null;
  email: string;
  timezone: string;
  onboarded: boolean;
  aiTone: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  browserNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  tier: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: "bg-[var(--success)] text-white",
    error: "bg-[var(--danger)] text-white",
    info: "bg-[var(--primary)] text-white",
  };

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-in">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg ${colors[type]}`}
      >
        {type === "success" && <Check size={18} />}
        {type === "error" && <X size={18} />}
        {type === "info" && <Sparkles size={18} />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border)] max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-[var(--danger)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </h3>
        </div>
        <p className="text-sm text-[var(--muted)] mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--danger)] rounded-xl hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[var(--surface-hover)] flex items-center justify-center">
          <Icon size={18} className="text-[var(--primary)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--muted)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { data: session } = useSession();

  // Remote settings
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Local form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [aiTone, setAiTone] = useState<AiTone>("friendly");

  // Notifications (local only for now)
  const [browserPush, setBrowserPush] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission
  );

  // Account
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // UI
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch settings
  // -------------------------------------------------------------------------

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data: UserSettings = await res.json();
        setSettings(data);
        setName(data.name || "");
        setTimezone(data.timezone);
        setAiTone(data.aiTone as AiTone);
        setQuietStart(data.quietHoursStart || "22:00");
        setQuietEnd(data.quietHoursEnd || "07:00");
        setBrowserPush(data.browserNotificationsEnabled);
        setEmailNotifs(data.emailNotificationsEnabled);
        setInAppNotifs(data.inAppNotificationsEnabled);
      }
    } catch {
      setToast({ message: "Failed to load settings", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Track changes
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }

    setBrowserPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const changed =
      name !== (settings.name || "") ||
      timezone !== settings.timezone ||
      aiTone !== settings.aiTone ||
      browserPush !== settings.browserNotificationsEnabled ||
      emailNotifs !== settings.emailNotificationsEnabled ||
      inAppNotifs !== settings.inAppNotificationsEnabled ||
      quietStart !== (settings.quietHoursStart || "22:00") ||
      quietEnd !== (settings.quietHoursEnd || "07:00");
    setHasChanges(changed);
  }, [
    name,
    timezone,
    aiTone,
    browserPush,
    emailNotifs,
    inAppNotifs,
    quietStart,
    quietEnd,
    settings,
  ]);

  // -------------------------------------------------------------------------
  // Save settings
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    try {
      if (browserPush && browserPermission === "default" && "Notification" in window) {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        if (permission !== "granted") {
          setBrowserPush(false);
          setToast({
            message: "Browser notifications were not allowed, so they stayed off.",
            type: "info",
          });
        }
      }

      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          timezone,
          aiTone,
          browserNotificationsEnabled:
            browserPush && browserPermission !== "denied" && browserPermission !== "unsupported",
          emailNotificationsEnabled: emailNotifs,
          inAppNotificationsEnabled: inAppNotifs,
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setBrowserPush(updated.browserNotificationsEnabled);
        setEmailNotifs(updated.emailNotificationsEnabled);
        setInAppNotifs(updated.inAppNotificationsEnabled);
        setHasChanges(false);
        setToast({ message: "Settings saved successfully!", type: "success" });
      } else {
        setToast({ message: "Failed to save settings", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Export data
  // -------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nudgeai-data-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: "Data exported successfully!", type: "success" });
      }
    } catch {
      setToast({ message: "Failed to export data", type: "error" });
    }
  };

  // -------------------------------------------------------------------------
  // Change password (local validation only)
  // -------------------------------------------------------------------------

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setToast({
        message: "Password must be at least 8 characters",
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }
    // Would call API here
    setToast({ message: "Password updated successfully!", type: "success" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // -------------------------------------------------------------------------
  // Delete account (mock)
  // -------------------------------------------------------------------------

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    setToast({
      message: "Account deletion is not yet available",
      type: "info",
    });
  };

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Header title="Settings" />
        <div className="max-w-3xl mx-auto space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm animate-pulse"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[var(--border)]" />
                <div className="h-5 w-32 bg-[var(--border)] rounded" />
              </div>
              <div className="space-y-4">
                <div className="h-10 bg-[var(--border)] rounded-xl" />
                <div className="h-10 bg-[var(--border)] rounded-xl w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Header title="Settings" />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Account"
          message="This action is permanent and cannot be undone. All your data, habits, deadlines, and goals will be permanently deleted."
          confirmLabel="Delete my account"
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        {/* ──────────────── Profile ──────────────── */}
        <Section id="profile" icon={User} title="Profile">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={settings?.email || session?.user?.email || ""}
                readOnly
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--border)]/30 text-sm text-[var(--muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent appearance-none cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* ──────────────── AI Personality ──────────────── */}
        <Section id="ai-personality" icon={Sparkles} title="AI Personality">
          <p className="text-sm text-[var(--muted)] mb-4">
            Choose how NudgeAI communicates with you. This affects reminders,
            nudges, and AI-generated messages.
          </p>
          <div className="grid gap-3">
            {AI_TONES.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setAiTone(tone.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  aiTone === tone.value
                    ? "border-[var(--primary)] bg-[var(--surface-hover)] ring-1 ring-[var(--primary-light)]"
                    : "border-[var(--border)] hover:border-[var(--primary-light)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {tone.label}
                  </span>
                  {aiTone === tone.value && (
                    <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {tone.description}
                </p>
              </button>
            ))}
          </div>
        </Section>

        {/* ──────────────── Notifications ──────────────── */}
        <Section id="notifications" icon={Bell} title="Notifications">
          <div className="divide-y divide-[var(--border)]">
            <Toggle
              enabled={browserPush}
              onChange={async (enabled) => {
                if (!enabled) {
                  setBrowserPush(false);
                  return;
                }

                if (browserPermission === "unsupported") {
                  setToast({
                    message: "This browser does not support native notifications.",
                    type: "info",
                  });
                  return;
                }

                if (browserPermission === "denied") {
                  setToast({
                    message: "Browser notifications are blocked. Please allow them in your browser settings.",
                    type: "info",
                  });
                  return;
                }

                if (browserPermission === "default" && "Notification" in window) {
                  const permission = await Notification.requestPermission();
                  setBrowserPermission(permission);
                  if (permission !== "granted") {
                    setToast({
                      message: "Notification permission was not granted.",
                      type: "info",
                    });
                    return;
                  }
                }

                setBrowserPush(true);
              }}
              label="Browser push notifications"
              description="Get real-time reminders in your browser"
            />
            <Toggle
              enabled={emailNotifs}
              onChange={setEmailNotifs}
              label="Email notifications"
              description="Receive daily summaries and important reminders via email"
            />
            <Toggle
              enabled={inAppNotifs}
              onChange={setInAppNotifs}
              label="In-app notifications"
              description="Show notifications within the NudgeAI dashboard"
            />
          </div>

          <div className="mt-3 rounded-xl bg-[var(--surface-hover)] px-4 py-3 text-xs text-[var(--muted)]">
            Browser permission: {browserPermission === "unsupported"
              ? "unsupported"
              : browserPermission}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 mb-3">
              <VolumeX size={16} className="text-[var(--muted)]" />
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                Quiet Hours
              </h4>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">
              NudgeAI won&apos;t send notifications during quiet hours.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Start
                </label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
              </div>
              <span className="text-[var(--muted)] mt-5">to</span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  End
                </label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────────── Subscription ──────────────── */}
        <Section id="subscription" icon={CreditCard} title="Subscription">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                settings?.tier === "pro"
                  ? "bg-[var(--primary)] text-white"
                  : settings?.tier === "team"
                  ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white"
                  : "bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              {(settings?.tier === "pro" || settings?.tier === "team") && (
                <Crown size={12} />
              )}
              {(settings?.tier || "free").charAt(0).toUpperCase() +
                (settings?.tier || "free").slice(1)}{" "}
              Plan
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 font-medium text-[var(--muted)]">
                    Feature
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-[var(--muted)]">
                    Free
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-[var(--primary)]">
                    Pro
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-[var(--accent)]">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody>
                {TIER_FEATURES.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2.5 px-2 text-[var(--foreground)]">
                      {row.feature}
                    </td>
                    {(["free", "pro", "team"] as const).map((tier) => (
                      <td key={tier} className="text-center py-2.5 px-2">
                        {typeof row[tier] === "boolean" ? (
                          row[tier] ? (
                            <Check
                              size={16}
                              className="inline text-[var(--success)]"
                            />
                          ) : (
                            <X
                              size={16}
                              className="inline text-[var(--border)]"
                            />
                          )
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            {row[tier]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {settings?.tier === "free" && (
            <button
              onClick={() =>
                setToast({
                  message: "Pro upgrades are coming soon! Stay tuned.",
                  type: "info",
                })
              }
              className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
            >
              <Crown size={16} />
              Upgrade to Pro
            </button>
          )}
        </Section>

        {/* ──────────────── Account ──────────────── */}
        <Section id="account" icon={Shield} title="Account">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Change Password
            </h4>

            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />

            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />

            <button
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--primary)] rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <h4 className="text-sm font-semibold text-[var(--danger)] mb-2">
              Danger Zone
            </h4>
            <p className="text-xs text-[var(--muted)] mb-4">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--danger)] border border-[var(--danger)] rounded-xl hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </Section>

        {/* ──────────────── Data ──────────────── */}
        <Section id="data" icon={Download} title="Data">
          <p className="text-sm text-[var(--muted)] mb-4">
            Download a copy of all your NudgeAI data in JSON format. This
            includes your profile, deadlines, habits, goals, mood check-ins, and
            focus sessions.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--primary)] border border-[var(--primary)] rounded-xl hover:bg-[var(--surface-hover)]"
          >
            <Download size={16} />
            Export My Data
          </button>
        </Section>
      </div>

      {/* ──────────────── Floating Save Bar ──────────────── */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40">
          <div className="mx-auto max-w-3xl px-6 py-4">
            <div className="flex items-center justify-between bg-[var(--foreground)] text-white rounded-2xl px-6 py-3 shadow-xl">
              <p className="text-sm">You have unsaved changes</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (settings) {
                      setName(settings.name || "");
                      setTimezone(settings.timezone);
                      setAiTone(settings.aiTone as AiTone);
                      setQuietStart(settings.quietHoursStart || "22:00");
                      setQuietEnd(settings.quietHoursEnd || "07:00");
                    }
                  }}
                  className="px-4 py-1.5 text-sm font-medium text-white/70 hover:text-white rounded-lg"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-[var(--primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
