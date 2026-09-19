"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
  X,
  WifiOff,
  ShieldAlert,
} from "lucide-react";
import { AiWorkspace } from "@/components/ai/AiWorkspace";
import type { AiGlobalSettings, AiPortalType } from "@/types/ai";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AuthState {
  status: "initializing" | "authenticated" | "unauthorized" | "error";
  error?: string;
}

export default function SuperAdminAiPage() {
  const { profile, loading: authLoading, bootstrapState } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "workspace" | "settings" | "analytics"
  >("workspace");
  const [settings, setSettings] = useState<AiGlobalSettings | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Determine auth state
  const getAuthState = useCallback((): AuthState => {
    if (
      authLoading ||
      bootstrapState === "AUTH_BOOTSTRAPPING" ||
      bootstrapState === "AUTHENTICATED"
    ) {
      return { status: "initializing" };
    }
    if (bootstrapState === "AUTH_ERROR") {
      return {
        status: "error",
        error: "Authentication error. Please log in again.",
      };
    }
    if (!profile) {
      return {
        status: "unauthorized",
        error: "No authenticated session found.",
      };
    }
    if (profile.role !== "super_admin") {
      return {
        status: "unauthorized",
        error: "Super Admin privileges required.",
      };
    }
    return { status: "authenticated" };
  }, [authLoading, bootstrapState, profile]);

  const authState = getAuthState();

  // Fetch settings and analytics only when authenticated
  const fetchData = useCallback(async () => {
    if (authState.status !== "authenticated") return;

    setDataLoading(true);
    setDataError(null);

    try {
      const [settingsRes, analyticsRes] = await Promise.all([
        fetch("/api/super-admin/ai/settings"),
        fetch("/api/super-admin/ai/usage"),
      ]);

      if (!settingsRes.ok) {
        if (settingsRes.status === 401 || settingsRes.status === 403) {
          throw new Error(
            "Session expired or unauthorized. Please log in again."
          );
        }
        throw new Error(`Failed to load settings: ${settingsRes.status}`);
      }
      if (!analyticsRes.ok) {
        console.warn("Analytics fetch failed:", analyticsRes.status);
      }

      const [settingsData, analyticsData] = await Promise.all([
        settingsRes.json(),
        analyticsRes.ok
          ? analyticsRes.json()
          : Promise.resolve({ analytics: null }),
      ]);

      setSettings(settingsData.settings);
      setAnalytics(analyticsData.analytics);
    } catch (error: any) {
      console.error("AI Page data fetch error:", error);
      setDataError(
        error?.message ||
          "Failed to load AI configuration. Please refresh the page."
      );
      if (
        error?.message?.includes("unauthorized") ||
        error?.message?.includes("Session expired")
      ) {
        // Clear auth cache and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("school_study_auth_session");
          localStorage.removeItem("ss_super_admin_verified");
          sessionStorage.removeItem("ss_super_admin_verified");
        }
        router.push("/super-admin/login");
      }
    } finally {
      setDataLoading(false);
    }
  }, [authState.status, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retry handler
  const handleRetry = () => {
    fetchData();
  };

  // Auth error handler - redirect to login
  useEffect(() => {
    if (authState.status === "unauthorized" || authState.status === "error") {
      const timer = setTimeout(() => {
        router.push("/super-admin/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authState.status, router]);

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
        toast.success("Settings saved and deployed!");
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings");
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

  // Render functions for each auth state
  const renderAuthInitializing = () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600" />
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Initializing AI Mode...
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verifying Super Admin session
        </p>
      </div>
    </div>
  );

  const renderAuthError = () => (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
          <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Denied
        </h2>
        <p className="text-slate-500 dark:text-slate-400">{authState.error}</p>
        <p className="text-xs text-slate-400">
          Redirecting to Super Admin login...
        </p>
      </div>
    </div>
  );

  const renderDataLoading = () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600" />
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Loading AI Configuration
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Fetching settings and analytics...
        </p>
      </div>
    </div>
  );

  const renderDataError = () => (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
          <WifiOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Failed to Load Data
        </h2>
        <p className="text-slate-500 dark:text-slate-400">{dataError}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );

  // Main render based on auth state
  if (authState.status === "initializing") {
    return <>{renderAuthInitializing()}</>;
  }

  if (authState.status === "unauthorized" || authState.status === "error") {
    return <>{renderAuthError()}</>;
  }

  if (dataLoading) {
    return <>{renderDataLoading()}</>;
  }

  if (dataError) {
    return <>{renderDataError()}</>;
  }

  // Authenticated and data loaded - render the AI workspace
  return (
    <div className="mx-0 h-full w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2 dark:border-slate-800">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            AI Mode & Platform Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Global configuration, portal access gates, plan quotas, and live
            assistant hub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick 1-Click Global AI Feature Master Toggle */}
          {settings && (
            <div className="flex items-center gap-2.5 rounded-xl border border-purple-200 bg-purple-50/70 px-3 py-1 dark:border-purple-800/60 dark:bg-purple-950/40">
              <span className="hidden text-xs font-bold text-purple-900 sm:inline dark:text-purple-200">
                Global AI Feature:
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const nextState = !settings.enabledGlobally;
                  const updated = { ...settings, enabledGlobally: nextState };
                  setSettings(updated);
                  try {
                    await fetch("/api/super-admin/ai/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updated),
                    });
                  } catch {}
                }}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-black shadow-xs transition ${
                  settings.enabledGlobally
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
              >
                {settings.enabledGlobally ? "ENABLED (ON)" : "DISABLED (OFF)"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 text-xs font-semibold dark:bg-slate-800">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === "workspace"
                  ? "bg-white text-purple-600 shadow-xs dark:bg-slate-900 dark:text-purple-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Assistant Workspace
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === "settings"
                  ? "bg-white text-purple-600 shadow-xs dark:bg-slate-900 dark:text-purple-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Access Control
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === "analytics"
                  ? "bg-white text-purple-600 shadow-xs dark:bg-slate-900 dark:text-purple-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Usage Analytics
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: WORKSPACE                                               */}
      {/* ============================================================== */}
      {activeTab === "workspace" && (
        <div className="h-[calc(100vh-16rem)] min-h-[600px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <AiWorkspace
            portal="super_admin"
            schoolName="Platform Global Governance"
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ACCESS CONTROL & SETTINGS                               */}
      {/* ============================================================== */}
      {activeTab === "settings" && settings && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Global AI Switch */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Global AI Mode Master Switch
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    When disabled, AI Mode is suspended platform-wide across all
                    portals immediately.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.enabledGlobally}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        enabledGlobally: e.target.checked,
                      })
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-purple-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700"></div>
                </label>
              </div>
            </div>

            {/* Portal Accessibility Matrix */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
                Portal Accessibility Matrix
              </h3>
              <p className="mb-5 text-xs text-slate-500">
                Independently control which user portals have AI Mode enabled.
              </p>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "super_admin",
                      label: "Super Admin",
                      desc: "Governance portal",
                    },
                    {
                      key: "school_admin",
                      label: "Principal / Admin",
                      desc: "School administration",
                    },
                    {
                      key: "teacher",
                      label: "Teacher & Faculty",
                      desc: "Academic management",
                    },
                    {
                      key: "student",
                      label: "Student Portal",
                      desc: "Study assistant",
                    },
                    {
                      key: "parent",
                      label: "Parent Portal",
                      desc: "Student progress liaison",
                    },
                    {
                      key: "accountant",
                      label: "Fee Collector",
                      desc: "Finance & ledger",
                    },
                  ] as const
                ).map(({ key, label, desc }) => {
                  const isChecked = settings.portalAccess[key];
                  return (
                    <div
                      key={key}
                      onClick={() => togglePortal(key)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                        isChecked
                          ? "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20"
                          : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {label}
                        </div>
                        <div className="text-xs text-slate-400">{desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded-md text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Plan Quotas */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
                Plan-Based Monthly Message Quotas
              </h3>
              <p className="mb-5 text-xs text-slate-500">
                Configure monthly AI prompt credits per subscription tier (-1
                indicates unlimited).
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(settings.monthlyQuotaPerPlan).map(
                  ([planKey, val]) => (
                    <div key={planKey} className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 capitalize dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Save & Deploy Settings
              </h3>
              <p className="text-xs text-slate-500">
                Changes take effect dynamically across all tenant portals
                without code redeployment.
              </p>

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Changes saved and active!
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Total AI Requests
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {analytics?.totalRequests || 0}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Requests This Month
              </div>
              <div className="mt-2 text-3xl font-black text-purple-600 dark:text-purple-400">
                {analytics?.requestsThisMonth || 0}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Active Portals
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {Object.keys(analytics?.byPortal || {}).length || 5}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              Recent AI Requests Audit Trail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase dark:border-slate-800">
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Portal</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Tokens</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                  {analytics?.recentRequests?.length > 0 ? (
                    analytics.recentRequests.map((req: any) => (
                      <tr key={req.id}>
                        <td className="px-3 py-2.5">
                          {new Date(req.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 font-semibold capitalize">
                          {req.portal}
                        </td>
                        <td className="px-3 py-2.5">{req.planId}</td>
                        <td className="px-3 py-2.5">
                          {req.totalTokens || 200}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400"
                      >
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
