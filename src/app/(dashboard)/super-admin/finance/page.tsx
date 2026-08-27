"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  Building2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  FileText,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getFinanceSummary,
  getCashflowSummary,
  getRevenueChartData,
  getPlanWiseRevenue,
  getSchoolWiseRevenue,
  DateFilterInput,
  generateTransactionsCSV,
} from "@/lib/billing/finance";
import type {
  FinanceSummary,
  CashflowSummary,
  PlanRevenueSummary,
  SchoolRevenueSummary,
} from "@/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";

function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function SuperAdminFinancePage() {
  const { profile } = useAuth();
  const [filterPreset, setFilterPreset] = useState<DateFilterInput["preset"]>("this_month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);
  const [chartData, setChartData] = useState<{ key: string; label: string; amountRupees: number }[]>([]);
  const [planRevenue, setPlanRevenue] = useState<PlanRevenueSummary[]>([]);
  const [schoolRevenue, setSchoolRevenue] = useState<SchoolRevenueSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const dateFilter: DateFilterInput = { preset: filterPreset };

      const [sumRes, cashRes, chartRes, planRes, schoolRes] = await Promise.all([
        getFinanceSummary(dateFilter),
        getCashflowSummary(dateFilter),
        getRevenueChartData("daily", dateFilter),
        getPlanWiseRevenue(dateFilter),
        getSchoolWiseRevenue(dateFilter),
      ]);

      setSummary(sumRes);
      setCashflow(cashRes);
      setChartData(chartRes);
      setPlanRevenue(planRes);
      setSchoolRevenue(schoolRes);
    } catch (err: any) {
      console.error("Failed to load finance data:", err);
      setError("Unable to load financial data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filterPreset]);

  const handleExportCSV = async () => {
    try {
      const db = getFirebaseDb();
      if (!db) return;

      const [paymentsSnap, invSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
        getDocs(collection(db, BILLING_COLLECTIONS.INVOICES || "invoices")),
        getDocs(collection(db, "schools")),
      ]);

      const schoolMap: Record<string, string> = {};
      for (const d of schoolsSnap.docs) schoolMap[d.id] = (d.data() as any).name || d.id;

      const invMap: Record<string, string> = {};
      for (const d of invSnap.docs) {
        const data = d.data() as any;
        invMap[data.paymentId || d.id] = data.invoiceNumber || d.id;
      }

      const txList = paymentsSnap.docs.map((d) => {
        const p = d.data() as any;
        return {
          createdAt: p.capturedAt || p.createdAt,
          schoolName: schoolMap[p.schoolId] || p.schoolId,
          schoolId: p.schoolId,
          planId: p.planId,
          billingCycle: p.billingCycle,
          amountPaise: p.amount,
          discountPaise: p.discountAmount || 0,
          status: p.status,
          paymentId: p.razorpayPaymentId || p.id,
          invoiceNumber: invMap[p.id] || `INV-${p.orderId?.slice(-6) || "000"}`,
        };
      });

      const csvContent = generateTransactionsCSV(txList);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SchoolStudy_Finance_Report_${filterPreset}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export CSV Error:", err);
    }
  };

  const filteredSchools = schoolRevenue.filter(
    (s) =>
      s.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.schoolId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Finance & Revenue Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative revenue calculations, transaction ledger, and cashflow analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Preset */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400 ml-2" />
            <select
              value={filterPreset}
              onChange={(e) => setFilterPreset(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 pr-3 py-1 focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/super-admin/finance/transactions"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            Transactions List
          </Link>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Calculating financial metrics...</span>
        </div>
      ) : (
        <>
          {/* Top Summary Metric Cards (Section 2 & 3) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Sales</span>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatRupees(summary?.grossSales || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Total Billed</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Discounts Given</span>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatRupees(summary?.discountGiven || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Coupons & Special Promos</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Refunded Amount</span>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatRupees(summary?.refundedAmount || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Returned Payments</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 shadow-sm space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Net Collected</span>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatRupees(summary?.netCollected || 0)}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Actual Collected Cash</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Successful Payments</span>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {summary?.successfulPaymentsCount || 0}
              </p>
              <p className="text-[10px] text-slate-400">Captured Orders</p>
            </div>
          </div>

          {/* Cashflow & Chart Row (Section 5 & 10) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real Revenue Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Revenue Timeline</h3>
                  <p className="text-xs text-slate-500">Real transaction volume</p>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>

              {chartData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No verified payment transactions exist for the selected timeframe.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {chartData.map((item) => (
                    <div key={item.key} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{item.amountRupees.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (item.amountRupees / Math.max(...chartData.map((c) => c.amountRupees), 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cashflow Ledger Summary (Section 10) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cashflow Summary</h3>
                <p className="text-xs text-slate-500">Money In vs Money Out</p>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    <span>Money In (Payments)</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatRupees(cashflow?.moneyIn || 0)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <ArrowDownRight className="h-4 w-4 text-rose-600" />
                    <span>Money Out (Refunds)</span>
                  </div>
                  <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    {formatRupees(cashflow?.moneyOut || 0)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Net Cashflow</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatRupees(cashflow?.netCashflow || 0)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Discounts are treated strictly as non-cash price adjustments.
              </p>
            </div>
          </div>

          {/* Plan-Wise Revenue Breakdown (Section 6) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Plan-Wise Revenue</h3>
            {planRevenue.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No plan transaction data found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-3">Plan</th>
                      <th className="p-3">Transactions</th>
                      <th className="p-3">Gross Revenue</th>
                      <th className="p-3">Discounts</th>
                      <th className="p-3">Refunds</th>
                      <th className="p-3">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {planRevenue.map((p) => (
                      <tr key={p.planId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white capitalize">{p.planName}</td>
                        <td className="p-3 font-semibold">{p.transactionsCount}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{formatRupees(p.grossRevenue)}</td>
                        <td className="p-3 text-amber-600">{formatRupees(p.discount)}</td>
                        <td className="p-3 text-rose-600">{formatRupees(p.refund)}</td>
                        <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupees(p.netRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* School-Wise Revenue Breakdown (Section 16) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Revenue by School</h3>
                <p className="text-xs text-slate-500">School accounts and subscription status</p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search school name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            {filteredSchools.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No schools match search criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-3">School Name</th>
                      <th className="p-3">Active Plan</th>
                      <th className="p-3">Payments</th>
                      <th className="p-3">Gross</th>
                      <th className="p-3">Net Revenue</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSchools.map((s) => (
                      <tr key={s.schoolId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{s.schoolName}</span>
                        </td>
                        <td className="p-3 font-semibold uppercase text-blue-600 dark:text-blue-400">{s.currentPlanId}</td>
                        <td className="p-3 font-medium">{s.totalPaymentsCount}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{formatRupees(s.grossRevenue)}</td>
                        <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupees(s.netRevenue)}</td>
                        <td className="p-3">
                          <Link
                            href={`/super-admin/finance/schools/${s.schoolId}`}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
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
