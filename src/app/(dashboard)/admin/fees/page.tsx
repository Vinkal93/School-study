"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Printer,
  Share2,
  PhoneCall,
  Loader2,
  Percent,
} from "lucide-react";
import {
  getFeeDashboardMetrics,
  getFeeTransactions,
} from "@/lib/services/fee.service";
import type { FeePayment } from "@/types";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";

export default function AdminFeeDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<FeePayment[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<FeePayment | null>(null);

  const [metrics, setMetrics] = useState({
    totalExpectedPaise: 0,
    totalCollectedPaise: 0,
    totalPendingPaise: 0,
    overdueAmountPaise: 0,
    todayCollectionPaise: 0,
    thisMonthCollectionPaise: 0,
    paidStudentsCount: 0,
    defaultersCount: 0,
    partialPaymentsCount: 0,
    collectionRate: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const [dashMetrics, txns] = await Promise.all([
          getFeeDashboardMetrics(schoolId),
          getFeeTransactions(schoolId),
        ]);
        setMetrics(dashMetrics);
        setRecentTransactions(txns.slice(0, 5));
      } catch (err) {
        console.error("Failed to load fee dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [schoolId]);

  const fmtRupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <EntitlementGate
      feature="fee_management"
      title="Fee Management Dashboard"
      description="Track total collection, outstanding dues, daily fee roll calls, and financial summaries."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fee Management Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time collections, overdue balances, and verified financial telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Collect Fee</span>
            </Link>
            <Link
              href="/admin/fees/defaulters"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 active:scale-95 transition-all"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Dues & Defaulters ({metrics.defaultersCount})</span>
            </Link>
            <Link
              href="/admin/fees/structures"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <span>Structures</span>
            </Link>
          </div>
        </div>

        {/* 4 Interactive Clickable Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Expected */}
          <Link
            href="/admin/fees/student-fees"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                Total Expected Fee
              </span>
              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalExpectedPaise)}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Total assigned budget</span>
              <ArrowRight className="h-3.5 w-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Card 2: Total Collected */}
          <Link
            href="/admin/fees/transactions"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">Total Fee Collected</span>
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalCollectedPaise)}</p>
            <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold">
              <span>This Month: {fmtRupees(metrics.thisMonthCollectionPaise)}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Card 3: Total Pending Dues */}
          <Link
            href="/admin/fees/defaulters"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600">Total Outstanding Dues</span>
              <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalPendingPaise)}</p>
            <div className="flex items-center justify-between text-[11px] text-amber-600 font-semibold">
              <span>Overdue: {fmtRupees(metrics.overdueAmountPaise)}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Card 4: Today's Collection */}
          <Link
            href="/admin/fees/transactions"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600">Today's Collection</span>
              <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.todayCollectionPaise)}</p>
            <div className="flex items-center justify-between text-[11px] text-purple-600 font-semibold">
              <span>Paid Students: {metrics.paidStudentsCount}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>

        {/* Collection & Defaulter Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Collection Progress & Recovery</h3>
              <Link href="/admin/fees/reports" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                <span>View Full Reports</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Collected vs Outstanding</span>
                <span className="text-emerald-600 font-black">
                  {metrics.collectionRate}% Recovery Rate
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${
                      metrics.totalExpectedPaise > 0
                        ? (metrics.totalCollectedPaise / metrics.totalExpectedPaise) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${
                      metrics.totalExpectedPaise > 0
                        ? (metrics.totalPendingPaise / metrics.totalExpectedPaise) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link href="/admin/fees/transactions" className="hover:opacity-80 transition-opacity">
                <p className="text-xs text-slate-500">Fully Settled</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{metrics.paidStudentsCount} accounts</p>
              </Link>
              <Link href="/admin/fees/defaulters" className="hover:opacity-80 transition-opacity">
                <p className="text-xs text-slate-500">Partial Payments</p>
                <p className="text-lg font-black text-amber-600 mt-1">{metrics.partialPaymentsCount} accounts</p>
              </Link>
              <Link href="/admin/fees/defaulters" className="hover:opacity-80 transition-opacity">
                <p className="text-xs text-slate-500">Defaulters / Overdue</p>
                <p className="text-lg font-black text-rose-600 mt-1">{metrics.defaultersCount} students</p>
              </Link>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-extrabold">Fee Operations Hub</h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Authoritative multi-tier billing management with real-time audit logs.
              </p>
            </div>
            <div className="space-y-2.5">
              <Link
                href="/admin/fees/collect"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold text-white"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  Collect Student Fee
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/admin/fees/defaulters"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold text-white"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Dues / Defaulters CRM
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/admin/fees/transactions"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold text-white"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Transactions & Receipts
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Fee Transactions Table */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Recent Verified Collections</h3>
              <p className="text-xs text-slate-500">Latest fee receipts issued across school classes.</p>
            </div>
            <Link
              href="/admin/fees/transactions"
              className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <span>View All Transactions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              No recent payment transactions recorded. Click "Collect Fee" to record your first payment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/admin/students/${tx.studentId}`} className="font-bold text-slate-900 dark:text-white hover:text-blue-600 hover:underline">
                          {tx.studentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {tx.className} ({tx.sectionName || "A"})
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">{tx.paymentMethod}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        ₹{(tx.amountPaidPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(tx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Receipt Modal */}
        {selectedReceipt && (
          <FeeReceiptModal
            isOpen={Boolean(selectedReceipt)}
            onClose={() => setSelectedReceipt(null)}
            payment={selectedReceipt}
            schoolName={(profile as any)?.schoolName || "School Study Institution"}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
