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
  const [activeTab, setActiveTab] = useState<"plan" | "control_mode" | "matrix">("plan");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Subscription state from server
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [controlMode, setControlMode] = useState<"FULL_CONTROL" | "LIMITED_CONTROL" | "CUSTOM_ACCESS">("LIMITED_CONTROL");
  const [matrix, setMatrix] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Form Inputs
  const [selectedPlanId, setSelectedPlanId] = useState("plan_starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [customDateInput, setCustomDateInput] = useState("");
  const [expiryDaysInput, setExpiryDaysInput] = useState<number>(30);
  const [reasonInput, setReasonInput] = useState("Super Admin plan management update");
  const [featureOverridesMap, setFeatureOverridesMap] = useState<Record<string, boolean>>({});

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
        setControlMode(subRes.data.controlMode || "LIMITED_CONTROL");

        // Format custom date input
        if (subData?.expiresAt) {
          setCustomDateInput(subData.expiresAt.split("T")[0]);
        }
      }

      if (matrixRes.ok && matrixRes.data) {
        setMatrix(matrixRes.data.matrix || []);
        setSummary(matrixRes.data.summary || null);

        // Prepopulate overrides map
        const initialOverrides: Record<string, boolean> = {};
        (matrixRes.data.matrix || []).forEach((item: any) => {
          if (item.schoolOverride === "ALLOW") initialOverrides[item.id] = true;
          if (item.schoolOverride === "DENY") initialOverrides[item.id] = false;
        });
        setFeatureOverridesMap(initialOverrides);
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
      const payload = {
        action: actionName,
        planId: selectedPlanId,
        billingCycle,
        reason: reasonInput,
        expiryDays: expiryDaysInput,
        customExpiryDate: customDateInput ? new Date(customDateInput).toISOString() : undefined,
        controlMode,
        featureOverrides: Object.entries(featureOverridesMap).map(([featureKey, allowed]) => ({ featureKey, allowed })),
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

  const handleQuickShortcut = async (mode: "ASSIGN" | "FULL" | "LIMITED" | "CUSTOM" | "RESET") => {
    if (mode === "ASSIGN") {
      await handleApplyAction("ASSIGN_PLAN");
    } else if (mode === "FULL") {
      setControlMode("FULL_CONTROL");
      await handleApplyAction("SET_CONTROL_MODE", { controlMode: "FULL_CONTROL" });
    } else if (mode === "LIMITED") {
      setControlMode("LIMITED_CONTROL");
      await handleApplyAction("SET_CONTROL_MODE", { controlMode: "LIMITED_CONTROL" });
    } else if (mode === "RESET") {
      setControlMode("LIMITED_CONTROL");
      setFeatureOverridesMap({});
      await handleApplyAction("SET_CONTROL_MODE", { controlMode: "RESET_TO_PLAN" });
    }
  };

  const toggleFeatureOverride = (featureId: string, currentEffective: string) => {
    setFeatureOverridesMap((prev) => {
      const copy = { ...prev };
      if (copy[featureId] === true) copy[featureId] = false;
      else if (copy[featureId] === false) delete copy[featureId];
      else copy[featureId] = true;
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-950 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Manage Plan & Entitlement Test Control</span>
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
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Current Plan</span>
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
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Active / Denied Features</span>
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
              <span className="text-emerald-600">{summary?.activeFeatureCount || 0}</span> /{" "}
              <span className="text-red-500">{summary?.deniedFeatureCount || 0}</span>
            </span>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap gap-2 mb-4 p-2 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 self-center px-2">
            Quick Actions:
          </span>
          <button
            onClick={() => handleQuickShortcut("ASSIGN")}
            disabled={submitting}
            className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer transition-all"
          >
            [Assign Plan]
          </button>
          <button
            onClick={() => handleQuickShortcut("FULL")}
            disabled={submitting}
            className="px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer transition-all"
          >
            [Full Access]
          </button>
          <button
            onClick={() => handleQuickShortcut("LIMITED")}
            disabled={submitting}
            className="px-3 py-1 rounded-xl bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all"
          >
            [Limited Access]
          </button>
          <button
            onClick={() => handleQuickShortcut("RESET")}
            disabled={submitting}
            className="px-3 py-1 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer transition-all"
          >
            [Reset to Plan]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
          <button
            onClick={() => setActiveTab("plan")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === "plan"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            1. Plan & Expiry Control
          </button>
          <button
            onClick={() => setActiveTab("control_mode")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === "control_mode"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            2. Control Mode & Overrides
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            3. Feature Test Matrix ({matrix.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
            {/* TAB 1: PLAN & EXPIRY CONTROL */}
            {activeTab === "plan" && (
              <div className="space-y-5">
                {/* Select Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Target Plan
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

                {/* Expiry Date Control */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Extend / Reduce Expiry (Days)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={expiryDaysInput}
                        onChange={(e) => setExpiryDaysInput(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                      <button
                        onClick={() => handleApplyAction("EXTEND_EXPIRY")}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        + Extend Days
                      </button>
                      <button
                        onClick={() => handleApplyAction("REDUCE_EXPIRY")}
                        disabled={submitting}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                      >
                        - Reduce Days
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

                {/* Suspension & Demo Access */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleApplyAction("SET_TRIAL")}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
                  >
                    Grant 14-Day Demo / Trial
                  </button>

                  {subscription?.status === "SUSPENDED" ? (
                    <button
                      onClick={() => handleApplyAction("RESUME")}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      Resume Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyAction("SUSPEND")}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                    >
                      Suspend Subscription
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CONTROL MODE & OVERRIDES */}
            {activeTab === "control_mode" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Access Control Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setControlMode("LIMITED_CONTROL")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        controlMode === "LIMITED_CONTROL"
                          ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">LIMITED CONTROL</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Follows assigned plan limits + feature entitlements strictly.
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
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">FULL CONTROL</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Unlocks all platform features and capabilities for testing.
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
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">CUSTOM ACCESS</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Manually ALLOW / DENY individual modules, pages, and actions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Granular Overrides Panel */}
                {controlMode === "CUSTOM_ACCESS" && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Granular Feature Overrides (Click to cycle: ALLOW → DENY → RESET)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matrix.map((item) => {
                        const overrideState = featureOverridesMap[item.id];
                        let badgeText = "DEFAULT";
                        let badgeBg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                        if (overrideState === true) {
                          badgeText = "ALLOW";
                          badgeBg = "bg-emerald-500 text-white font-bold";
                        } else if (overrideState === false) {
                          badgeText = "DENY";
                          badgeBg = "bg-red-500 text-white font-bold";
                        }

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleFeatureOverride(item.id, item.effectiveAccess)}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer transition-all"
                          >
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    onClick={() => handleApplyAction("SET_CONTROL_MODE")}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Control Mode & Overrides
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: FEATURE TEST MATRIX */}
            {activeTab === "matrix" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Entitlement Test Matrix
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    Total Monitored Features: <strong>{matrix.length}</strong>
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                        <th className="p-3">Feature Capability</th>
                        <th className="p-3">Base Plan</th>
                        <th className="p-3">School Override</th>
                        <th className="p-3">Effective Access</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {matrix.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                          <td className="p-3 font-mono">
                            <span className={row.basePlanAccess === "ALLOW" ? "text-emerald-600 font-bold" : "text-slate-400"}>
                              {row.basePlanAccess}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            <span className={row.schoolOverride !== "NONE" ? "text-purple-600 font-extrabold" : "text-slate-400"}>
                              {row.schoolOverride}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                row.effectiveAccess === "ALLOW"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                              }`}
                            >
                              {row.effectiveAccess}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">{row.status}</td>
                        </tr>
                      ))}
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
