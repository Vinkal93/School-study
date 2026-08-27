"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  Save,
  AlertTriangle,
  Layers,
  Sparkles,
  Eye,
  RefreshCw,
  Loader2,
  Check,
  X,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getGlobalAccessPolicy,
  updateGlobalAccessPolicy,
  DEFAULT_REMINDER_THRESHOLDS,
} from "@/lib/billing";
import type {
  GlobalAccessPolicy,
  ReminderThresholdConfig,
  ReminderFrequency,
  AccessMode,
} from "@/types";
import { toast } from "sonner";

const AVAILABLE_FEATURES = [
  { key: "dashboard", name: "Dashboard Access" },
  { key: "billing", name: "Billing & Subscriptions" },
  { key: "pricing", name: "Pricing Catalog" },
  { key: "profile", name: "Profile Management" },
  { key: "support", name: "Help & Support" },
  { key: "student_management", name: "Student Management" },
  { key: "teacher_management", name: "Teacher Management" },
  { key: "attendance_automation", name: "Attendance Automation" },
  { key: "notices_announcements", name: "Notices & Announcements" },
  { key: "advanced_reports", name: "Advanced Reports & Analytics" },
];

export default function AccessPolicyAdminPage() {
  const { profile } = useAuth();
  const [policy, setPolicy] = useState<GlobalAccessPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reminder Edit Modal
  const [editingReminder, setEditingReminder] = useState<ReminderThresholdConfig | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Live Simulation State (Section 24 - Pure In-Memory)
  const [simulatedState, setSimulatedState] = useState<"30d" | "15d" | "7d" | "3d" | "1d" | "expired" | "grace" | "restricted" | "no_access">("7d");

  const loadData = async () => {
    setLoading(true);
    try {
      const pol = await getGlobalAccessPolicy();
      setPolicy(pol);
    } catch (err) {
      toast.error("Failed to load global access policy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePolicy = async () => {
    if (!policy || !profile?.uid) return;
    setSaving(true);
    try {
      await updateGlobalAccessPolicy(policy, profile.uid);
      toast.success("Global subscription access policy updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update access policy.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminder = (id: string) => {
    if (!policy) return;
    const updatedReminders = policy.reminders.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r
    );
    setPolicy({ ...policy, reminders: updatedReminders });
  };

  const handleDeleteReminder = (id: string) => {
    if (!policy) return;
    const updatedReminders = policy.reminders.filter((r) => r.id !== id);
    setPolicy({ ...policy, reminders: updatedReminders });
    toast.success("Reminder threshold removed.");
  };

  const handleSaveReminderModal = () => {
    if (!editingReminder || !policy) return;
    if (editingReminder.daysBeforeExpiry < 0) {
      toast.error("Days before expiry must be a non-negative number.");
      return;
    }

    const isDuplicate = policy.reminders.some(
      (r) => r.id !== editingReminder.id && r.daysBeforeExpiry === editingReminder.daysBeforeExpiry
    );
    if (isDuplicate) {
      toast.error(`A reminder for ${editingReminder.daysBeforeExpiry} days already exists.`);
      return;
    }

    const exists = policy.reminders.some((r) => r.id === editingReminder.id);
    let updatedList: ReminderThresholdConfig[];
    if (exists) {
      updatedList = policy.reminders.map((r) =>
        r.id === editingReminder.id ? { ...editingReminder, updatedAt: new Date().toISOString() } : r
      );
    } else {
      updatedList = [...policy.reminders, { ...editingReminder, updatedAt: new Date().toISOString() }];
    }

    // Sort by days before expiry descending
    updatedList.sort((a, b) => b.daysBeforeExpiry - a.daysBeforeExpiry);

    setPolicy({ ...policy, reminders: updatedList });
    setShowReminderModal(false);
    setEditingReminder(null);
    toast.success("Reminder configuration saved.");
  };

  const toggleFeatureInGroup = (groupKey: "allowedFeaturesDuringGrace" | "allowedFeaturesWhenRestricted", featKey: string) => {
    if (!policy) return;
    const currentList = policy[groupKey] || [];
    const updated = currentList.includes(featKey)
      ? currentList.filter((f) => f !== featKey)
      : [...currentList, featKey];
    setPolicy({ ...policy, [groupKey]: updated });
  };

  if (loading || !policy) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calculate live preview output based on simulatedState (Section 24)
  const getSimulatedPreview = () => {
    switch (simulatedState) {
      case "30d":
        return {
          status: "EXPIRING",
          title: "Subscription Renewal Notice",
          message: "Your School Study plan expires in 30 days.",
          severity: "info",
          accessMode: "EXPIRING",
          showPopup: false,
          showBanner: true,
        };
      case "15d":
        return {
          status: "EXPIRING",
          title: "Plan Renewal Reminder",
          message: "Your plan expires in 15 days. Recharge early to avoid service interruption.",
          severity: "warning",
          accessMode: "EXPIRING",
          showPopup: false,
          showBanner: true,
        };
      case "7d":
        return {
          status: "EXPIRING",
          title: "Important: 7 Days Remaining",
          message: "Your plan expires in 7 days. Recharge now to keep your school running smoothly.",
          severity: "warning",
          accessMode: "EXPIRING",
          showPopup: true,
          showBanner: true,
        };
      case "3d":
        return {
          status: "EXPIRING",
          title: "Urgent: 3 Days Until Expiry",
          message: "Your plan expires in 3 days. Service disruption imminent without recharge.",
          severity: "critical",
          accessMode: "EXPIRING",
          showPopup: true,
          showBanner: true,
        };
      case "1d":
        return {
          status: "EXPIRING",
          title: "Final Warning: Expires Tomorrow",
          message: "Your plan expires tomorrow. Recharge immediately to retain full access.",
          severity: "critical",
          accessMode: "EXPIRING",
          showPopup: true,
          showBanner: true,
        };
      case "grace":
        return {
          status: "GRACE_PERIOD",
          title: "Plan Expired (Grace Period Active)",
          message: `Your plan has expired. Operating under grace period (${policy.gracePeriodDays} days). Recharge now.`,
          severity: "expired",
          accessMode: policy.graceAccessMode || "FULL_ACCESS",
          showPopup: true,
          showBanner: true,
        };
      case "restricted":
        return {
          status: "RESTRICTED",
          title: "Subscription Expired — Restricted Access Mode",
          message: "Your grace period has ended. Access is limited to allowed features.",
          severity: "expired",
          accessMode: "RESTRICTED_ACCESS",
          showPopup: true,
          showBanner: true,
        };
      case "no_access":
        return {
          status: "NO_ACCESS",
          title: "Your School Study Subscription Has Expired",
          message: "Platform access has been suspended. Please recharge your subscription to continue.",
          severity: "expired",
          accessMode: "NO_ACCESS",
          showPopup: true,
          showBanner: true,
        };
      default:
        return {
          status: "EXPIRED",
          title: "Plan Expired",
          message: "Your plan has expired. Recharge to restore full access.",
          severity: "expired",
          accessMode: "RESTRICTED_ACCESS",
          showPopup: true,
          showBanner: true,
        };
    }
  };

  const previewInfo = getSimulatedPreview();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Subscription Access Policy
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure expiry reminders, grace periods, restricted feature access, and automated lifecycle behaviors.
          </p>
        </div>

        <button
          onClick={handleSavePolicy}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Access Policy
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Reminders & Policy (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Reminder Schedule Configurator (Sections 3 & 4) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Reminder Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated warnings delivered to School Admins before plan expiry.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingReminder({
                    id: `rem_${Date.now()}`,
                    daysBeforeExpiry: 5,
                    enabled: true,
                    priority: "medium",
                    title: "Plan Renewal Reminder",
                    message: "Your plan expires in ${daysRemaining} days. Recharge now.",
                    showPopup: true,
                    showBanner: true,
                    showRechargeButton: true,
                    frequency: "SHOW_DAILY",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  setShowReminderModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Threshold
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              {policy.reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !rem.enabled ? "opacity-60 bg-slate-50/50 dark:bg-slate-950/50" : "bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={rem.enabled}
                      onChange={() => handleToggleReminder(rem.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {rem.daysBeforeExpiry} Days Before Expiry
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            rem.priority === "urgent"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : rem.priority === "high"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {rem.priority}
                        </span>
                        <span className="text-[10px] text-slate-500 border border-slate-200 dark:border-slate-800 px-1.5 rounded">
                          {rem.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        "{rem.message}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setEditingReminder(rem);
                        setShowReminderModal(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Grace Period & Expiry Mode Configurator (Sections 13, 14, 15) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Grace Period & Expiry Access Policy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Grace Period Duration (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={policy.gracePeriodDays}
                  onChange={(e) => setPolicy({ ...policy, gracePeriodDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Access Mode After Grace Period
                </label>
                <select
                  value={policy.expiredAccessMode}
                  onChange={(e) => setPolicy({ ...policy, expiredAccessMode: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                >
                  <option value="RESTRICTED_ACCESS">RESTRICTED ACCESS (Allow configured pages)</option>
                  <option value="NO_ACCESS">NO ACCESS (Full billing lock screen)</option>
                </select>
              </div>
            </div>

            {/* Allowed Features Matrix */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Allowed Features During Restricted Mode
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FEATURES.map((feat) => {
                  const isChecked = policy.allowedFeaturesWhenRestricted.includes(feat.key);
                  return (
                    <label
                      key={feat.key}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 text-blue-900 dark:text-blue-300"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFeatureInGroup("allowedFeaturesWhenRestricted", feat.key)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{feat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulation Section (Section 24) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-base font-extrabold">Super Admin Live Preview</h2>
              </div>
              <span className="text-[10px] font-extrabold bg-blue-900 text-blue-300 px-2 py-0.5 rounded-md">
                In-Memory Simulator
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Simulate subscriber experience without modifying real production data.
            </p>

            {/* Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Select Simulated Subscription State:
              </label>
              <select
                value={simulatedState}
                onChange={(e) => setSimulatedState(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 text-white font-bold rounded-xl px-3 py-2 text-xs"
              >
                <option value="30d">30 Days Before Expiry</option>
                <option value="15d">15 Days Before Expiry</option>
                <option value="7d">7 Days Before Expiry (Popup Enabled)</option>
                <option value="3d">3 Days Before Expiry (Urgent)</option>
                <option value="1d">1 Day Before Expiry (Final Warning)</option>
                <option value="grace">In Grace Period</option>
                <option value="restricted">Restricted Access Mode</option>
                <option value="no_access">No Access (Lock Screen)</option>
              </select>
            </div>

            {/* Simulated UI Rendering */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Simulated Banner Preview:
              </div>
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  previewInfo.severity === "critical" || previewInfo.severity === "expired"
                    ? "bg-red-950/80 border-red-800 text-red-200"
                    : previewInfo.severity === "warning"
                    ? "bg-amber-950/80 border-amber-800 text-amber-200"
                    : "bg-blue-950/80 border-blue-800 text-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <BellRing className="h-4 w-4 shrink-0" />
                  <span className="truncate">{previewInfo.message}</span>
                </div>
                {policy.showRechargeButton && (
                  <span className="text-[10px] font-extrabold bg-white text-slate-900 px-2 py-1 rounded-md shrink-0">
                    Recharge Now
                  </span>
                )}
              </div>

              {previewInfo.showPopup && (
                <>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2">
                    Simulated Modal Popup Preview:
                  </div>
                  <div className="bg-white text-slate-900 rounded-xl p-4 shadow-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        {previewInfo.title}
                      </h4>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {previewInfo.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{previewInfo.message}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button className="flex-1 bg-blue-600 text-white text-xs font-extrabold py-1.5 rounded-lg">
                        Recharge Now
                      </button>
                      <button className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-1.5 rounded-lg">
                        Remind Me Later
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Reminder Modal */}
      {showReminderModal && editingReminder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Edit Reminder Threshold
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Days Before Expiry
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingReminder.daysBeforeExpiry}
                  onChange={(e) =>
                    setEditingReminder({
                      ...editingReminder,
                      daysBeforeExpiry: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={editingReminder.priority}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, priority: e.target.value as any })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Frequency
                </label>
                <select
                  value={editingReminder.frequency}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, frequency: e.target.value as any })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  <option value="SHOW_ONCE">Show Once</option>
                  <option value="SHOW_DAILY">Show Daily</option>
                  <option value="SHOW_ON_LOGIN">Show On Login</option>
                  <option value="SHOW_UNTIL_ACTION">Show Until Action</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingReminder.title}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, title: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message (Supports {"${daysRemaining}"})
                </label>
                <textarea
                  value={editingReminder.message}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, message: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReminderModal}
                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Save Threshold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
