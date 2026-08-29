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

  useEffect(() => {
    async function loadBillingData() {
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
        }

        setEntitlement(entData);

        // 2. Load Payment History for this school
        const payRef = collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments");
        const qPay = query(payRef, where("schoolId", "==", profile.schoolId));
        const paySnap = await getDocs(qPay);
        const pList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
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
    }

    loadBillingData();
  }, [profile, authLoading]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          School Billing & Subscription
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your plan, check real-time resource limits, renewal deadlines, and access billing invoices.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Fetching billing and plan status...</span>
        </div>
      ) : (
        <>
          {/* Over-limit or Near-Limit Global Warning */}
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
                <Link
                  href="/pricing"
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shrink-0 transition-all"
                >
                  Upgrade Now
                </Link>
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

                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all active:scale-95"
                >
                  <span>Recharge / Upgrade</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Increase Limits</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
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

                      {/* Progress Bar */}
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

                      {/* Progress Bar */}
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

                      {/* Progress Bar */}
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

                      {/* Progress Bar */}
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

          {/* Feature Entitlements Overview */}
          {entitlement && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Included Features & Modules
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(entitlement.features).map(([featKey, isAllowed]) => {
                  const formattedName = featKey
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");

                  return (
                    <div
                      key={featKey}
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold ${
                        isAllowed
                          ? "border-emerald-200/80 bg-emerald-50/40 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                          : "border-slate-200/80 bg-slate-50/40 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40"
                      }`}
                    >
                      {isAllowed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{formattedName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment & Invoice History</h3>

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
                    {payments.map((p) => {
                      const invId = `inv_${p.orderId}`;
                      const invNum = invoicesMap[p.id] || `INV-${p.orderId?.slice(-6).toUpperCase()}`;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {new Date(p.capturedAt || p.createdAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="p-3 font-semibold capitalize text-blue-600 dark:text-blue-400">{p.planId}</td>
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
    </div>
  );
}
