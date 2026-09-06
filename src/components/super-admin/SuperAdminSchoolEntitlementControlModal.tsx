"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Shield,
  Zap,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Loader2,
  Lock,
  Unlock,
  Sliders,
  Check,
  Ban,
  ArrowRight,
  ShieldCheck,
  Layers,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Users,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { safeFetchJson } from "@/lib/utils/safeFetch";
import type { SchoolSubscription } from "@/types";

interface SuperAdminSchoolEntitlementControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  onUpdated?: () => void;
}

export function SuperAdminSchoolEntitlementControlModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  onUpdated,
}: SuperAdminSchoolEntitlementControlModalProps) {
  const [activeTab, setActiveTab] = useState<"plan" | "control_mode" | "limits" | "matrix">("plan");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Subscription & Entitlements state
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [controlMode, setControlMode] = useState<"PLAN_DEFAULT" | "FULL_CONTROL" | "LIMITED_CONTROL" | "CUSTOM_ACCESS">("PLAN_DEFAULT");
  const [matrix, setMatrix] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Form Inputs
  const [selectedPlanId, setSelectedPlanId] = useState("plan_starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [customDateInput, setCustomDateInput] = useState("");
  const [expiryDaysInput, setExpiryDaysInput] = useState<number>(30);
  const [reasonInput, setReasonInput] = useState("Super Admin school custom access update");
  
  // Overrides Map: key -> "ALLOW" | "DENY" | "SHOWCASE" | undefined
  const [featureOverridesMap, setFeatureOverridesMap] = useState<Record<string, "ALLOW" | "DENY" | "SHOWCASE">>({});

  // Limit Overrides Input
  const [limitOverridesInput, setLimitOverridesInput] = useState({
    students: { mode: "PLAN_DEFAULT", customValue: 500 },
    teachers: { mode: "PLAN_DEFAULT", customValue: 20 },
    classes: { mode: "PLAN_DEFAULT", customValue: 15 },
    staff: { mode: "PLAN_DEFAULT", customValue: 2 },
  });

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [subRes, matrixRes] = await Promise.all([
        safeFetchJson(`/api/super-admin/schools/${schoolId}/subscription`),
        safeFetchJson(`/api/super-admin/schools/${schoolId}/entitlements`),
      ]);

      if (subRes.ok && subRes.data) {
        const subData = subRes.data.subscription;
        setSubscription(subData);
        setSelectedPlanId(subData?.planId || "plan_starter");
        setBillingCycle(subData?.billingCycle || "monthly");
        setControlMode(subRes.data.controlMode || subData?.controlMode || "PLAN_DEFAULT");

        if (subData?.expiresAt) {
          setCustomDateInput(subData.expiresAt.split("T")[0]);
        }
      }

      if (matrixRes.ok && matrixRes.data) {
        setMatrix(matrixRes.data.matrix || []);
        setSummary(matrixRes.data.summary || null);

        // Prepopulate feature overrides map
        const initialOverrides: Record<string, "ALLOW" | "DENY" | "SHOWCASE"> = {};
        (matrixRes.data.matrix || []).forEach((item: any) => {
          if (item.schoolOverride === "ALLOW") initialOverrides[item.id] = "ALLOW";
          else if (item.schoolOverride === "DENY") initialOverrides[item.id] = "DENY";
          else if (item.schoolOverride === "SHOWCASE") initialOverrides[item.id] = "SHOWCASE";
        });
        setFeatureOverridesMap(initialOverrides);

        // Prepopulate limit overrides
        const rawLimits = matrixRes.data.limitOverrides || [];
        const nextLimits = {
          students: { mode: "PLAN_DEFAULT", customValue: 500 },
          teachers: { mode: "PLAN_DEFAULT", customValue: 20 },
          classes: { mode: "PLAN_DEFAULT", customValue: 15 },
          staff: { mode: "PLAN_DEFAULT", customValue: 2 },
        };

        rawLimits.forEach((l: any) => {
          const k = l.limitKey as "students" | "teachers" | "classes" | "staff";
          if (nextLimits[k]) {
            if (l.overrideValue === -1) {
              nextLimits[k] = { mode: "UNLIMITED", customValue: -1 };
            } else {
              nextLimits[k] = { mode: "CUSTOM_LIMIT", customValue: l.overrideValue };
            }
          }
        });
        setLimitOverridesInput(nextLimits);
      }
    } catch (err: any) {
      toast.error("Failed to load school entitlement control data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, schoolId]);

  if (!isOpen) return null;

  const handleApplyAction = async (actionName: string, additionalPayload: any = {}) => {
    setSubmitting(true);
    try {
      const targetMode = additionalPayload.controlMode || controlMode;

      // Prepare limit overrides payload
      const limitPayload: Record<string, number | null> = {};
      (["students", "teachers", "classes", "staff"] as const).forEach((key) => {
        const item = limitOverridesInput[key];
        if (item.mode === "UNLIMITED") limitPayload[key] = -1;
        else if (item.mode === "CUSTOM_LIMIT") limitPayload[key] = Number(item.customValue);
      });

      const payload = {
        action: actionName,
        planId: selectedPlanId,
        billingCycle,
        reason: reasonInput,
        expiryDays: expiryDaysInput,
        customExpiryDate: customDateInput ? new Date(customDateInput).toISOString() : undefined,
        controlMode: targetMode,
        featureOverrides: Object.entries(featureOverridesMap).map(([featureKey, val]) => ({
          featureKey,
          allowed: val === "ALLOW",
          accessMode: val === "ALLOW" ? "FULL_ACCESS" : val === "DENY" ? "HIDDEN" : "SHOWCASE",
        })),
        limitOverrides: limitPayload,
        ...additionalPayload,
      };

      const res = await safeFetchJson(`/api/super-admin/schools/${schoolId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data?.success) {
        toast.success(res.data.message || `Action ${actionName} applied successfully!`);
        await loadData();
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.error || "Failed to apply subscription action.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit plan control request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetToPlanDefault = async () => {
    if (!confirm(`Are you sure you want to RESET ALL custom overrides and revert school "${schoolName}" to its Plan Default?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await safeFetchJson(`/api/super-admin/schools/${schoolId}/entitlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlMode: "RESET_TO_PLAN",
          reason: reasonInput || "Super Admin reset school to Plan Default",
        }),
      });

      if (res.ok && res.data?.success) {
        toast.success("School entitlements successfully reset to Plan Default!");
        setControlMode("PLAN_DEFAULT");
        setFeatureOverridesMap({});
        await loadData();
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.error || "Failed to reset entitlements.");
      }
    } catch (err: any) {
      toast.error(err.message || "Reset action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cycle feature override: DEFAULT -> ALLOW -> DENY -> SHOWCASE -> DEFAULT
  const cycleFeatureOverride = (featureId: string) => {
    setFeatureOverridesMap((prev) => {
      const copy = { ...prev };
      const current = copy[featureId];
      if (!current) {
        copy[featureId] = "ALLOW";
      } else if (current === "ALLOW") {
        copy[featureId] = "DENY";
      } else if (current === "DENY") {
        copy[featureId] = "SHOWCASE";
      } else {
        delete copy[featureId];
      }
      return copy;
    });
  };

  const filteredMatrix = matrix.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return item.name?.toLowerCase().includes(q) || item.id?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-950 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>School Custom Access & Entitlement Control</span>
              </h2>
              <p className="text-xs text-slate-500">
                School: <strong className="text-slate-700 dark:text-slate-300">{schoolName}</strong> ({schoolId})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Metrics Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Current Base Plan</span>
            <span className="text-sm font-black text-slate-900 dark:text-white capitalize">
              {subscription?.planId?.replace("plan_", "") || "Starter"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Subscription Status</span>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                subscription?.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : subscription?.status === "SUSPENDED"
                  ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {subscription?.status || "ACTIVE"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Control Mode</span>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">
              {controlMode}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Active / Restricted</span>
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
              <span className="text-emerald-600">{summary?.activeFeatureCount || 0}</span> /{" "}
              <span className="text-red-500">{summary?.deniedFeatureCount || 0}</span>
            </span>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 px-2">
              Quick Modes:
            </span>
            <button
              onClick={() => {
                setControlMode("PLAN_DEFAULT");
                handleApplyAction("SET_CONTROL_MODE", { controlMode: "PLAN_DEFAULT" });
              }}
              disabled={submitting}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                controlMode === "PLAN_DEFAULT" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              Plan Default
            </button>
            <button
              onClick={() => {
                setControlMode("FULL_CONTROL");
                handleApplyAction("SET_CONTROL_MODE", { controlMode: "FULL_CONTROL" });
              }}
              disabled={submitting}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                controlMode === "FULL_CONTROL" ? "bg-purple-600 text-white" : "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300"
              }`}
            >
              ⚡ Full Control
            </button>
            <button
              onClick={() => {
                setControlMode("CUSTOM_ACCESS");
                setActiveTab("matrix");
              }}
              disabled={submitting}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                controlMode === "CUSTOM_ACCESS" ? "bg-amber-600 text-white" : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300"
              }`}
            >
              🛠️ Custom Access
            </button>
          </div>

          <button
            onClick={handleResetToPlanDefault}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Plan Default
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("plan")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "plan"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            1. Plan & Duration Control
          </button>
          <button
            onClick={() => setActiveTab("control_mode")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "control_mode"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            2. Control Modes
          </button>
          <button
            onClick={() => setActiveTab("limits")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "limits"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            3. Resource Limit Overrides
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            4. Granular Capability Matrix ({matrix.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
            {/* TAB 1: PLAN & DURATION CONTROL */}
            {activeTab === "plan" && (
              <div className="space-y-5">
                {/* Select Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assign Base Plan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setSelectedPlanId("plan_starter")}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedPlanId === "plan_starter"
                          ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Starter</h4>
                      <p className="text-xs text-slate-500 mt-0.5">500 Students, 20 Teachers, Basic Attendance</p>
                    </div>

                    <div
                      onClick={() => setSelectedPlanId("plan_professional")}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedPlanId === "plan_professional"
                          ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Professional</h4>
                      <p className="text-xs text-slate-500 mt-0.5">2,000 Students, Reports, Advanced Controls</p>
                    </div>

                    <div
                      onClick={() => setSelectedPlanId("plan_enterprise")}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedPlanId === "plan_enterprise"
                          ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Enterprise</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Unlimited Capacity, Custom Modules</p>
                    </div>
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Billing Cycle
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        billingCycle === "monthly"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("annual")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        billingCycle === "annual"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Annual
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleApplyAction("ASSIGN_PLAN")}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
                  >
                    Assign Selected Plan
                  </button>
                </div>

                {/* Expiry Date Adjustments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Quick Duration Adjustments
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApplyAction("EXTEND_EXPIRY", { expiryDays: 7 })}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        +7 Days
                      </button>
                      <button
                        onClick={() => handleApplyAction("EXTEND_EXPIRY", { expiryDays: 30 })}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        +30 Days
                      </button>
                      <button
                        onClick={() => handleApplyAction("EXTEND_EXPIRY", { expiryDays: 365 })}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        +1 Year
                      </button>
                      <button
                        onClick={() => handleApplyAction("REDUCE_EXPIRY", { expiryDays: 7 })}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                      >
                        -7 Days
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Exact Custom Expiry Date
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDateInput}
                        onChange={(e) => setCustomDateInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                      <button
                        onClick={() => handleApplyAction("ADJUST_EXPIRY")}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                      >
                        Set Date
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTROL MODES */}
            {activeTab === "control_mode" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Authoritative Control Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setControlMode("PLAN_DEFAULT")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        controlMode === "PLAN_DEFAULT"
                          ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">PLAN DEFAULT</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Strictly uses assigned plan configuration (features, featureAccess modes, limits) without school overrides.
                      </p>
                    </div>

                    <div
                      onClick={() => setControlMode("FULL_CONTROL")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        controlMode === "FULL_CONTROL"
                          ? "border-purple-600 bg-purple-50/40 dark:border-purple-500 dark:bg-purple-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">⚡ FULL CONTROL</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Unlocks all platform features, pages, tabs, and actions as FULL_ACCESS, with unlimited capacity.
                      </p>
                    </div>

                    <div
                      onClick={() => setControlMode("LIMITED_CONTROL")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        controlMode === "LIMITED_CONTROL"
                          ? "border-slate-700 bg-slate-50 dark:border-slate-600 dark:bg-slate-900"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">LIMITED CONTROL</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Enforces standard plan restrictions with strict access policy constraints.
                      </p>
                    </div>

                    <div
                      onClick={() => setControlMode("CUSTOM_ACCESS")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        controlMode === "CUSTOM_ACCESS"
                          ? "border-amber-600 bg-amber-50/40 dark:border-amber-500 dark:bg-amber-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">🛠️ CUSTOM ACCESS</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Starts from Plan Default, allows overriding individual capabilities (Module, Page, Tab, Section, Action, Export, Limit).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    onClick={() => handleApplyAction("SET_CONTROL_MODE")}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Control Mode Setting
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: RESOURCE LIMIT OVERRIDES */}
            {activeTab === "limits" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    School-Level Resource Capacity Overrides
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure custom capacity limits for this school tenant independently of plan limits.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(["students", "teachers", "classes", "staff"] as const).map((key) => {
                    const currentItem = limitOverridesInput[key];
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <div key={key} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/40 dark:bg-slate-900/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{label} Capacity</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Mode: <strong>{currentItem.mode}</strong>
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLimitOverridesInput({
                                ...limitOverridesInput,
                                [key]: { ...currentItem, mode: "PLAN_DEFAULT" },
                              })
                            }
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              currentItem.mode === "PLAN_DEFAULT"
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            Plan Default
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLimitOverridesInput({
                                ...limitOverridesInput,
                                [key]: { ...currentItem, mode: "CUSTOM_LIMIT" },
                              })
                            }
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              currentItem.mode === "CUSTOM_LIMIT"
                                ? "bg-amber-600 text-white"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            Custom Limit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLimitOverridesInput({
                                ...limitOverridesInput,
                                [key]: { ...currentItem, mode: "UNLIMITED", customValue: -1 },
                              })
                            }
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              currentItem.mode === "UNLIMITED"
                                ? "bg-purple-600 text-white"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            Unlimited
                          </button>
                        </div>

                        {currentItem.mode === "CUSTOM_LIMIT" && (
                          <div className="pt-2">
                            <label className="block text-[11px] text-slate-500 mb-1">Max Count:</label>
                            <input
                              type="number"
                              value={currentItem.customValue}
                              onChange={(e) =>
                                setLimitOverridesInput({
                                  ...limitOverridesInput,
                                  [key]: { ...currentItem, customValue: Number(e.target.value) },
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => handleApplyAction("SET_CONTROL_MODE")}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Limit Overrides
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: FEATURE TEST MATRIX & OVERRIDES */}
            {activeTab === "matrix" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search capabilities..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs w-full sm:w-64"
                    />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="all">All Categories</option>
                      <option value="module">Modules</option>
                      <option value="page">Pages</option>
                      <option value="tab">Tabs</option>
                      <option value="action">Actions</option>
                      <option value="export">Exports</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyAction("SET_CONTROL_MODE", { controlMode: "CUSTOM_ACCESS" })}
                      disabled={submitting}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
                    >
                      Save Custom Overrides
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>
                    💡 <strong>Interactive Override:</strong> Click on any row's override badge to cycle:{" "}
                    <code>DEFAULT (No Override)</code> → <code>ALLOW (Full Access)</code> → <code>DENY (Hidden)</code> → <code>SHOWCASE (Upsell)</code>
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                        <th className="p-3">Capability / Key</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Base Plan</th>
                        <th className="p-3">School Override</th>
                        <th className="p-3">Effective Access</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMatrix.map((row) => {
                        const localOverride = featureOverridesMap[row.id];
                        let overrideBadgeText = "DEFAULT";
                        let overrideBadgeBg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                        if (localOverride === "ALLOW") {
                          overrideBadgeText = "ALLOW";
                          overrideBadgeBg = "bg-emerald-500 text-white font-bold";
                        } else if (localOverride === "DENY") {
                          overrideBadgeText = "DENY";
                          overrideBadgeBg = "bg-red-500 text-white font-bold";
                        } else if (localOverride === "SHOWCASE") {
                          overrideBadgeText = "SHOWCASE";
                          overrideBadgeBg = "bg-amber-500 text-white font-bold";
                        }

                        // Determine simulated effective access
                        let simulatedEffective = row.basePlanAccess;
                        if (controlMode === "FULL_CONTROL") simulatedEffective = "ALLOW";
                        else if (localOverride === "ALLOW") simulatedEffective = "ALLOW";
                        else if (localOverride === "DENY") simulatedEffective = "DENY";
                        else if (localOverride === "SHOWCASE") simulatedEffective = "SHOWCASE";

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-3">
                              <div className="font-semibold text-slate-900 dark:text-white">{row.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{row.id}</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {row.category}
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={row.basePlanAccess === "ALLOW" ? "text-emerald-600 font-bold" : row.basePlanAccess === "SHOWCASE" ? "text-amber-600 font-bold" : "text-slate-400"}>
                                {row.basePlanAccess}
                              </span>
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => cycleFeatureOverride(row.id)}
                                className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-mono cursor-pointer transition-all hover:opacity-80 ${overrideBadgeBg}`}
                              >
                                {overrideBadgeText}
                              </button>
                            </td>
                            <td className="p-3 font-mono">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  simulatedEffective === "ALLOW"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : simulatedEffective === "SHOWCASE"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                }`}
                              >
                                {simulatedEffective}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => cycleFeatureOverride(row.id)}
                                className="text-[11px] text-blue-600 hover:underline font-bold"
                              >
                                Cycle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
