"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Ban,
  RotateCcw,
  Sparkles,
  Shield,
  Plus,
  Minus,
  SlidersHorizontal,
  DollarSign,
  FileText,
  User,
  Phone,
  Mail,
  Loader2,
  ArrowRight,
  History,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionControlDrawerProps {
  subscriptionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function SubscriptionControlDrawer({
  subscriptionId,
  onClose,
  onUpdate,
}: SubscriptionControlDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"adjust" | "overrides" | "limits" | "finance" | "suspension" | "history">("adjust");

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  // Period adjust state
  const [adjustType, setAdjustType] = useState<"ADD_DAYS" | "REMOVE_DAYS" | "ADD_MONTHS" | "REMOVE_MONTHS" | "CUSTOM_PERIOD_ADJUSTMENT">("ADD_DAYS");
  const [adjustValue, setAdjustValue] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>("");

  // Feature / Temp Access Override state
  const [overrideType, setOverrideType] = useState<"TEMPORARY_ACCESS" | "FEATURE_GRANT" | "FEATURE_RESTRICT">("TEMPORARY_ACCESS");
  const [selectedFeature, setSelectedFeature] = useState<string>("advanced_reports");
  const [overrideDurationDays, setOverrideDurationDays] = useState<number>(2);

  // Limit Override state
  const [limitKey, setLimitKey] = useState<"students" | "teachers" | "classes" | "staff">("students");
  const [limitOverrideValue, setLimitOverrideValue] = useState<number>(1000);
  const [limitDurationDays, setLimitDurationDays] = useState<number>(30);

  // Financial Penalty & Credit state
  const [penaltyRupees, setPenaltyRupees] = useState<number>(500);
  const [creditRupees, setCreditRupees] = useState<number>(500);

  // High-Risk Confirmation state
  const [confirmPhrase, setConfirmPhrase] = useState("");

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load subscription bundle.");
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscriptionId) {
      fetchDetail(subscriptionId);
      setReason("");
      setConfirmPhrase("");
    }
  }, [subscriptionId]);

  if (!subscriptionId) return null;

  const handleAdjustPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason for this adjustment (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        action: adjustType,
        reason: reason.trim(),
        requestId: `req_${Date.now()}`,
      };

      if (adjustType === "CUSTOM_PERIOD_ADJUSTMENT") {
        if (!customDate) {
          toast.error("Please select a target custom date.");
          setSubmitting(false);
          return;
        }
        payload.customDate = new Date(customDate).toISOString();
      } else {
        payload.value = Number(adjustValue);
      }

      let applied = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            applied = true;
            toast.success(json.message || "Subscription period successfully adjusted.");
          }
        }
      } catch (e) {
        console.warn("Server adjustment notice, falling back to authenticated client SDK:", e);
      }

      // Client SDK fallback with active Super Admin auth token
      if (!applied) {
        const { adjustSubscriptionPeriod } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await adjustSubscriptionPeriod(subscriptionId, {
          type: adjustType as any,
          value: Number(adjustValue),
          customDate: customDate ? new Date(customDate).toISOString() : undefined,
          reason: reason.trim(),
          actorId: "super_admin",
        });
        toast.success("Subscription period successfully adjusted.");
      }

      setReason("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Adjustment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccessOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason for this override.");
      return;
    }

    setSubmitting(true);
    try {
      let created = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: overrideType,
            featureKey: overrideType !== "TEMPORARY_ACCESS" ? selectedFeature : undefined,
            durationDays: Number(overrideDurationDays),
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            created = true;
            toast.success(json.message || "Access override created successfully.");
          }
        }
      } catch (e) {}

      if (!created) {
        const { createAccessOverride } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await createAccessOverride(subscriptionId, {
          type: overrideType,
          featureKey: overrideType !== "TEMPORARY_ACCESS" ? selectedFeature : undefined,
          durationDays: Number(overrideDurationDays),
          reason: reason.trim(),
          createdBy: "super_admin",
        });
        toast.success("Access override created successfully.");
      }

      setReason("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create override.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccessOverride = async (overrideId: string) => {
    setSubmitting(true);
    try {
      let revoked = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REVOKE_ACCESS_OVERRIDE",
            overrideId,
          }),
        });

        if (res.ok) {
          revoked = true;
        }
      } catch (e) {}

      if (!revoked) {
        const { revokeAccessOverride } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await revokeAccessOverride(overrideId, subscriptionId, "super_admin");
      }

      toast.success("Access override revoked.");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke override.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLimitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason for this limit override.");
      return;
    }

    setSubmitting(true);
    try {
      let created = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "LIMIT_OVERRIDE",
            limitKey,
            overrideValue: Number(limitOverrideValue),
            durationDays: Number(limitDurationDays),
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            created = true;
            toast.success(json.message || "Resource limit override applied.");
          }
        }
      } catch (e) {}

      if (!created) {
        const { createLimitOverride } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await createLimitOverride(subscriptionId, {
          limitKey,
          overrideValue: Number(limitOverrideValue),
          durationDays: Number(limitDurationDays),
          reason: reason.trim(),
          createdBy: "super_admin",
        });
        toast.success("Resource limit override applied.");
      }
      setReason("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Limit override failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeLimitOverride = async (overrideId: string) => {
    setSubmitting(true);
    try {
      let revoked = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REVOKE_LIMIT_OVERRIDE",
            overrideId,
          }),
        });

        if (res.ok) {
          revoked = true;
        }
      } catch (e) {}

      if (!revoked) {
        const { revokeLimitOverride } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await revokeLimitOverride(overrideId, subscriptionId, "super_admin");
      }

      toast.success("Limit override revoked.");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke limit override.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason for this penalty.");
      return;
    }

    setSubmitting(true);
    try {
      let applied = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PENALTY",
            amountPaise: Math.round(Number(penaltyRupees) * 100),
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            applied = true;
            toast.success("Penalty recorded successfully.");
          }
        }
      } catch (e) {}

      if (!applied) {
        const { applyPenalty } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await applyPenalty(subscriptionId, {
          amountPaise: Math.round(Number(penaltyRupees) * 100),
          reason: reason.trim(),
          dueDays: 14,
          createdBy: "super_admin",
        });
        toast.success("Penalty recorded successfully.");
      }

      setReason("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply penalty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaivePenalty = async (penaltyId: string) => {
    setSubmitting(true);
    try {
      let waived = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "WAIVE_PENALTY",
            penaltyId,
            reason: "Waived by Super Admin",
          }),
        });

        if (res.ok) {
          waived = true;
        }
      } catch (e) {}

      if (!waived) {
        const { waivePenalty } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await waivePenalty(penaltyId, subscriptionId, "Waived by Super Admin", "super_admin");
      }

      toast.success("Penalty waived.");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to waive penalty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason for this credit.");
      return;
    }

    setSubmitting(true);
    try {
      let applied = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "MANUAL_CREDIT",
            amountPaise: Math.round(Number(creditRupees) * 100),
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            applied = true;
            toast.success("Manual credit recorded.");
          }
        }
      } catch (e) {}

      if (!applied) {
        const { applyManualCredit } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        await applyManualCredit(subscriptionId, {
          amountPaise: Math.round(Number(creditRupees) * 100),
          reason: reason.trim(),
          actorId: "super_admin",
        });
        toast.success("Manual credit recorded.");
      }

      setReason("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply credit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSuspension = async () => {
    const isSuspended = data?.subscription?.status === "SUSPENDED";
    if (!isSuspended && confirmPhrase !== "SUSPEND") {
      toast.error('Please type "SUSPEND" to confirm account suspension.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please provide a mandatory reason.");
      return;
    }

    setSubmitting(true);
    try {
      let toggled = false;
      try {
        const res = await fetch(`/api/super-admin/subscriptions/${subscriptionId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: isSuspended ? "RESUME" : "SUSPEND",
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            toggled = true;
            toast.success(
              isSuspended
                ? "Account access resumed."
                : "Account successfully suspended."
            );
          }
        }
      } catch (e) {}

      if (!toggled) {
        const { suspendAccountSubscription, resumeAccountSubscription } = await import("@/lib/billing/subscriptionAdjustmentEngine");
        if (isSuspended) {
          await resumeAccountSubscription(subscriptionId, {
            reason: reason.trim(),
            actorId: "super_admin",
          });
          toast.success("Account access resumed.");
        } else {
          await suspendAccountSubscription(subscriptionId, {
            reason: reason.trim(),
            actorId: "super_admin",
          });
          toast.success("Account successfully suspended.");
        }
      }

      setReason("");
      setConfirmPhrase("");
      fetchDetail(subscriptionId);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const sub = data?.subscription;
  const resolved = data?.resolvedState;
  const school = data?.school;
  const plan = data?.plan;
  const usage = data?.usage || {};
  const paymentSummary = data?.paymentSummary;

  const currentExpiry = sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-950 h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {school?.name || `School (${subscriptionId})`}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {sub?.planId?.replace("plan_", "") || "STARTER"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin: {school?.adminName || "School Admin"} • ID: <span className="font-mono">{subscriptionId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold text-slate-500">Loading subscription control matrix...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Quick Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Status</span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {sub?.status || "ACTIVE"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Current Expiry</span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {currentExpiry}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Days Remaining</span>
                <p className="text-sm font-black text-blue-700 dark:text-blue-400 mt-1">
                  {resolved?.daysRemaining ?? 0} days
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Net Revenue</span>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  ₹{Math.round((paymentSummary?.netCollectedPaise || 0) / 100).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Usage vs Capacity Strip */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Active Resource Capacity</span>
                <span className="text-slate-500 font-normal">Plan: {plan?.name || "Professional"}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">Students:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{usage.students ?? 0} / {plan?.limits?.maxStudents ?? 2000}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">Teachers:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{usage.teachers ?? 0} / {plan?.limits?.maxTeachers ?? 100}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">Classes:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{usage.classes ?? 0} / {plan?.limits?.maxClasses ?? 60}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">Staff:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{usage.staff ?? 0} / {plan?.limits?.maxStaffAccounts ?? 10}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 text-xs overflow-x-auto no-scrollbar pb-px">
              {[
                { id: "adjust", label: "Adjust Period", icon: Calendar },
                { id: "overrides", label: "Access Overrides", icon: Zap },
                { id: "limits", label: "Limit Overrides", icon: SlidersHorizontal },
                { id: "finance", label: "Penalty & Credit", icon: DollarSign },
                { id: "suspension", label: "Account State", icon: Ban },
                { id: "history", label: "Timeline & Ledgers", icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Adjust Subscription Period */}
            {activeTab === "adjust" && (
              <form onSubmit={handleAdjustPeriod} className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Select Adjustment Operation
                  </label>
                  
                  {/* Preset Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: "ADD_DAYS", label: "+30 Days", val: 30 },
                      { type: "ADD_DAYS", label: "+60 Days", val: 60 },
                      { type: "ADD_MONTHS", label: "+1 Month", val: 1 },
                      { type: "ADD_MONTHS", label: "+6 Months", val: 6 },
                      { type: "REMOVE_DAYS", label: "-10 Days", val: 10 },
                      { type: "REMOVE_MONTHS", label: "-1 Month", val: 1 },
                      { type: "CUSTOM_PERIOD_ADJUSTMENT", label: "Custom Date", val: 0 },
                    ].map((preset, idx) => {
                      const isSelected = adjustType === preset.type && (preset.type === "CUSTOM_PERIOD_ADJUSTMENT" || adjustValue === preset.val);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAdjustType(preset.type as any);
                            if (preset.val > 0) setAdjustValue(preset.val);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {adjustType === "CUSTOM_PERIOD_ADJUSTMENT" && (
                    <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-1.5">
                      <label className="text-xs font-bold text-blue-900 dark:text-blue-300">Target Expiry Date</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mandatory Business Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Promotional goodwill extension granted for school annual jubilee."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Confirm Subscription Adjustment</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Temporary Access & Feature Overrides */}
            {activeTab === "overrides" && (
              <div className="space-y-6">
                <form onSubmit={handleCreateAccessOverride} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Create Access Override
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Override Type</label>
                      <select
                        value={overrideType}
                        onChange={(e) => setOverrideType(e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                      >
                        <option value="TEMPORARY_ACCESS">Temporary Access (All)</option>
                        <option value="FEATURE_GRANT">Grant Feature</option>
                        <option value="FEATURE_RESTRICT">Restrict Feature</option>
                      </select>
                    </div>

                    {overrideType !== "TEMPORARY_ACCESS" && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Feature</label>
                        <select
                          value={selectedFeature}
                          onChange={(e) => setSelectedFeature(e.target.value)}
                          className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                        >
                          <option value="advanced_reports">Advanced Reports</option>
                          <option value="attendance_automation">Attendance Automation</option>
                          <option value="notices_announcements">Notices & Announcements</option>
                          <option value="school_dashboard">School Dashboard</option>
                          <option value="student_portal">Student Portal</option>
                          <option value="teacher_portal">Teacher Portal</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Duration (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={overrideDurationDays}
                        onChange={(e) => setOverrideDurationDays(Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Granted 7-day trial of Advanced Reports feature."
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-medium"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Apply Override
                  </button>
                </form>

                {/* Active Overrides List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Active Access Overrides ({data?.accessOverrides?.filter((o: any) => o.status === "ACTIVE").length || 0})
                  </h4>
                  {data?.accessOverrides?.filter((o: any) => o.status === "ACTIVE").length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">No active access overrides.</p>
                  ) : (
                    data?.accessOverrides
                      ?.filter((o: any) => o.status === "ACTIVE")
                      .map((ovr: any) => (
                        <div key={ovr.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-purple-700 dark:text-purple-400">{ovr.type}</span>
                            {ovr.featureKey && <span className="ml-2 text-slate-600 dark:text-slate-400 font-mono">[{ovr.featureKey}]</span>}
                            <p className="text-[11px] text-slate-500 mt-0.5">Expires: {new Date(ovr.endAt).toLocaleDateString("en-IN")} • Reason: {ovr.reason}</p>
                          </div>
                          <button
                            onClick={() => handleRevokeAccessOverride(ovr.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 font-bold text-[11px]"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Limit Overrides */}
            {activeTab === "limits" && (
              <div className="space-y-6">
                <form onSubmit={handleCreateLimitOverride} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                    Create Custom Resource Limit Override
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Resource Key</label>
                      <select
                        value={limitKey}
                        onChange={(e) => setLimitKey(e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                      >
                        <option value="students">Students Limit</option>
                        <option value="teachers">Teachers Limit</option>
                        <option value="classes">Classes Limit</option>
                        <option value="staff">Staff Accounts Limit</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">New Override Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={limitOverrideValue}
                        onChange={(e) => setLimitOverrideValue(Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Duration (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={limitDurationDays}
                        onChange={(e) => setLimitDurationDays(Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Temporary capacity bump for new admission cycle."
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-medium"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Apply Limit Override
                  </button>
                </form>

                {/* Active Limit Overrides List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Active Limit Overrides ({data?.limitOverrides?.filter((o: any) => o.status === "ACTIVE").length || 0})
                  </h4>
                  {data?.limitOverrides?.filter((o: any) => o.status === "ACTIVE").length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">No active limit overrides.</p>
                  ) : (
                    data?.limitOverrides
                      ?.filter((o: any) => o.status === "ACTIVE")
                      .map((lim: any) => (
                        <div key={lim.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">{lim.limitKey}: {lim.overrideValue}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">Expires: {new Date(lim.endAt).toLocaleDateString("en-IN")} • Reason: {lim.reason}</p>
                          </div>
                          <button
                            onClick={() => handleRevokeLimitOverride(lim.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 font-bold text-[11px]"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Penalties & Manual Credit */}
            {activeTab === "finance" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Apply Penalty */}
                <form onSubmit={handleApplyPenalty} className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    Apply Administrative Penalty
                  </h4>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Penalty Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={penaltyRupees}
                      onChange={(e) => setPenaltyRupees(Number(e.target.value))}
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Late renewal penalty fee"
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-medium"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    Record Penalty
                  </button>
                </form>

                {/* Apply Manual Credit */}
                <form onSubmit={handleApplyCredit} className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Issue Manual Credit (Non-Cash)
                  </h4>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Credit Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={creditRupees}
                      onChange={(e) => setCreditRupees(Number(e.target.value))}
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Service goodwill discount credit"
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-medium"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    Issue Credit
                  </button>
                </form>
              </div>
            )}

            {/* Tab 5: Account Suspension & Security */}
            {activeTab === "suspension" && (
              <div className="p-4 sm:p-5 rounded-2xl border border-red-200 dark:border-red-900/80 bg-red-50/40 dark:bg-red-950/20 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-extrabold text-red-900 dark:text-red-300">
                      {sub?.status === "SUSPENDED" ? "Account Currently Suspended" : "High-Risk Action: Suspend Account"}
                    </h4>
                    <p className="text-xs text-red-800 dark:text-red-400 mt-1">
                      {sub?.status === "SUSPENDED"
                        ? "This school is in view-only or blocked access mode. Resuming will recalculate true subscription validity."
                        : "Suspension immediately denies access across all student, teacher, and school admin portals."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-900 dark:text-red-300">
                    Mandatory Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Terms violation or payment default investigation"
                    className="w-full rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-950 p-2.5 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {sub?.status !== "SUSPENDED" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-red-900 dark:text-red-300">
                      Type <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1 rounded">SUSPEND</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder="SUSPEND"
                      className="w-full rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-950 p-2.5 text-xs font-mono font-bold text-red-600"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleToggleSuspension}
                  disabled={submitting || (sub?.status !== "SUSPENDED" && confirmPhrase !== "SUSPEND")}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer ${
                    sub?.status === "SUSPENDED"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {sub?.status === "SUSPENDED" ? "Resume Account Subscription" : "Confirm Emergency Suspension"}
                </button>
              </div>
            )}

            {/* Tab 6: Adjustment History & Chronological Timeline */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Unified Chronological Timeline
                </h4>
                <div className="space-y-3">
                  {data?.timeline?.map((evt: any) => (
                    <div key={evt.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{evt.title}</span>
                        <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{evt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
