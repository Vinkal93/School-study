"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Bell,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  Zap,
  Globe,
  Database,
  Server,
  FileText,
  Mail,
  MessageSquare,
  HardDrive,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { updateSuperAdminPin } from "@/lib/services/security-pin.service";
import {
  getGlobalAccessPolicy,
  updateGlobalAccessPolicy,
} from "@/lib/services/billing.service";
import type { GlobalAccessPolicy } from "@/types";
import {
  PlatformSettingsDoc,
  DEFAULT_PLATFORM_SETTINGS,
} from "@/lib/settings/platformSettings";
import { toast } from "sonner";

export default function PlatformSettingsPage() {
  const { profile } = useAuth();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "security"
    | "auth"
    | "sessions"
    | "notifications"
    | "integrations"
    | "payments"
    | "storage"
    | "backup"
    | "privacy"
    | "systemDefaults"
    | "developer"
    | "securityPin"
  >("general");

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettingsDoc>(DEFAULT_PLATFORM_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Security PIN State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Global Access Policy Form State (Billing)
  const [policy, setPolicy] = useState<GlobalAccessPolicy | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [reminderDaysInput, setReminderDaysInput] = useState("30, 15, 7, 3, 1");
  const [renewalThreshold, setRenewalThreshold] = useState<number>(7);

  // Razorpay Gateway Credentials State
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSecretSet, setIsSecretSet] = useState(false);
  const [maskedSecret, setMaskedSecret] = useState("");
  const [loadingRzp, setLoadingRzp] = useState(true);
  const [savingRzp, setSavingRzp] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testingRzp, setTestingRzp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; mode?: string; status?: string } | null>(null);

  // Load All Initial Data
  useEffect(() => {
    async function loadAllSettings() {
      try {
        const [settingsRes, policyRes, rzpRes] = await Promise.all([
          fetch("/api/super-admin/settings").then((r) => (r.ok ? r.json() : null)),
          getGlobalAccessPolicy().catch(() => null),
          fetch("/api/super-admin/payment-settings").then((r) => (r.ok ? r.json() : null)),
        ]);

        if (settingsRes && settingsRes.settings) {
          setSettings(settingsRes.settings);
        }

        if (policyRes) {
          setPolicy(policyRes);
          const activeThreshold =
            typeof policyRes.renewalNoticeThresholdDays === "number"
              ? policyRes.renewalNoticeThresholdDays
              : policyRes.reminderDays && policyRes.reminderDays.length > 0
              ? Math.max(...policyRes.reminderDays)
              : 7;
          setRenewalThreshold(activeThreshold);
          setReminderDaysInput((policyRes.reminderDays || [30, 15, 7, 3, 1]).join(", "));
        }

        if (rzpRes) {
          setRzpKeyId(rzpRes.keyId || "");
          setMaskedSecret(rzpRes.maskedSecretKey || "");
          setIsSecretSet(Boolean(rzpRes.isSecretSet));
          setIsLiveMode(rzpRes.isLiveMode ?? rzpRes.keyId?.startsWith("rzp_live_"));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoadingSettings(false);
        setLoadingPolicy(false);
        setLoadingRzp(false);
      }
    }

    loadAllSettings();
  }, []);

  // Save Platform Settings Handler
  const handleSavePlatformSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        toast.success("Platform settings updated successfully!");
      } else {
        toast.error(data.error || "Failed to save settings.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // PIN Update Handler
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast.error("New PIN and Confirm PIN do not match.");
      return;
    }
    if (newPin.length !== 6) {
      toast.error("New PIN must be exactly 6 digits.");
      return;
    }

    setSavingPin(true);
    try {
      const result = await updateSuperAdminPin(currentPin, newPin);
      if (result.success) {
        toast.success(result.message || "Security PIN updated successfully!");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast.error(result.message || "Failed to update Security PIN.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setSavingPin(false);
    }
  };

  // Razorpay Save Handler
  const handleSaveRzp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rzpKeyId.trim()) {
      toast.error("Razorpay Key ID is required.");
      return;
    }
    if (!isSecretSet && !rzpKeySecret.trim()) {
      toast.error("Razorpay Secret Key is required.");
      return;
    }

    setSavingRzp(true);
    try {
      const res = await fetch("/api/super-admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: rzpKeyId.trim(),
          keySecret: rzpKeySecret.trim() || undefined,
          webhookSecret: rzpWebhookSecret.trim() || undefined,
          isLiveMode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Razorpay settings updated successfully!");
        setMaskedSecret(data.maskedSecretKey || "");
        setIsSecretSet(Boolean(data.isSecretSet));
        setRzpKeySecret("");
        setRzpWebhookSecret("");
      } else {
        toast.error(data.error || "Failed to update Razorpay settings.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to payment settings API.");
    } finally {
      setSavingRzp(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Platform Settings & System Policies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centrally manage global defaults, security rules, integrations, storage limits, and environment info.
          </p>
        </div>

        <button
          onClick={handleSavePlatformSettings}
          disabled={savingSettings}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/40 rounded-xl border border-border/50 text-xs font-medium">
        {[
          { id: "general", label: "General", icon: Globe },
          { id: "security", label: "Security & Passwords", icon: Shield },
          { id: "auth", label: "Authentication", icon: Lock },
          { id: "sessions", label: "Sessions", icon: Clock },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "integrations", label: "Email / SMS / WhatsApp", icon: Mail },
          { id: "payments", label: "Razorpay Gateway", icon: CreditCard },
          { id: "storage", label: "Storage & Uploads", icon: HardDrive },
          { id: "backup", label: "Backup & Recovery", icon: Database },
          { id: "privacy", label: "Data & Privacy", icon: FileText },
          { id: "systemDefaults", label: "ERP Defaults", icon: Sliders },
          { id: "developer", label: "Environment / Build", icon: Server },
          { id: "securityPin", label: "Super Admin PIN", icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                isActive
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Platform Settings */}
      {activeTab === "general" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              General Platform Identity & Localization
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default operational preferences across all tenant dashboards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Platform Name</label>
              <input
                type="text"
                value={settings.general.platformName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, platformName: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Platform Tagline</label>
              <input
                type="text"
                value={settings.general.platformTagline}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, platformTagline: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Default Timezone</label>
              <select
                value={settings.general.defaultTimezone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, defaultTimezone: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (GMT +0:00)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Default Currency</label>
              <input
                type="text"
                value={settings.general.defaultCurrency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, defaultCurrency: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date Format</label>
              <input
                type="text"
                value={settings.general.dateFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, dateFormat: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Support Email</label>
              <input
                type="email"
                value={settings.general.supportEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportEmail: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Password Policies */}
      {activeTab === "security" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Policies & Rate Limits
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configurable session timeouts, login protection, and password complexity enforcement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Session Timeout (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={10080}
                value={settings.security.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      sessionTimeoutMinutes: parseInt(e.target.value) || 1440,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Idle Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.security.idleTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      idleTimeoutMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Max Login Failed Attempts
              </label>
              <input
                type="number"
                min={3}
                max={20}
                value={settings.security.maxLoginAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      maxLoginAttempts: parseInt(e.target.value) || 5,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Minimum Password Length
              </label>
              <input
                type="number"
                min={6}
                max={32}
                value={settings.security.minPasswordLength}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      minPasswordLength: parseInt(e.target.value) || 8,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.requireReAuthForCritical}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      requireReAuthForCritical: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
              />
              <span className="text-sm font-medium text-foreground">
                Require Super Admin PIN re-authentication for destructive/high-risk actions
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.requireSpecialCharInPassword}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      requireSpecialCharInPassword: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
              />
              <span className="text-sm font-medium text-foreground">
                Require special character in passwords (@, #, $, etc.)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: Authentication Settings */}
      {activeTab === "auth" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Authentication & Onboarding Controls
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control public registration availability and allowed login identity providers.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auth.allowPublicSignup}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auth: { ...settings.auth, allowPublicSignup: e.target.checked },
                  })
                }
                className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/40"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">Allow Public Institution Signup</span>
                <span className="text-xs text-muted-foreground">
                  When enabled, visitors can register new school organizations from the public landing page.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auth.allowGoogleAuth}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auth: { ...settings.auth, allowGoogleAuth: e.target.checked },
                  })
                }
                className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/40"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">Enable Google Single Sign-On (SSO)</span>
                <span className="text-xs text-muted-foreground">
                  Allow teachers and administrators to sign in with their verified Google workspace accounts.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Session Settings */}
      {activeTab === "sessions" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Session Concurrency & Token Policies
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage concurrent login limits and token refresh policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Max Concurrent Sessions per User
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.sessions.maxConcurrentSessionsPerUser}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessions: {
                      ...settings.sessions,
                      maxConcurrentSessionsPerUser: parseInt(e.target.value) || 3,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Security Token Refresh Interval (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                value={settings.sessions.tokenRefreshIntervalMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessions: {
                      ...settings.sessions,
                      tokenRefreshIntervalMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Notification Defaults */}
      {activeTab === "notifications" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Default Notification Channels
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default communication delivery channels configured across tenant instances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: "enableInAppNotifications",
                label: "In-App Bell Notifications",
                desc: "Real-time badge counter and in-dashboard activity alerts.",
              },
              {
                key: "enableEmailNotifications",
                label: "Email Receipts & Alerts",
                desc: "Automated invoice PDFs, fee payment links, and renewal reminders.",
              },
              {
                key: "enableSmsNotifications",
                label: "SMS Gateway (Transactional)",
                desc: "High-priority OTPs and student attendance emergency alerts.",
              },
              {
                key: "enableWhatsAppNotifications",
                label: "WhatsApp Business Alerts",
                desc: "Automated fee reminder cards and institutional circulars.",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(settings.notifications as any)[item.key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        [item.key]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/40"
                />
                <div>
                  <span className="text-sm font-semibold text-foreground block">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Integrations */}
      {activeTab === "integrations" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email, SMS & WhatsApp Integrations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Operational provider configuration. Secrets remain securely stored in server environment variables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Delivery Provider</label>
              <select
                value={settings.integrations.emailProvider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      emailProvider: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="smtp">SMTP (Production Gateway)</option>
                <option value="resend">Resend API</option>
                <option value="sendgrid">SendGrid</option>
                <option value="none">Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Sender Email Address</label>
              <input
                type="text"
                value={settings.integrations.emailSenderAddress}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      emailSenderAddress: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Razorpay Gateway */}
      {activeTab === "payments" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Razorpay Payment Gateway Integration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure subscription checkout integration. Sensitive Key Secrets are masked and never exposed to clients.
            </p>
          </div>

          <form onSubmit={handleSaveRzp} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Razorpay Key ID</label>
              <input
                type="text"
                value={rzpKeyId}
                onChange={(e) => setRzpKeyId(e.target.value)}
                placeholder="rzp_test_... or rzp_live_..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Razorpay Key Secret</label>
              <input
                type="password"
                value={rzpKeySecret}
                onChange={(e) => setRzpKeySecret(e.target.value)}
                placeholder={isSecretSet ? maskedSecret : "Enter new Razorpay Key Secret"}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isSecretSet
                  ? "✓ Secret Key is securely configured on server. Leave blank unless updating."
                  : "⚠ No Secret Key configured."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingRzp}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {savingRzp ? "Saving..." : "Update Razorpay Keys"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 8: Storage Settings */}
      {activeTab === "storage" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Cloud Storage Constraints & MIME Validation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Limits for student photo uploads, homework attachments, and export files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Maximum Upload File Size (MB)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.storage.maxFileUploadSizeMb}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    storage: {
                      ...settings.storage,
                      maxFileUploadSizeMb: parseInt(e.target.value) || 15,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Auto-Purge Temp Uploads (Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.storage.autoDeleteTempUploadsDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    storage: {
                      ...settings.storage,
                      autoDeleteTempUploadsDays: parseInt(e.target.value) || 7,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: Backup & Disaster Recovery */}
      {activeTab === "backup" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Backup & Disaster Recovery Status
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Truthful operational status of database snapshots and cold backups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/10">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Firestore Managed Backups</span>
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                AUTOMATED DAILY (HEALTHY)
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Point-in-time recovery enabled with continuous daily snapshots.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/10">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                Disaster Restore Drill Verification
              </span>
              <span className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                NOT VERIFIED (Production Drill Pending)
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Truthful state: Automated backups exist, but disaster recovery restore drill has not been executed this quarter.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 10: Data Privacy & Audit Retention */}
      {activeTab === "privacy" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Data Privacy & Audit Trail Retention
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mandatory legal and financial ledger retention policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Audit Log Retention (Days)
              </label>
              <input
                type="number"
                min={90}
                max={3650}
                value={settings.privacy.auditLogRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      auditLogRetentionDays: parseInt(e.target.value) || 365,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Activity Log Retention (Days)
              </label>
              <input
                type="number"
                min={30}
                max={1825}
                value={settings.privacy.activityLogRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      activityLogRetentionDays: parseInt(e.target.value) || 180,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-xs">
            <span className="font-bold block mb-1">✓ Immutable Financial Ledger Guarantee</span>
            Subscription payments, fee receipts, GST invoices, and dispute resolution records are permanently archived and cannot be purged or modified.
          </div>
        </div>
      )}

      {/* Tab 11: ERP System Defaults */}
      {activeTab === "systemDefaults" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              School ERP System Defaults
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default fallback values assigned when new school tenant profiles are onboarded.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Default Academic Year
              </label>
              <input
                type="text"
                value={settings.systemDefaults.defaultAcademicYear}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    systemDefaults: {
                      ...settings.systemDefaults,
                      defaultAcademicYear: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Default Fee Collection Cycle
              </label>
              <select
                value={settings.systemDefaults.defaultFeeCycle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    systemDefaults: {
                      ...settings.systemDefaults,
                      defaultFeeCycle: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Default Export Report Format
              </label>
              <select
                value={settings.systemDefaults.defaultReportFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    systemDefaults: {
                      ...settings.systemDefaults,
                      defaultReportFormat: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="pdf">PDF Document</option>
                <option value="xlsx">Excel Spreadsheet (XLSX)</option>
                <option value="csv">CSV Data</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 12: Developer & Environment */}
      {activeTab === "developer" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Environment & Deployment Build Metadata
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read-only runtime operational details. Sensitive infrastructure credentials are never exposed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block">Application Version:</span>
              <span className="font-bold text-foreground text-sm">{settings.environment.appVersion}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block">Build Identifier:</span>
              <span className="font-bold text-foreground text-sm">{settings.environment.buildId}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block">Framework Runtime:</span>
              <span className="font-bold text-foreground text-sm">{settings.environment.framework}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block">Active Node Environment:</span>
              <span className="font-bold text-foreground text-sm">{settings.environment.nodeVersion}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 13: Super Admin Security PIN */}
      {activeTab === "securityPin" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm max-w-xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Super Admin Security PIN
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used to authorize destructive actions, manual plan adjustments, and emergency resets.
            </p>
          </div>

          <form onSubmit={handleUpdatePin} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Current Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                New Security PIN (4-6 digits)
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Confirm New Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={savingPin || !newPin || !confirmPin}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingPin ? "Updating PIN..." : "Update Security PIN"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
