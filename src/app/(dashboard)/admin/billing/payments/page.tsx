"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import type { PaymentRecord, InvoiceRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SchoolAdminPaymentsHistoryPage() {
  const { profile, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadPayments = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;

      // 1. Fetch payments strictly isolated by authenticated schoolId
      const payRef = collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments");
      const qPay = query(payRef, where("schoolId", "==", schoolId));
      const paySnap = await getDocs(qPay);

      let pList = paySnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PaymentRecord[];

      // Sort desc by creation date
      pList.sort(
        (a, b) =>
          new Date(b.capturedAt || b.createdAt).getTime() -
          new Date(a.capturedAt || a.createdAt).getTime()
      );
      setPayments(pList);

      // 2. Fetch invoices map
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
      console.error("Failed to load payment history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadPayments();
    }
  }, [schoolId, authLoading]);

  // Apply search and status filters
  const filteredPayments = payments.filter((p) => {
    const matchesStatus =
      statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.planId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Billing Overview</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Payment History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed ledger of all billing recharges, subscription payments, and receipts.
          </p>
        </div>

        <button
          onClick={loadPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Payment ID or Plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="captured">Captured / Success</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading transactions...</span>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No payment transactions found.
            </p>
            <p className="text-xs text-slate-400">
              Recharge your plan to generate invoices and transaction records.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                    <th className="p-3">Date</th>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Billing</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPayments.map((p) => {
                    const invId = `inv_${p.orderId}`;
                    const invNum = invoicesMap[p.id] || `INV-${p.orderId?.slice(-6).toUpperCase()}`;
                    const isSuccess = p.status === "CAPTURED";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(p.capturedAt || p.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                          {p.razorpayPaymentId || p.id}
                        </td>
                        <td className="p-3 font-bold capitalize text-blue-600 dark:text-blue-400">
                          {p.planId.replace("plan_", "")}
                        </td>
                        <td className="p-3 font-semibold uppercase text-slate-600 dark:text-slate-400">
                          {p.billingCycle}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white font-mono">
                          {formatRupees(p.amount)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isSuccess
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/billing/invoices/${invId}`}
                            className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <span>{invNum}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  Showing Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
