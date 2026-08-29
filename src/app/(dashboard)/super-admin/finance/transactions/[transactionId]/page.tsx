"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Receipt,
  FileText,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getTransactionTrace } from "@/lib/billing/finance";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminTransactionDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const transactionId = (params?.transactionId as string) || "";

  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrace() {
      if (!transactionId) return;
      setLoading(true);
      try {
        const data = await getTransactionTrace(transactionId);
        setTrace(data);
      } catch (err) {
        console.error("Failed to load transaction trace:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTrace();
  }, [transactionId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-sm font-semibold">Tracing end-to-end transaction timeline...</span>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <Receipt className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transaction not found</h2>
        <p className="text-xs text-slate-500">Record ID: {transactionId}</p>
        <Link
          href="/super-admin/finance/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Transactions</span>
        </Link>
      </div>
    );
  }

  const { payment, order, invoice, financeTx, school, subscription, hasReconciliationIssue } = trace;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb Header */}
      <div>
        <Link
          href="/super-admin/finance/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Transactions Ledger</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <span>Transaction Trace: {payment?.razorpayPaymentId || order?.id || transactionId}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              End-to-end verification audit from checkout order to ledger entry and subscription.
            </p>
          </div>

          <span
            className={`px-3 py-1 text-xs font-extrabold rounded-full uppercase shrink-0 ${
              payment?.status === "CAPTURED" || order?.status === "PAID"
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
            }`}
          >
            {payment?.status || order?.status || "UNKNOWN"}
          </span>
        </div>
      </div>

      {/* Reconciliation Warning Banner (Section 13) */}
      {hasReconciliationIssue && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 flex items-center gap-3 text-amber-900 dark:text-amber-300 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Reconciliation issue detected</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-400 leading-relaxed">
              One or more entities in this transaction chain (Order $\to$ Payment $\to$ Invoice $\to$ Finance Transaction) are missing or unreconciled.
            </p>
          </div>
        </div>
      )}

      {/* Visual Timeline (Section 13) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
          Financial Trace Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
          {/* Step 1: Internal Order */}
          <div className={`p-4 rounded-2xl border ${order ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/40"} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">1. Order</span>
              {order ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="font-mono text-xs font-bold truncate text-slate-900 dark:text-white">{order?.id || "Missing"}</p>
            <p className="text-[10px] text-slate-500">{order?.status || "N/A"}</p>
          </div>

          {/* Step 2: Payment Gateway */}
          <div className={`p-4 rounded-2xl border ${payment ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/40"} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">2. Gateway</span>
              {payment ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="font-mono text-xs font-bold truncate text-slate-900 dark:text-white">{payment?.razorpayPaymentId || "Missing"}</p>
            <p className="text-[10px] text-slate-500">{payment?.status || "N/A"}</p>
          </div>

          {/* Step 3: Tax Invoice */}
          <div className={`p-4 rounded-2xl border ${invoice ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/40"} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">3. Invoice</span>
              {invoice ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="font-mono text-xs font-bold truncate text-slate-900 dark:text-white">{invoice?.invoiceNumber || "Missing"}</p>
            <p className="text-[10px] text-slate-500">{invoice?.status || "N/A"}</p>
          </div>

          {/* Step 4: Ledger Entry */}
          <div className={`p-4 rounded-2xl border ${financeTx ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/40"} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">4. Ledger</span>
              {financeTx ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="font-mono text-xs font-bold truncate text-slate-900 dark:text-white">{financeTx?.id || "Missing"}</p>
            <p className="text-[10px] text-slate-500">{financeTx?.direction || "CREDIT"}</p>
          </div>

          {/* Step 5: Subscription */}
          <div className={`p-4 rounded-2xl border ${subscription ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/40"} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">5. Subscription</span>
              {subscription ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <p className="font-mono text-xs font-bold truncate text-slate-900 dark:text-white">{subscription?.planId || "Missing"}</p>
            <p className="text-[10px] text-slate-500">{subscription?.status || "ACTIVE"}</p>
          </div>
        </div>
      </div>

      {/* Financial Details Grid (Section 12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accounting Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Payment & Pricing Breakdown
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Gross Price</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatRupees((payment?.amount || order?.finalAmount || 0) + (payment?.discountAmount || order?.discountAmount || 0))}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Coupon Discount</span>
              <span className="font-mono font-bold text-purple-600">
                -{formatRupees(payment?.discountAmount || order?.discountAmount || 0)}
              </span>
            </div>

            <div className="flex justify-between py-2 font-bold text-sm">
              <span className="text-slate-900 dark:text-white">Net Paid Amount</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupees(payment?.amount || order?.finalAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* School & Subscriber Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Subscriber Information
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">School Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{school?.name || payment?.schoolId || order?.schoolId}</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Plan Version</span>
              <span className="font-bold capitalize text-blue-600">{payment?.planId || order?.planId} ({payment?.billingCycle || order?.billingCycle})</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Captured Timestamp</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {payment?.capturedAt ? new Date(payment.capturedAt).toLocaleString("en-IN") : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
