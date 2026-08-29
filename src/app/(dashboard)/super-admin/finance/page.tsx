"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
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
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  ShieldAlert,
  ArrowRight,
  Activity,
  Layers,
  Percent,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getFinanceSummary,
  getCashflowSummary,
  getRevenueChartData,
  getPlanWiseRevenue,
  getSchoolWiseRevenue,
  getBillingCycleAnalytics,
  getCouponImpactAnalytics,
  getPaymentHealthStats,
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
  const [billingCycleStats, setBillingCycleStats] = useState<any>(null);
  const [couponStats, setCouponStats] = useState<any>(null);
  const [paymentHealth, setPaymentHealth] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const dateFilter: DateFilterInput = { preset: filterPreset };

      const [sumRes, cashRes, chartRes, planRes, schoolRes, cycleRes, couponRes, healthRes] =
        await Promise.all([
          getFinanceSummary(dateFilter),
          getCashflowSummary(dateFilter),
          getRevenueChartData("daily", dateFilter),
          getPlanWiseRevenue(dateFilter),
          getSchoolWiseRevenue(dateFilter),
          getBillingCycleAnalytics(dateFilter),
          getCouponImpactAnalytics(dateFilter),
          getPaymentHealthStats(dateFilter),
        ]);

      setSummary(sumRes);
      setCashflow(cashRes);
      setChartData(chartRes);
      setPlanRevenue(planRes);
      setSchoolRevenue(schoolRes);
      setBillingCycleStats(cycleRes);
      setCouponStats(couponRes);
      setPaymentHealth(healthRes);
    } catch (err: any) {
      console.error("Failed to load finance data:", err);
      setError("Unable to load financial data. Please check backend services.");
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
          invoiceNumber: invMap[p.id] || invMap[p.orderId] || "N/A",
        };
      });

      const csvContent = generateTransactionsCSV(txList);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SchoolStudy_Finance_${filterPreset}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export finance CSV:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Super Admin Finance Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Authoritative platform revenue, cashflow ledgers, reconciliation, and payment health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Presets */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-2xs">
            {(["today", "this_week", "this_month", "this_year"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setFilterPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterPreset === preset
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {preset.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-bold overflow-x-auto">
        <Link
          href="/super-admin/finance"
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0"
        >
          Overview & Cashflow
        </Link>
        <Link
          href="/super-admin/finance/schools"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all shrink-0"
        >
          School Revenue Breakdown
        </Link>
        <Link
          href="/super-admin/finance/transactions"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all shrink-0"
        >
          Transaction Ledger
        </Link>
        <Link
          href="/super-admin/finance/refunds"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all shrink-0 flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5 text-red-500" />
          <span>Refunds Ledger</span>
        </Link>
        <Link
          href="/super-admin/finance/disputes"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all shrink-0"
        >
          Disputes
        </Link>
        <Link
          href="/super-admin/finance/reconciliation"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all shrink-0 flex items-center gap-1.5"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          <span>Reconciliation Center</span>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-4 flex items-center gap-3 text-red-800 dark:text-red-300 text-xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Financial Definitions Bar (Section 2) */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="font-bold uppercase tracking-wider">Accounting Standard:</span>
          <span>Gross Sales = Payment Gross</span>
          <span>•</span>
          <span>Net Collected = Gross - Discounts - Refunds</span>
          <span>•</span>
          <span>Money In = Verified Payments</span>
        </div>
        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
          Source: Razorpay Captured Ledger
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Aggregating platform finance records...</span>
        </div>
      ) : (
        <>
          {/* Top-Level KPI Summary Cards (Section 1) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gross Platform Sales
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary ? formatRupees(summary.grossSales) : "₹0"}
              </p>
              <p className="text-[11px] text-slate-500">Before coupon discounts</p>
            </div>

            {/* Net Collected Revenue */}
            <div className="p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Net Collected Revenue
              </span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {summary ? formatRupees(summary.netCollected) : "₹0"}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                Actual cash realized in gateway
              </p>
            </div>

            {/* Discounts Given */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Discounts & Coupons
              </span>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {summary ? formatRupees(summary.discountGiven) : "₹0"}
              </p>
              <p className="text-[11px] text-slate-500">
                {couponStats?.totalCouponsUsed || 0} coupons redeemed
              </p>
            </div>

            {/* Refunds */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Refunds Processed
              </span>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
                {summary ? formatRupees(summary.refundedAmount) : "₹0"}
              </p>
              <p className="text-[11px] text-slate-500">
                {summary?.refundedPaymentsCount || 0} refund transactions
              </p>
            </div>
          </div>

          {/* Cashflow & Payment Health Section (Section 4 & 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cashflow Summary Card */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span>Real Cashflow Ledger</span>
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {(filterPreset || "this_month").replace("_", " ")}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Money In (Payments)</span>
                  </div>
                  <span className="font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                    +{cashflow ? formatRupees(cashflow.moneyIn) : "₹0"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-semibold">
                    <ArrowDownRight className="h-4 w-4" />
                    <span>Money Out (Refunds)</span>
                  </div>
                  <span className="font-extrabold font-mono text-red-700 dark:text-red-300">
                    -{cashflow ? formatRupees(cashflow.moneyOut) : "₹0"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Net Cashflow</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {cashflow ? formatRupees(cashflow.netCashflow) : "₹0"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Health Card */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span>Payment Health & Success Rate</span>
                </h3>
                <span className="text-xs font-black font-mono text-emerald-600">
                  {paymentHealth?.successRatePct ?? 100}% Success
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Captured Payments</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {paymentHealth?.successful.count || 0} ({formatRupees(paymentHealth?.successful.amount || 0)})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending / In-flight</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {paymentHealth?.pending.count || 0} ({formatRupees(paymentHealth?.pending.amount || 0)})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    <span>Failed Attempts</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {paymentHealth?.failed.count || 0}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  Total Checkout Attempts: <strong>{paymentHealth?.totalAttempts || 0}</strong>
                </div>
              </div>
            </div>

            {/* Billing Cycle Analytics (Section 9) */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  <span>Billing Cycle Distribution</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Monthly</span>
                  <p className="font-mono font-extrabold text-slate-900 dark:text-white">
                    {formatRupees(billingCycleStats?.monthly.revenuePaise || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400">{billingCycleStats?.monthly.count || 0} orders</p>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-1">
                  <span className="font-bold text-purple-900 dark:text-purple-300">Annual</span>
                  <p className="font-mono font-extrabold text-purple-700 dark:text-purple-300">
                    {formatRupees(billingCycleStats?.annual.revenuePaise || 0)}
                  </p>
                  <p className="text-[10px] text-purple-500">{billingCycleStats?.annual.count || 0} orders</p>
                </div>
              </div>

              {/* Settlement Foundation Note (Section 16) */}
              <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                ℹ️ <em>Settlement reconciliation not configured. Bank payouts subject to Razorpay T+2 settlement schedule.</em>
              </div>
            </div>
          </div>

          {/* Revenue Chart Visualizer (Section 3) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Real Verified Revenue Timeline
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregated strictly from captured payment records in the selected period.
                </p>
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                No revenue records captured for this period.
              </p>
            ) : (
              <div className="h-48 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 overflow-x-auto">
                {chartData.map((d) => {
                  const maxVal = Math.max(...chartData.map((c) => c.amountRupees), 1);
                  const hPct = Math.max(8, Math.round((d.amountRupees / maxVal) * 100));
                  return (
                    <div
                      key={d.key}
                      className="flex-1 min-w-[32px] flex flex-col items-center gap-1.5 h-full justify-end group"
                    >
                      <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{d.amountRupees.toLocaleString("en-IN")}
                      </span>
                      <div
                        className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-lg group-hover:bg-blue-700 transition-all"
                        style={{ height: `${hPct}%` }}
                      />
                      <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Plan Breakdown & Coupon Impact Section (Section 8 & 10) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan-Wise Revenue Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Revenue by Plan Version
              </h3>

              {planRevenue.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No plan sales recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {planRevenue.map((p) => (
                    <div key={p.planId} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">{p.planName}</p>
                        <p className="text-slate-400 text-[11px]">{p.transactionsCount} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-900 dark:text-white">
                          {formatRupees(p.netRevenue)}
                        </p>
                        {p.discount > 0 && (
                          <p className="text-[10px] text-purple-600">-{formatRupees(p.discount)} discount</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coupon Performance Ledger */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-600" />
                  <span>Coupon Impact Analysis</span>
                </h3>
              </div>

              {!couponStats || couponStats.topCoupons.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No discount coupons used in this period.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {couponStats.topCoupons.map((c: any) => (
                    <div key={c.code} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold uppercase text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                        <p className="text-slate-400 text-[11px] mt-1">{c.count} redemptions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-purple-600 dark:text-purple-400">
                          -{formatRupees(c.totalDiscount)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Yield: {formatRupees(c.totalRevenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
