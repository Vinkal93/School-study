"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Calendar, ShieldCheck, FileText, ArrowRight, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS, calculateSubscriptionState, DEFAULT_GLOBAL_ACCESS_POLICY } from "@/lib/billing";
import type { SchoolSubscription } from "@/types";
import { PaymentRecord, InvoiceRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SchoolAdminBillingPage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [subState, setSubState] = useState<ReturnType<typeof calculateSubscriptionState> | null>(null);
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

        // 1. Load School Subscription
        const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, profile.schoolId);
        const subSnap = await getDoc(subRef);

        if (subSnap.exists()) {
          const subData = subSnap.data() as SchoolSubscription;
          setSubscription(subData);
          const computed = calculateSubscriptionState(subData, DEFAULT_GLOBAL_ACCESS_POLICY);
          setSubState(computed);
        }

        // 2. Load Payment History for this school (Section 15)
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
          Manage your plan, check renewal deadlines, and access billing invoices.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Fetching billing status...</span>
        </div>
      ) : (
        <>
          {/* Current Subscription Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Active Subscription</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize mt-0.5">
                  {subscription?.planId || "Starter"} Plan
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

          {/* Payment History Table (Section 15) */}
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
