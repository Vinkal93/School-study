"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { PaymentRecord, InternalOrder, InvoiceRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [schoolsMap, setSchoolsMap] = useState<Record<string, string>>({});
  const [invoicesMap, setInvoicesMap] = useState<Record<string, string>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected Transaction Modal
  const [selectedTx, setSelectedTx] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const db = getFirebaseDb();
        if (!db) return;

        const [paySnap, schoolSnap, invSnap] = await Promise.all([
          getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
          getDocs(collection(db, "schools")),
          getDocs(collection(db, BILLING_COLLECTIONS.INVOICES || "invoices")),
        ]);

        const payList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
        setPayments(payList);

        const sMap: Record<string, string> = {};
        for (const d of schoolSnap.docs) sMap[d.id] = (d.data() as any).name || d.id;
        setSchoolsMap(sMap);

        const iMap: Record<string, string> = {};
        for (const d of invSnap.docs) {
          const inv = d.data() as InvoiceRecord;
          iMap[inv.paymentId || d.id] = inv.invoiceNumber;
        }
        setInvoicesMap(iMap);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = payments.filter((p) => {
    const sName = (schoolsMap[p.schoolId] || p.schoolId).toLowerCase();
    const matchesSearch =
      sName.includes(search.toLowerCase()) ||
      p.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId?.toLowerCase().includes(search.toLowerCase());

    const matchesPlan = planFilter === "all" || p.planId === planFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Financial Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real captured payments, razorpay orders, and invoice mappings.
          </p>
        </div>

        <Link
          href="/super-admin/finance"
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Finance Overview
        </Link>
      </div>

      {/* Filters Bar (Section 8) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search school name, payment ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Loading transaction records...</span>
        </div>
      ) : paginated.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No transactions yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3">Date</th>
                  <th className="p-3">School</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((p) => {
                  const invNum = invoicesMap[p.id] || `INV-${p.orderId?.slice(-6).toUpperCase()}`;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {new Date(p.capturedAt || p.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {schoolsMap[p.schoolId] || p.schoolId}
                      </td>
                      <td className="p-3 font-semibold capitalize text-blue-600 dark:text-blue-400">{p.planId}</td>
                      <td className="p-3 font-semibold uppercase">{p.billingCycle}</td>
                      <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupees(p.amount)}</td>
                      <td className="p-3 text-amber-600">{formatRupees(p.discountAmount || 0)}</td>
                      <td className="p-3 uppercase text-[11px] font-semibold text-slate-500">{p.method || "Razorpay"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            p.status === "CAPTURED"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">{invNum}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedTx(p)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal (Section 9) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Transaction Breakdown</h2>
              <p className="text-xs text-slate-500">Authoritative payment record details</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">School Name</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {schoolsMap[selectedTx.schoolId] || selectedTx.schoolId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Plan Billed</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">
                  {selectedTx.planId} ({selectedTx.billingCycle})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Plan Version</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTx.planVersionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Base Amount</span>
                <span className="font-semibold">{formatRupees(selectedTx.amount + (selectedTx.discountAmount || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Discount Given</span>
                <span className="font-semibold text-amber-600">{formatRupees(selectedTx.discountAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Final Amount Billed</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatRupees(selectedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Razorpay Order ID</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{selectedTx.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Razorpay Payment ID</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{selectedTx.razorpayPaymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Invoice Reference</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {invoicesMap[selectedTx.id] || `INV-${selectedTx.orderId?.slice(-6).toUpperCase()}`}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
