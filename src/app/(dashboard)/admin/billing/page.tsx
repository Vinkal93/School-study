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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  BILLING_COLLECTIONS,
  calculateSubscriptionState,
  DEFAULT_GLOBAL_ACCESS_POLICY,
  getEffectiveEntitlement,
} from "@/lib/billing";
import type { SchoolSubscription, EffectiveEntitlement } from "@/types";
import { PaymentRecord, InvoiceRecord } from "@/lib/payments/fulfillment";
import { RechargeModal } from "@/components/billing/RechargeModal";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SchoolAdminBillingPage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [subState, setSubState] = useState<ReturnType<typeof calculateSubscriptionState> | null>(null);
  const [entitlement, setEntitlement] = useState<EffectiveEntitlement | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, string>>({});

  // Recharge Modal State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargePlan, setSelectedRechargePlan] = useState("plan_starter");
  const [selectedRechargeCycle, setSelectedRechargeCycle] = useState<"monthly" | "annual">("monthly");

  const loadBillingData = async () => {
    if (authLoading || !profile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      if (!db) return;

      // 1. Load School Subscription & Effective Entitlement
      const [subSnap, entData] = await Promise.all([
        getDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, profile.schoolId)),
        getEffectiveEntitlement(profile.schoolId),
      ]);

      if (subSnap.exists()) {
        const subData = subSnap.data() as SchoolSubscription;
        setSubscription(subData);
        const computed = calculateSubscriptionState(subData, DEFAULT_GLOBAL_ACCESS_POLICY);
        setSubState(computed);
        setSelectedRechargePlan(subData.planId || "plan_starter");
        setSelectedRechargeCycle(subData.billingCycle || "monthly");
      }

      setEntitlement(entData);

      // 2. Load Payment History for this school
      const payRef = collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments");
      const qPay = query(payRef, where("schoolId", "==", profile.schoolId));
      const paySnap = await getDocs(qPay);
      const pList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
      pList.sort((a, b) => new Date(b.capturedAt || b.createdAt).getTime() - new Date(a.capturedAt || a.createdAt).getTime());
      setPayments(pList);

      // 3. Load Invoices Map for this school
      const invRef = collection(db, BILLING_COLLECTIONS.INVOICES || "invoices");
      const qInv = query(invRef, where("schoolId", "==", profile.schoolId));
      const invSnap = await getDocs(qInv);
      const iMap: Record<string, string> = {};
      for (const d of invSnap.docs) {
        const inv = d.data() as InvoiceRecord;
        iMap[inv.paymentId || d.id] = inv.invoiceNumber;
      }
      setInvoicesMap(iMap);
    } catch (err) {
      console.error("Failed to load school admin billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [profile, authLoading]);

  const openRechargeForPlan = (planId: string, cycle: "monthly" | "annual" = "monthly") => {
    setSelectedRechargePlan(planId);
    setSelectedRechargeCycle(cycle);
    setShowRechargeModal(true);
  };

  // Status message mapping (Section 2)
  const getStatusDescription = () => {
    if (!subState) return "Checking subscription status...";
    if (subState.accessMode === "FULL_ACCESS") {
      return "Your plan is active and operating with full privileges.";
    }
    if (subState.accessMode === "EXPIRING") {
      return `Your plan expires in ${subState.daysRemaining} days. Recharge now to ensure uninterrupted operations.`;
    }
    if (subState.accessMode === "GRACE_ACCESS") {
      return `Your plan has expired (${subState.graceRemaining} days grace period remaining). Please recharge now to avoid access restriction.`;
    }
    if (subState.accessMode === "RESTRICTED_ACCESS") {
      return "Your plan and grace period have expired. Access has been restricted to view-only mode.";
    }
    if (subState.accessMode === "NO_ACCESS") {
      return "Your subscription has expired or is suspended. Recharge to continue using School Study.";
    }
    return "Your plan is active.";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            School Billing & Subscription
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your plan, check real-time resource limits, renewal deadlines, and access billing invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Recharge / Renew Now</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Fetching billing and plan status...</span>
        </div>
      ) : (
        <>
          {/* Status Alert Banner (Section 2) */}
          {subState && subState.accessMode !== "FULL_ACCESS" && (
            <div
              className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${
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

              <button
                onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
                className={`px-4 py-1.5 rounded-xl text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs ${
                  subState.accessMode === "EXPIRING" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Recharge Now
              </button>
            </div>
          )}

          {/* Over-limit Global Warning (Section 15) */}
          {entitlement &&
            (entitlement.limits.students.isOverLimit ||
              entitlement.limits.teachers.isOverLimit ||
              entitlement.limits.classes.isOverLimit) && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-4 flex items-start gap-3 text-red-800 dark:text-red-300">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold">Plan Capacity Limit Exceeded</h3>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    One or more resources currently exceed your plan limit. Your existing data remains safe and fully accessible, but you cannot create new records until your plan is upgraded.
                  </p>
                </div>
                <button
                  onClick={() => openRechargeForPlan("plan_professional", "monthly")}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shrink-0 transition-all cursor-pointer"
                >
                  Upgrade Now
                </button>
              </div>
            )}

          {/* Current Subscription Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Active Subscription
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize mt-0.5">
                  {entitlement?.plan.name || subscription?.planId || "Starter"} Plan
                </h2>
                <p className="text-xs text-slate-500 mt-1">{getStatusDescription()}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-extrabold rounded-full uppercase ${
                    subState?.status === "ACTIVE" || subscription?.status === "ACTIVE"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {subState?.status || subscription?.status || "ACTIVE"}
                </span>

                <button
                  onClick={() => openRechargeForPlan(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span>Recharge / Upgrade</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
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
          </div>

          {/* Section 20: Real Plan Limits & Usage Progress */}
          {entitlement && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Resource Usage & Capacity Limits
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live document counts enforced directly by your active plan version.
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
                {/* Students Limit */}
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
                        {isWarn && <span className="font-bold text-amber-600">Near Limit</span>}
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Teachers Limit */}
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
                        {isWarn && <span className="font-bold text-amber-600">Near Limit</span>}
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Classes Limit */}
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
                        {isWarn && <span className="font-bold text-amber-600">Near Limit</span>}
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Staff Limit */}
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
                        {isWarn && <span className="font-bold text-amber-600">Near Limit</span>}
                        {isExceeded && <span className="font-bold text-red-600">Upgrade Required</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick Sub-navigation Cards for Payments & Invoices */}
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

          {/* Payment History Table Preview */}
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
                      <th className="p-3">Actions</th>
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
                          <td className="p-3">
                            <Link
                              href={`/billing/invoices/${invId}`}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              View Invoice →
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
        </>
      )}

      {/* Real Server-Controlled Recharge Modal */}
      {profile?.schoolId && profile?.uid && (
        <RechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          schoolId={profile.schoolId}
          userId={profile.uid}
          initialPlanId={selectedRechargePlan}
          initialBillingCycle={selectedRechargeCycle}
          currentPlanId={subscription?.planId}
          currentUsage={
            entitlement
              ? {
                  schoolId: profile.schoolId,
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
