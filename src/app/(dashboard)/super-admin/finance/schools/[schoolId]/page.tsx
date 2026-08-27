"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, FileText, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { PaymentRecord, InvoiceRecord, InternalOrder } from "@/lib/payments/fulfillment";
import type { SchoolSubscription } from "@/types";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminSchoolFinanceDetailPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSchoolFinance() {
      if (!schoolId) return;

      try {
        const db = getFirebaseDb();
        if (!db) return;

        // Fetch School Info
        const schoolRef = doc(db, "schools", schoolId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists()) {
          setSchoolName((schoolSnap.data() as any).name || schoolId);
        } else {
          setSchoolName(schoolId);
        }

        // Fetch School Subscription
        const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          setSubscription(subSnap.data() as SchoolSubscription);
        }

        // Fetch School Payments
        const payRef = collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments");
        const qPay = query(payRef, where("schoolId", "==", schoolId));
        const paySnap = await getDocs(qPay);
        const pList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
        setPayments(pList);

        // Fetch Invoices Map
        const invRef = collection(db, BILLING_COLLECTIONS.INVOICES || "invoices");
        const qInv = query(invRef, where("schoolId", "==", schoolId));
        const invSnap = await getDocs(qInv);
        const iMap: Record<string, string> = {};
        for (const d of invSnap.docs) {
          const inv = d.data() as InvoiceRecord;
          iMap[inv.paymentId || d.id] = inv.invoiceNumber;
        }
        setInvoicesMap(iMap);
      } catch (err) {
        console.error("Failed to load school finance detail:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSchoolFinance();
  }, [schoolId]);

  const totalCollectedPaise = payments
    .filter((p) => p.status === "CAPTURED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Super Admin Finance
        </button>

        <Link
          href={`/super-admin/schools/${schoolId}`}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Full School Profile →
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Loading school billing profile...</span>
        </div>
      ) : (
        <>
          {/* School Header & Summary Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  {schoolName}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-1">School ID: {schoolId}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full uppercase">
                  {subscription?.status || "ACTIVE"}
                </span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold rounded-full uppercase">
                  Plan: {subscription?.planId || "Starter"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-500">Total Billed Revenue</span>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatRupees(totalCollectedPaise)}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-500">Successful Payments</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {payments.filter((p) => p.status === "CAPTURED").length}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-1">
                <span className="text-xs font-bold text-slate-500">Subscription Expiry</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString("en-IN") : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* School Payment History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment & Invoice History</h3>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payment transactions recorded for this school.</p>
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
                          <td className="p-3 font-semibold capitalize text-blue-600">{p.planId}</td>
                          <td className="p-3 font-semibold uppercase">{p.billingCycle}</td>
                          <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupees(p.amount)}</td>
                          <td className="p-3 font-bold text-emerald-600">{p.status}</td>
                          <td className="p-3 font-mono">{invNum}</td>
                          <td className="p-3">
                            <Link
                              href={`/billing/invoices/${invId}`}
                              className="text-xs font-bold text-blue-600 hover:underline"
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
