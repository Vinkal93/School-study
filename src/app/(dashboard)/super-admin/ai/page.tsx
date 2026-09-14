"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  Sliders,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Zap,
  Building2,
  Users,
  MessageSquare,
} from "lucide-react";
import { AiWorkspace } from "@/components/ai/AiWorkspace";
import type { AiGlobalSettings, AiPortalType } from "@/types/ai";

export default function SuperAdminAiPage() {
  const [activeTab, setActiveTab] = useState<"workspace" | "settings" | "analytics">("workspace");
  const [settings, setSettings] = useState<AiGlobalSettings | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAnalytics();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/super-admin/ai/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/super-admin/ai/usage");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (e) {}
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/super-admin/ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const togglePortal = (portalKey: AiPortalType) => {
    if (!settings) return;
    setSettings({
      ...settings,
      portalAccess: {
        ...settings.portalAccess,
        [portalKey]: !settings.portalAccess[portalKey],
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            AI Mode & Platform Intelligence
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Global configuration, portal access gates, plan quotas, and live assistant hub.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`py-1.5 px-3.5 rounded-lg transition ${
              activeTab === "workspace"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Assistant Workspace
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-1.5 px-3.5 rounded-lg transition ${
              activeTab === "settings"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Access Control
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-1.5 px-3.5 rounded-lg transition ${
              activeTab === "analytics"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Usage Analytics
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: WORKSPACE                                               */}
      {/* ============================================================== */}
      {activeTab === "workspace" && (
        <AiWorkspace portal="super_admin" schoolName="Platform Global Governance" />
      )}

      {/* ============================================================== */}
      {/* TAB 2: ACCESS CONTROL & SETTINGS                               */}
      {/* ============================================================== */}
      {activeTab === "settings" && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Global AI Switch */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Global AI Mode Master Switch
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    When disabled, AI Mode is suspended platform-wide across all portals immediately.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabledGlobally}
                    onChange={(e) =>
                      setSettings({ ...settings, enabledGlobally: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Portal Accessibility Matrix */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Portal Accessibility Matrix
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Independently control which user portals have AI Mode enabled.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(
                  [
                    { key: "super_admin", label: "Super Admin", desc: "Governance portal" },
                    { key: "school_admin", label: "Principal / Admin", desc: "School administration" },
                    { key: "teacher", label: "Teacher & Faculty", desc: "Academic management" },
                    { key: "student", label: "Student Portal", desc: "Study assistant" },
                    { key: "parent", label: "Parent Portal", desc: "Student progress liaison" },
                    { key: "accountant", label: "Fee Collector", desc: "Finance & ledger" },
                  ] as const
                ).map(({ key, label, desc }) => {
                  const isChecked = settings.portalAccess[key];
                  return (
                    <div
                      key={key}
                      onClick={() => togglePortal(key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isChecked
                          ? "bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800"
                          : "bg-gray-50/50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-800"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {label}
                        </div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 text-purple-600 rounded-md focus:ring-purple-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Plan Quotas */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Plan-Based Monthly Message Quotas
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Configure monthly AI prompt credits per subscription tier (-1 indicates unlimited).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(settings.monthlyQuotaPerPlan).map(([planKey, val]) => (
                  <div key={planKey} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {planKey.replace("plan_", "")} Plan
                    </label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          monthlyQuotaPerPlan: {
                            ...settings.monthlyQuotaPerPlan,
                            [planKey]: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Save & Deploy Settings
              </h3>
              <p className="text-xs text-gray-500">
                Changes take effect dynamically across all tenant portals without code redeployment.
              </p>

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Changes saved and active!
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: USAGE ANALYTICS                                         */}
      {/* ============================================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="text-xs font-semibold text-gray-400 uppercase">Total AI Requests</div>
              <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                {analytics?.totalRequests || 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="text-xs font-semibold text-gray-400 uppercase">Requests This Month</div>
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
                {analytics?.requestsThisMonth || 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="text-xs font-semibold text-gray-400 uppercase">Active Portals</div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {Object.keys(analytics?.byPortal || {}).length || 5}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              Recent AI Requests Audit Trail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Portal</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Tokens</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
                  {analytics?.recentRequests?.length > 0 ? (
                    analytics.recentRequests.map((req: any) => (
                      <tr key={req.id}>
                        <td className="py-2.5 px-3">{new Date(req.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-semibold capitalize">{req.portal}</td>
                        <td className="py-2.5 px-3">{req.planId}</td>
                        <td className="py-2.5 px-3">{req.totalTokens || 200}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No requests logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
