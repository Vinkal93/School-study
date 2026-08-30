"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  ShieldCheck,
  FileText,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  UserCog,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Receipt,
  ExternalLink,
  Clock,
  Ban,
  RotateCcw,
  X,
  HelpCircle,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery, appQueryClient } from "@/lib/cache";
import { PageSkeleton } from "@/components/common/skeletons";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  BILLING_COLLECTIONS,
  calculateSubscriptionState,
  DEFAULT_GLOBAL_ACCESS_POLICY,
  getEffectiveEntitlement,
} from "@/lib/billing";
import type { SchoolSubscription, EffectiveEntitlement, SubscriptionStatus } from "@/types";
import { PaymentRecord, InvoiceRecord } from "@/lib/payments/fulfillment";
import { RechargeModal } from "@/components/billing/RechargeModal";
import { toast } from "sonner";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SchoolAdminBillingPage() {
  const { profile, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Modals & Drawers
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargePlan, setSelectedRechargePlan] = useState("plan_starter");
  const [selectedRechargeCycle, setSelectedRechargeCycle] = useState<"monthly" | "annual">("monthly");

  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<PaymentRecord | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetDowngradePlan, setTargetDowngradePlan] = useState("plan_starter");
  const [submittingAction, setSubmittingAction] = useState(false);

  // SWR Cached Query for Billing Data
  const {
    data: billingBundle,
    isLoading: isBillingLoading,
    refetch: refetchBilling,
  } = useAppQuery(
    schoolId ? `schoolBilling:${schoolId}` : null,
    async () => {
      // 1. Fetch Subscription & Entitlements via API
      const res = await fetch(`/api/billing/subscription?schoolId=${schoolId}`);
      const json = await res.json();

      let sub: SchoolSubscription | null = null;
      let hist: any[] = [];
      let computedSubState: ReturnType<typeof calculateSubscriptionState> | null = null;

      if (json.success) {
        sub = json.subscription;
        hist = json.history || [];
        if (json.subscription) {
          computedSubState = calculateSubscriptionState(json.subscription, DEFAULT_GLOBAL_ACCESS_POLICY);
        }
      }

      const entData = await getEffectiveEntitlement(schoolId);

      let pList: PaymentRecord[] = [];
      let iMap: Record<string, string> = {};

      const db = getFirebaseDb();
      if (db) {
        // 2. Load Payment History for this school
        const payRef = collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments");
        const qPay = query(payRef, where("schoolId", "==", schoolId));
        const paySnap = await getDocs(qPay);
        pList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
        pList.sort((a, b) => new Date(b.capturedAt || b.createdAt).getTime() - new Date(a.capturedAt || a.createdAt).getTime());

        // 3. Load Invoices Map for this school
        const invRef = collection(db, BILLING_COLLECTIONS.INVOICES || "invoices");
        const qInv = query(invRef, where("schoolId", "==", schoolId));
        const invSnap = await getDocs(qInv);
        for (const d of invSnap.docs) {
          const inv = d.data() as InvoiceRecord;
          iMap[inv.paymentId || d.id] = inv.invoiceNumber;
        }
      }

      // 4. Load Public Site Settings for Support Contact
      let siteSet: any = null;
      try {
        const siteRes = await fetch("/api/site-settings");
        const siteJson = await siteRes.json();
        if (siteJson.published) siteSet = siteJson.published;
      } catch (e) {
        // Safe fallback
      }

      return {
        subscription: sub,
        subState: computedSubState,
        entitlement: entData,
        history: hist,
        payments: pList,
        invoicesMap: iMap,
        siteSettings: siteSet,
      };
    },
    { enabled: !!schoolId && !authLoading, staleTime: 30_000 }
  );

  const subscription = billingBundle?.subscription || null;
  const subState = billingBundle?.subState || null;
  const entitlement = billingBundle?.entitlement || null;
  const history = billingBundle?.history || [];
  const payments = billingBundle?.payments || [];
  const invoicesMap = billingBundle?.invoicesMap || {};
  const siteSettings = billingBundle?.siteSettings || null;

  const loading = isBillingLoading && !billingBundle;

  const loadBillingData = () => {
    refetchBilling(true);
  };

  const openRechargeForPlan = (planId: string, cycle: "monthly" | "annual" = "monthly") => {
    setSelectedRechargePlan(planId);
    setSelectedRechargeCycle(cycle);
    setShowRechargeModal(true);
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription at period end? Access will remain active until your expiry date.")) return;
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel subscription.");

      toast.success("Subscription set to cancel at period end.");
      loadBillingData();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResumeSubscription = async () => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/billing/subscription/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resume subscription.");

      toast.success("Subscription resumed successfully.");
      loadBillingData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resume subscription.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDowngradeSubmit = async () => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/billing/subscription/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          targetPlanId: targetDowngradePlan,
          currentStudentCount: entitlement?.limits.students.current || 0,
          currentTeacherCount: entitlement?.limits.teachers.current || 0,
          actorId: profile?.uid || "school_admin",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to schedule downgrade.");

      toast.success(json.message || "Downgrade scheduled successfully.");
      setShowDowngradeModal(false);
      loadBillingData();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule downgrade.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusDescription = () => {
    if (!subState) return "Checking subscription status...";
    if (subscription?.status === "SUSPENDED") {
      return "Your subscription has been suspended by platform administration. Please contact support.";
    }
    if (subState.accessMode === "FULL_ACCESS") {
      return "Your plan is active and operating with full privileges.";
    }
    if (subState.accessMode === "EXPIRING") {
      return `Your plan expires in ${subState.daysRemaining} days. Renew now to ensure uninterrupted operations.`;
    }
    if (subState.accessMode === "GRACE_ACCESS") {
      return `Your plan has expired (${subState.graceRemaining} days grace period remaining). Please renew to avoid view-only mode.`;
    }
    if (subState.accessMode === "RESTRICTED_ACCESS") {
      return "Your plan and grace period have expired. Access has been restricted to view-only mode.";
    }
    if (subState.accessMode === "NO_ACCESS") {
      return "Your subscription has expired or is suspended. Renew to continue using School Study.";
    }
    return "Your plan is active.";
  };

  const getStatusBadge = (status?: SubscriptionStatus, isCancelPending?: boolean) => {
    if (isCancelPending) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          CANCEL AT PERIOD END
        </span>
      );
    }

    switch (status) {
      case "ACTIVE":
      case "TRIAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        );
      case "EXPIRING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            EXPIRING
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3" />
            GRACE PERIOD
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            EXPIRED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-0.5 text-xs font-bold">
            <Ban className="h-3 w-3" />
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            {status || "ACTIVE"}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Subscription & Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your school's plan, resource capacity, payments, and tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
            disabled={subscription?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Renew Plan</span>
          </button>
          <button
            onClick={() => openRechargeForPlan("plan_professional", "monthly")}
            disabled={subscription?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton hasStats={true} hasTable={true} className="py-2" />
      ) : (
        <>
          {/* Status Alert Banner */}
          {subState && subState.accessMode !== "FULL_ACCESS" && (
            <div
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                subState.accessMode === "EXPIRING"
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                  : "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 text-red-900 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {subState.accessMode === "EXPIRING" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                )}
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">
                    {subState.accessMode === "EXPIRING" ? "Subscription Expiring Soon: " : "Plan Renewal Required: "}
                  </span>
                  <span>{getStatusDescription()}</span>
                </div>
              </div>

              {subscription?.status !== "SUSPENDED" && (
                <button
                  onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
                  className={`px-4 py-1.5 rounded-xl text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs ${
                    subState.accessMode === "EXPIRING" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Renew Plan Now
                </button>
              )}
            </div>
          )}

          {/* Cancellation Notice Banner */}
          {subscription?.cancelAtPeriodEnd && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Cancellation Pending:</strong> Your subscription is set to cancel on{" "}
                  <strong>{new Date(subscription.expiresAt || subscription.currentPeriodEnd || "").toLocaleDateString()}</strong>. Full access is maintained until then.
                </span>
              </div>
              <button
                onClick={handleResumeSubscription}
                disabled={submittingAction}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shrink-0"
              >
                Resume Subscription
              </button>
            </div>
          )}

          {/* Scheduled Downgrade Card (Section 13) */}
          {subscription?.pendingChange && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-extrabold text-sm">Upcoming Plan Change (Scheduled Downgrade)</h3>
                </div>
                <button
                  onClick={async () => {
                    setSubmittingAction(true);
                    try {
                      const db = getFirebaseDb();
                      if (db) {
                        const ref = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
                        await getDocs(query(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)));
                      }
                      toast.success("Scheduled plan change updated.");
                      loadBillingData();
                    } catch (e) {
                      toast.error("Failed to cancel scheduled change.");
                    } finally {
                      setSubmittingAction(false);
                    }
                  }}
                  disabled={submittingAction}
                  className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  Cancel Scheduled Change
                </button>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-300 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <p><strong>Current Plan:</strong> {subscription.planId}</p>
                <p><strong>Next Plan:</strong> {subscription.pendingChange.targetPlanId}</p>
                <p><strong>Effective Date:</strong> {new Date(subscription.pendingChange.effectiveAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {/* Current Subscription Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active School Subscription
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize mt-0.5">
                  {entitlement?.plan.name || subscription?.planId || "Starter"} Plan
                </h2>
                <p className="text-xs text-slate-500 mt-1">{getStatusDescription()}</p>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(subscription?.status, subscription?.cancelAtPeriodEnd)}

                {subscription?.status !== "SUSPENDED" && (
                  <>
                    <button
                      onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Renew / Upgrade</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setShowDowngradeModal(true)}
                      className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    >
                      Change Plan
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 font-semibold">Start Date</span>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {subscription?.startsAt ? new Date(subscription.startsAt).toLocaleDateString("en-IN") : "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 font-semibold">Expiry Date</span>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString("en-IN") : "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 font-semibold">Days Remaining</span>
                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {subState?.daysRemaining ?? 0} Days
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 font-semibold">Billing Cycle</span>
                <p className="font-extrabold text-slate-900 dark:text-white uppercase">
                  {subscription?.billingCycle || "Monthly"}
                </p>
              </div>
            </div>

            {/* Cancellation Option Footer */}
            {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleCancelSubscription}
                  disabled={submittingAction}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 underline"
                >
                  Cancel subscription at period end
                </button>
              </div>
            )}
          </div>

          {/* Section 22: Resource Usage & Limits */}
          {entitlement && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Resource Usage & Capacity Limits
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live usage counters enforced against your active plan version limits.
                  </p>
                </div>
                <button
                  onClick={() => openRechargeForPlan("plan_professional", "monthly")}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Increase Limits</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Students */}
                {(() => {
                  const s = entitlement.limits.students;
                  const pct = s.isUnlimited ? 0 : Math.min(100, Math.round((s.current / s.limit) * 100));
                  const isWarn = !s.isUnlimited && s.remaining <= 20 && s.remaining > 0;
                  const isExceeded = s.isOverLimit || (!s.isUnlimited && s.current >= s.limit);
                  return (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Students</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {s.current} / {s.isUnlimited ? "Unlimited" : s.limit}
                        </span>
                      </div>
                      {!s.isUnlimited && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExceeded ? "bg-red-600" : isWarn ? "bg-amber-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="text-[11px] flex items-center justify-between">
                        <span className="text-slate-500">
                          {s.isUnlimited ? "No limit on enrollment" : isExceeded ? "Capacity reached" : `${s.remaining} slots remaining`}
                        </span>
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Teachers */}
                {(() => {
                  const t = entitlement.limits.teachers;
                  const pct = t.isUnlimited ? 0 : Math.min(100, Math.round((t.current / t.limit) * 100));
                  const isWarn = !t.isUnlimited && t.remaining <= 5 && t.remaining > 0;
                  const isExceeded = t.isOverLimit || (!t.isUnlimited && t.current >= t.limit);
                  return (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Teachers</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {t.current} / {t.isUnlimited ? "Unlimited" : t.limit}
                        </span>
                      </div>
                      {!t.isUnlimited && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExceeded ? "bg-red-600" : isWarn ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="text-[11px] flex items-center justify-between">
                        <span className="text-slate-500">
                          {t.isUnlimited ? "No limit on faculty" : isExceeded ? "Capacity reached" : `${t.remaining} slots remaining`}
                        </span>
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Classes */}
                {(() => {
                  const c = entitlement.limits.classes;
                  const pct = c.isUnlimited ? 0 : Math.min(100, Math.round((c.current / c.limit) * 100));
                  const isWarn = !c.isUnlimited && c.remaining <= 3 && c.remaining > 0;
                  const isExceeded = c.isOverLimit || (!c.isUnlimited && c.current >= c.limit);
                  return (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-purple-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Classes</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {c.current} / {c.isUnlimited ? "Unlimited" : c.limit}
                        </span>
                      </div>
                      {!c.isUnlimited && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExceeded ? "bg-red-600" : isWarn ? "bg-amber-500" : "bg-purple-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="text-[11px] flex items-center justify-between">
                        <span className="text-slate-500">
                          {c.isUnlimited ? "No class limits" : isExceeded ? "Capacity reached" : `${c.remaining} slots remaining`}
                        </span>
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Staff */}
                {(() => {
                  const st = entitlement.limits.staff;
                  const pct = st.isUnlimited ? 0 : Math.min(100, Math.round((st.current / st.limit) * 100));
                  const isWarn = !st.isUnlimited && st.remaining <= 1 && st.remaining > 0;
                  const isExceeded = st.isOverLimit || (!st.isUnlimited && st.current >= st.limit);
                  return (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-slate-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Admin Staff</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {st.current} / {st.isUnlimited ? "Unlimited" : st.limit}
                        </span>
                      </div>
                      {!st.isUnlimited && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExceeded ? "bg-red-600" : isWarn ? "bg-amber-500" : "bg-slate-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="text-[11px] flex items-center justify-between">
                        <span className="text-slate-500">
                          {st.isUnlimited ? "Unlimited staff accounts" : isExceeded ? "Capacity reached" : `${st.remaining} slots remaining`}
                        </span>
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 21: Your Plan Includes Features */}
          {entitlement?.features && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Plan Includes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                {Object.keys(entitlement.features)
                  .filter((f) => entitlement.features[f])
                  .map((f: string) => (
                    <div key={f} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{f.replace(/_/g, " ")}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 20: Subscription Audit History Timeline */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Subscription Audit History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Plan Change</th>
                      <th className="p-3">Actor Role</th>
                      <th className="p-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(h.timestamp).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
                            {h.action}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {h.oldPlanId && h.newPlanId ? `${h.oldPlanId} → ${h.newPlanId}` : h.newPlanId || "N/A"}
                        </td>
                        <td className="p-3 font-bold uppercase text-slate-600 dark:text-slate-400">{h.actorRole || "system"}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{h.reason || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments & Invoices Sub-navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/billing/payments"
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-blue-500 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600">
                    Payment History
                  </h3>
                  <p className="text-xs text-slate-500">View complete transaction ledger & payment status</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/admin/billing/invoices"
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-blue-500 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600">
                    Tax Invoices & Receipts
                  </h3>
                  <p className="text-xs text-slate-500">Download official GST invoice PDFs</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Section 16 & 17: Recent Payments Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Payments</h3>
              <Link
                href="/admin/billing/payments"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All Payments ({payments.length}) →
              </Link>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payment transactions recorded for your school.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-3">Date</th>
                      <th className="p-3">Plan Billed</th>
                      <th className="p-3">Billing Cycle</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.slice(0, 5).map((p) => {
                      const invId = `inv_${p.orderId}`;
                      const invNum = invoicesMap[p.id] || `INV-${p.orderId?.slice(-6).toUpperCase()}`;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {new Date(p.capturedAt || p.createdAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="p-3 font-semibold capitalize text-blue-600 dark:text-blue-400">{p.planId.replace("plan_", "")}</td>
                          <td className="p-3 font-semibold uppercase">{p.billingCycle}</td>
                          <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupees(p.amount)}</td>
                          <td className="p-3 font-bold text-emerald-600">{p.status}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{invNum}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedPaymentDetail(p)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mr-3"
                            >
                              Details
                            </button>
                            <Link
                              href={`/billing/invoices/${invId}`}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Invoice →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 31: Billing Contact Information */}
          {siteSettings?.contact?.enabled !== false && (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  Need billing assistance or custom enterprise invoicing?
                </h4>
                <p className="text-slate-500">Contact our SaaS finance support team for queries regarding payments or custom school plans.</p>
              </div>
              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-bold shrink-0">
                {siteSettings?.contact?.email && (
                  <a href={`mailto:${siteSettings.contact.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{siteSettings.contact.email}</span>
                  </a>
                )}
                {siteSettings?.contact?.phone && (
                  <a href={`tel:${siteSettings.contact.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{siteSettings.contact.phone}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Section 12 & 13: Change Plan / Downgrade Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Plan / Schedule Downgrade</h3>
              <button onClick={() => setShowDowngradeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label htmlFor="target-plan-select" className="block font-bold text-slate-700 dark:text-slate-300">Select Target Plan:</label>
              <select
                id="target-plan-select"
                name="targetPlan"
                value={targetDowngradePlan}
                onChange={(e) => setTargetDowngradePlan(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 font-bold text-slate-900 dark:text-white"
              >
                <option value="plan_starter">Starter Plan (Max 500 Students)</option>
                <option value="plan_professional">Professional Plan (Max 2000 Students)</option>
              </select>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Scheduled Change Policy
                </p>
                <p className="text-[11px] leading-relaxed">
                  Downgrades take effect at the end of your current billing cycle. Your existing plan privileges remain active until your expiration date.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDowngradeSubmit}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                Schedule Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 17: Payment Detail Drawer */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Payment Transaction Detail</h3>
              </div>
              <button onClick={() => setSelectedPaymentDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Order & Payment ID</span>
                <p className="font-mono text-slate-900 dark:text-white font-bold">{selectedPaymentDetail.id}</p>
                <p className="font-mono text-slate-500 text-[11px]">Razorpay Order: {selectedPaymentDetail.razorpayOrderId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-slate-400 font-bold">Plan Billed</span>
                  <p className="font-bold text-blue-600 capitalize">{selectedPaymentDetail.planId.replace("plan_", "")}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-slate-400 font-bold">Billing Cycle</span>
                  <p className="font-bold uppercase">{selectedPaymentDetail.billingCycle}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-slate-400 font-bold">Amount Paid</span>
                  <p className="font-extrabold text-emerald-600 text-sm">{formatRupees(selectedPaymentDetail.amount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-slate-400 font-bold">Status</span>
                  <p className="font-bold text-emerald-600">{selectedPaymentDetail.status}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Transaction Timestamps</span>
                <p className="text-slate-500">Captured At: {new Date(selectedPaymentDetail.capturedAt || selectedPaymentDetail.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPaymentDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Server-Controlled Recharge / Renew Modal */}
      {schoolId && profile?.uid && (
        <RechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          schoolId={schoolId}
          userId={profile.uid}
          initialPlanId={selectedRechargePlan}
          initialBillingCycle={selectedRechargeCycle}
          currentPlanId={subscription?.planId}
          currentUsage={
            entitlement
              ? {
                  schoolId,
                  students: entitlement.limits.students.current,
                  teachers: entitlement.limits.teachers.current,
                  classes: entitlement.limits.classes.current,
                  staff: entitlement.limits.staff.current,
                  lastReconciledAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : undefined
          }
          onSuccess={() => {
            loadBillingData();
          }}
        />
      )}
    </div>
  );
}
