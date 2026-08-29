"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Download,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import type { InvoiceRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SchoolAdminInvoicesPage() {
  const { profile, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadInvoices = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;

      // 1. Fetch invoices strictly isolated by authenticated schoolId
      const invRef = collection(db, BILLING_COLLECTIONS.INVOICES || "invoices");
      const qInv = query(invRef, where("schoolId", "==", schoolId));
      const invSnap = await getDocs(qInv);

      let iList = invSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InvoiceRecord[];

      // Sort desc by issuedAt date
      iList.sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
      setInvoices(iList);
    } catch (err) {
      console.error("Failed to load school invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadInvoices();
    }
  }, [schoolId, authLoading]);

  const filteredInvoices = invoices.filter((inv) => {
    return (
      searchQuery === "" ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.planId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
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
            <FileText className="h-6 w-6 text-blue-600" />
            GST Tax Invoices & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Download official GST compliant invoices and payment receipts for your accounting records.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice Number (e.g. INV-2026) or Plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading official invoices...</span>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No invoices generated yet.
            </p>
            <p className="text-xs text-slate-400">
              Invoices are automatically created whenever a subscription is recharged or renewed.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                    <th className="p-3">Invoice Number</th>
                    <th className="p-3">Date Issued</th>
                    <th className="p-3">Plan Billed</th>
                    <th className="p-3">Billing Cycle</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedInvoices.map((inv) => {
                    const invId = inv.id.startsWith("inv_") ? inv.id : `inv_${inv.orderId}`;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(inv.issuedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 font-semibold capitalize text-slate-900 dark:text-white">
                          {inv.planId.replace("plan_", "")}
                        </td>
                        <td className="p-3 font-semibold uppercase text-slate-500">
                          {inv.billingCycle}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white font-mono">
                          {formatRupees(inv.total)}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{inv.status}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/billing/invoices/${invId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-bold transition-all"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View & Download</span>
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
