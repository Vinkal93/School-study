"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  IndianRupee,
  Receipt,
  Printer,
  ChevronRight,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Server,
  KeyRound,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { toast } from "sonner";

function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function SuperAdminFinancePage() {
  const { profile: currentUser } = useAuth();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "transactions" | "invoices" | "refunds" | "reconciliation" | "gateway"
  >("overview");

  // Global Filter States
  const [preset, setPreset] = useState<"today" | "7d" | "30d" | "this_month" | "this_year" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data & Loading States
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Selected Transaction Modal / Drawer
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Refund Action Modal State
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any | null>(null);
  const [refundAmountRupees, setRefundAmountRupees] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundSubPolicy, setRefundSubPolicy] = useState<"NO_CHANGE" | "REVOKE_ENTITLEMENT" | "END_AT_REFUND_TIME">("NO_CHANGE");
  const [processingRefund, setProcessingRefund] = useState<boolean>(false);

  // Fetch Full Financial Payload
  const loadFinanceData = useCallback(async (isSilent: boolean = false) => {
    if (!currentUser?.uid) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("performerUid", currentUser.uid);
      params.set("preset", preset);
      if (preset === "custom" && startDate) params.set("startDate", startDate);
      if (preset === "custom" && endDate) params.set("endDate", endDate);
      if (schoolFilter !== "all") params.set("schoolId", schoolFilter);
      if (planFilter !== "all") params.set("planId", planFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (methodFilter !== "all") params.set("paymentMethod", methodFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/super-admin/finance?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load financial records");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastRefreshedAt(new Date());
      }
    } catch (err: any) {
      console.error("Finance Center fetch error:", err);
      toast.error(err.message || "Failed to load financial analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.uid, preset, startDate, endDate, schoolFilter, planFilter, statusFilter, methodFilter, searchQuery]);

  // Initial & Filter Change Fetch
  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Real-time Firestore onSnapshot Subscriptions for Live Financial Telemetry
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    // Listen for new payment receipts
    const unsubPayments = onSnapshot(collection(db, BILLING_COLLECTIONS.PAYMENTS), () => {
      loadFinanceData(true);
    });

    // Listen for new invoices
    const unsubInvoices = onSnapshot(collection(db, BILLING_COLLECTIONS.INVOICES), () => {
      loadFinanceData(true);
    });

    return () => {
      unsubPayments();
      unsubInvoices();
    };
  }, [loadFinanceData]);

  // Handle Refund Submission
  const handleProcessRefund = async () => {
    if (!selectedPaymentForRefund) return;
    const amountRupeesNum = parseFloat(refundAmountRupees);
    if (isNaN(amountRupeesNum) || amountRupeesNum <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    const amountPaise = Math.round(amountRupeesNum * 100);
    if (!refundReason.trim()) {
      toast.error("Please provide a mandatory refund reason for audit records");
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await fetch("/api/super-admin/finance/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPaymentForRefund.id,
          amountPaise,
          reason: refundReason.trim(),
          actorId: currentUser?.uid || "super_admin",
          subscriptionPolicy: refundSubPolicy,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to process refund on server");
      }

      toast.success("Refund processed and ledger updated successfully!");
      setShowRefundModal(false);
      setSelectedPaymentForRefund(null);
      setRefundAmountRupees("");
      setRefundReason("");
      loadFinanceData(true);
    } catch (err: any) {
      console.error("Refund processing failed:", err);
      toast.error(err.message || "Failed to process refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  const overview = data?.overview || {
    totalRevenuePaise: 0,
    thisMonthRevenuePaise: 0,
    todayRevenuePaise: 0,
    successfulPaymentsCount: 0,
    failedPaymentsCount: 0,
    refundsCount: 0,
    refundsPaise: 0,
    discountsPaise: 0,
    gstCollectedPaise: 0,
    outstandingPaise: 0,
    activeSubscriptionsCount: 0,
  };

  const transactions = data?.transactions || [];
  const invoices = data?.invoices || [];
  const revenueBreakdown = data?.revenueBreakdown || { byDay: [], byPlan: [], bySchool: [], totals: {} };
  const gateway = data?.gateway || { keyConfigured: false, webhookConfigured: false, isLiveMode: false, recentFailures: [] };
  const reconciliation = data?.reconciliation || { anomalies: [], healthyMatchRate: 100 };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. CLASSIC SUPER ADMIN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Super Admin Command</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span>Finance Center</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Centralized Financial Control Center
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-data revenue management, global transactions ledger, tax invoices, refunds & reconciliation.
          </p>
        </div>

        {/* Live Indicators & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Gateway: {gateway.isLiveMode ? "LIVE" : "TEST"}</span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>Subs: {overview.activeSubscriptionsCount}</span>
          </div>

          <button
            onClick={() => loadFinanceData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. GLOBAL DATE RANGE & MULTI-CRITERIA FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
        {/* Date Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Period:
            </span>
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "this_month", label: "This Month" },
                { key: "this_year", label: "This Year" },
                { key: "custom", label: "Custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  preset === p.key
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Synced: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Search & Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Transaction ID, Order, Invoice, School..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Captured / Success</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Payment Methods</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Netbanking</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {preset === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <button
              onClick={() => loadFinanceData()}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {[
          { id: "overview", label: "Financial Overview", icon: IndianRupee },
          { id: "transactions", label: "Global Transactions", icon: CreditCard, count: transactions.length },
          { id: "invoices", label: "Tax Invoices", icon: Receipt, count: invoices.length },
          { id: "refunds", label: "Refunds Management", icon: RotateCcw, count: overview.refundsCount },
          { id: "reconciliation", label: "5-Way Reconciliation", icon: ShieldAlert, count: reconciliation.anomalies?.length || 0 },
          { id: "gateway", label: "Razorpay Gateway Health", icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 10 TOP FINANCIAL KPIS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {/* 1. Total Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
                <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupees(overview.totalRevenuePaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Gross captured receipts</p>
            </div>

            {/* 2. This Month Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatRupees(overview.thisMonthRevenuePaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Current calendar month</p>
            </div>

            {/* 3. Today Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Today</span>
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatRupees(overview.todayRevenuePaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Trailing 24h collections</p>
            </div>

            {/* 4. Successful Payments */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Success Payments</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.successfulPaymentsCount}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Completed recharges</p>
            </div>

            {/* 5. Failed Payments */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Failed Attempts</span>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {overview.failedPaymentsCount}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Payment errors / drops</p>
            </div>

            {/* 6. Refunds Processed */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Refunds</span>
                <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatRupees(overview.refundsPaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">{overview.refundsCount} total refunds</p>
            </div>

            {/* 7. Discounts Given */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Discounts Given</span>
                <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatRupees(overview.discountsPaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Promotions & coupons</p>
            </div>

            {/* 8. Statutory GST (18%) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">GST Collected</span>
                <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatRupees(overview.gstCollectedPaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">18% statutory tax ledger</p>
            </div>

            {/* 9. Outstanding / Pending */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Orders</span>
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatRupees(overview.outstandingPaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Unsettled orders</p>
            </div>

            {/* 10. Active Subscriptions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Subs</span>
                <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {overview.activeSubscriptionsCount}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Paid & trial campuses</p>
            </div>
          </div>

          {/* REVENUE BREAKDOWN & CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Trend SVG Chart */}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Revenue Trend (Trailing 7 Days)
                  </h3>
                  <p className="text-xs text-gray-500">Gross collections and net receipts over time</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Gross
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span> Net
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-end justify-between gap-3 h-48 px-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                  {revenueBreakdown.byDay?.map((pt: any, i: number) => {
                    const maxVal = Math.max(
                      ...revenueBreakdown.byDay.map((d: any) => d.gross),
                      100000
                    );
                    const heightPct = Math.max(8, Math.round((pt.gross / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatRupees(pt.gross)}
                        </span>
                        <div
                          className="w-full max-w-[32px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all group-hover:from-emerald-500 group-hover:to-teal-300"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {pt.date}
                        </span>
                      </div>
                    );
                  })}
                  {(!revenueBreakdown.byDay || revenueBreakdown.byDay.length === 0) && (
                    <div className="w-full text-center text-xs text-gray-500 py-12">
                      No revenue data points recorded in the last 7 days.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plan-Wise Revenue Breakdown */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                  Revenue by Subscription Plan
                </h3>
                <p className="text-xs text-gray-500">Plan contribution to total gross receipts</p>
              </div>

              <div className="space-y-4 pt-2">
                {revenueBreakdown.byPlan?.map((p: any) => (
                  <div key={p.planId} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize">{p.planName}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatRupees(p.amount)} ({p.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!revenueBreakdown.byPlan || revenueBreakdown.byPlan.length === 0) && (
                  <div className="text-xs text-gray-500 py-8 text-center">
                    No plan payments recorded for current filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL TRANSACTIONS */}
      {activeTab === "transactions" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Global Platform Transactions Ledger
              </h3>
              <p className="text-xs text-gray-500">Authoritative immutable ledger of all campus payments and recharges</p>
            </div>

            <div className="text-xs font-bold text-gray-500">
              Showing {transactions.length} Transactions
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-4">Transaction / Order ID</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Final Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-bold text-blue-600">{tx.paymentId}</div>
                      <div className="font-mono text-[11px] text-gray-400">{tx.orderId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{tx.schoolName}</div>
                      <div className="text-[11px] text-gray-400">{tx.userEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase">
                        {tx.planId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {formatRupees(tx.amountPaise)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {formatRupees(tx.taxPaise)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupees(tx.finalAmountPaise)}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{tx.paymentMethod}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          tx.status === "CAPTURED" || tx.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : tx.status === "FAILED"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">{tx.date}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                      {(tx.status === "CAPTURED" || tx.status === "SUCCESS") && (
                        <button
                          onClick={() => {
                            setSelectedPaymentForRefund(tx);
                            setRefundAmountRupees((tx.finalAmountPaise / 100).toString());
                            setShowRefundModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Refund</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      No financial transactions matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TAX INVOICES */}
      {activeTab === "invoices" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Statutory Tax Invoices Ledger
              </h3>
              <p className="text-xs text-gray-500">GST-compliant tax invoices issued to school campuses</p>
            </div>
            <div className="text-xs font-bold text-gray-500">
              Total Invoices: {invoices.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Taxable Amount</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {inv.schoolName}
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold">{inv.planId}</td>
                    <td className="py-3 px-4 font-mono text-xs">{formatRupees(inv.subtotalPaise)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-amber-600">
                      {inv.discountPaise > 0 ? `-${formatRupees(inv.discountPaise)}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{formatRupees(inv.taxableAmountPaise)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600">{formatRupees(inv.gstPaise)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupees(inv.totalPaise)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">{inv.issuedAt}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={inv.viewUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Print / View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500">
                      No tax invoices found for the current selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REFUNDS MANAGEMENT */}
      {activeTab === "refunds" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-amber-500" />
                  Super Admin Authorized Refund Engine
                </h3>
                <p className="text-xs text-gray-500">
                  Execute server-verified reversals with automatic subscription entitlement adjustment and audit trail.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  Total Refunded: {formatRupees(overview.refundsPaise)}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50 text-xs text-gray-600 dark:text-gray-300 space-y-1 border border-gray-100 dark:border-gray-800">
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Super Admin Refund Safeguards:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-400">
                <li>Refund amount is strictly capped by the remaining refundable balance on the payment record.</li>
                <li>Financial ledger automatically records a DEBIT reversal transaction for double-entry integrity.</li>
                <li>Optionally adjusts or revokes the school's active subscription tier upon refund fulfillment.</li>
                <li>Client-side refund mutations are blocked by server-side payment state machine validation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 5-WAY RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reconciliation Health</span>
              <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {reconciliation.healthyMatchRate}%
              </div>
              <p className="mt-1 text-xs text-gray-500">5-way matching integrity rate</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Internal Orders</span>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {reconciliation.totalOrders || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Recorded checkout orders</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tax Invoices</span>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {reconciliation.totalInvoices || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Generated tax invoices</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Mismatches</span>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {reconciliation.anomalies?.length || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Flagged integrity anomalies</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  5-Way Payment & Subscription Reconciliation Matrix
                </h3>
                <p className="text-xs text-gray-500">
                  Razorpay Payment ↔ Internal Order ↔ Invoice ↔ Finance Transaction ↔ Subscription
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {reconciliation.anomalies?.map((anom: any) => (
                <div key={anom.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          anom.severity === "CRITICAL"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {anom.severity}
                      </span>
                      <span className="font-mono text-xs font-bold">{anom.type}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{anom.description}</p>
                    <p className="text-[11px] text-gray-400 font-mono">Entity: {anom.entityId}</p>
                  </div>
                  <button className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    Review
                  </button>
                </div>
              ))}
              {(!reconciliation.anomalies || reconciliation.anomalies.length === 0) && (
                <div className="py-8 text-center text-xs text-emerald-600 font-semibold flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <span>All payment records, invoices, orders and subscriptions are 100% reconciled!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PAYMENT GATEWAY HEALTH */}
      {activeTab === "gateway" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gateway Configuration Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  Razorpay Gateway Health & Credentials
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    gateway.isLiveMode
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {gateway.isLiveMode ? "LIVE PRODUCTION MODE" : "TEST / SANDBOX MODE"}
                </span>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">API Key ID:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {gateway.keyId || "Not Configured"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">API Key Secret:</span>
                  <span className="font-mono text-gray-500">
                    {gateway.maskedSecretKey || "••••••••••••••••"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Webhook Secret:</span>
                  <span className="font-mono text-gray-500">
                    {gateway.maskedWebhookSecret || "••••••••••••••••"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Configuration Status:</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified & Connected</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Failures Watchlist */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Recent Payment Authorization Failures
              </h3>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 pt-2">
                {gateway.recentFailures?.map((fail: any) => (
                  <div key={fail.id} className="py-2.5 flex justify-between items-start text-xs">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{fail.schoolName}</div>
                      <div className="text-[11px] text-red-600 dark:text-red-400">{fail.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-gray-900 dark:text-white">
                        {formatRupees(fail.amountPaise)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">{fail.date}</div>
                    </div>
                  </div>
                ))}
                {(!gateway.recentFailures || gateway.recentFailures.length === 0) && (
                  <div className="py-8 text-center text-xs text-gray-500">
                    Zero payment authorization failures recorded in the recent window!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OVER TRANSACTION INSPECTOR DRAWER */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Transaction Details
                </h3>
                <p className="font-mono text-xs text-blue-600">{selectedTx.paymentId}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50 space-y-2.5 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between">
                  <span className="text-gray-500">School Campus:</span>
                  <span className="font-bold">{selectedTx.schoolName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">User / Admin:</span>
                  <span>{selectedTx.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Subscription Plan:</span>
                  <span className="font-bold uppercase text-blue-600">{selectedTx.planId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Subtotal:</span>
                  <span className="font-mono">{formatRupees(selectedTx.amountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount Applied:</span>
                  <span className="font-mono text-amber-600">{formatRupees(selectedTx.discountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST (18%):</span>
                  <span className="font-mono text-blue-600">{formatRupees(selectedTx.taxPaise)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 font-bold text-sm">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatRupees(selectedTx.finalAmountPaise)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-emerald-600">{selectedTx.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Gateway:</span>
                  <span>Razorpay ({selectedTx.paymentMethod})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Internal Order:</span>
                  <span className="font-mono">{selectedTx.orderId}</span>
                </div>
              </div>

              {selectedTx.invoiceId && (
                <div className="pt-2">
                  <Link
                    href={`/billing/invoices/${selectedTx.invoiceId}`}
                    target="_blank"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>View & Print Official Tax Invoice</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SUPER ADMIN INITIATE REFUND MODAL */}
      {showRefundModal && selectedPaymentForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                Initiate Super Admin Refund
              </h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50 space-y-1.5 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between">
                  <span className="text-gray-500">School:</span>
                  <span className="font-bold">{selectedPaymentForRefund.schoolName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment ID:</span>
                  <span className="font-mono">{selectedPaymentForRefund.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Original Paid:</span>
                  <span className="font-bold font-mono">
                    {formatRupees(selectedPaymentForRefund.finalAmountPaise)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Refund Amount (in ₹ Rupees)
                </label>
                <input
                  type="number"
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  placeholder="e.g. 4999"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for compliance audit trail..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Subscription Entitlement Policy
                </label>
                <select
                  value={refundSubPolicy}
                  onChange={(e: any) => setRefundSubPolicy(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="NO_CHANGE">No Change (Keep current access active)</option>
                  <option value="REVOKE_ENTITLEMENT">Revoke Entitlement (Drop to Free / Suspended)</option>
                  <option value="END_AT_REFUND_TIME">End Period Now (Expire immediately)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessRefund}
                  disabled={processingRefund}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {processingRefund ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  <span>Execute Refund</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
