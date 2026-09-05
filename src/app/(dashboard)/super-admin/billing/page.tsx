"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Building2,
  Receipt,
  Shield,
  TrendingUp,
  Settings,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { Spinner } from "@/components/common/Spinner";
import { toast } from "sonner";

export default function SuperAdminBillingHubPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenuePaise: 0,
    activeSubscriptionsCount: 0,
    transactionsCount: 0,
    activeOffersCount: 0,
  });

  const loadBillingHubData = async () => {
    setLoading(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;

      const [paymentsSnap, subscriptionsSnap, offersSnap] = await Promise.all([
        getDocs(query(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"), orderBy("createdAt", "desc"), limit(25))).catch(() => ({ docs: [] })),
        getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS || "schoolSubscriptions")).catch(() => ({ docs: [] })),
        getDocs(collection(db, BILLING_COLLECTIONS.CUSTOM_OFFERS || "customOffers")).catch(() => ({ docs: [] })),
      ]);

      const loadedPayments = (paymentsSnap as any).docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      }));

      let totalPaise = 0;
      loadedPayments.forEach((p: any) => {
        if (p.status === "PAID" || p.status === "captured" || !p.status) {
          totalPaise += Number(p.amountPaise || (p.amount ? p.amount * 100 : 0));
        }
      });

      const activeSubs = (subscriptionsSnap as any).docs.filter((d: any) => {
        const s = d.data();
        return s.status === "ACTIVE" || !s.status;
      }).length;

      const activeOffers = (offersSnap as any).docs.filter((d: any) => {
        const o = d.data();
        return o.status === "ACTIVE";
      }).length;

      setPayments(loadedPayments);
      setStats({
        totalRevenuePaise: totalPaise,
        activeSubscriptionsCount: activeSubs || subscriptionsSnap.docs.length,
        transactionsCount: paymentsSnap.docs.length,
        activeOffersCount: activeOffers,
      });
    } catch (err: any) {
      console.error("Billing hub load error:", err);
      toast.error("Failed to load billing metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingHubData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-blue-600" />
            Platform Billing & Revenue Hub
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Centralized governance for school subscriptions, invoices, payment gateways, and access policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBillingHubData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/finance"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Finance Analytics
          </Link>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Collected Revenue</span>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            ₹{(Math.round(stats.totalRevenuePaise / 100)).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-gray-400">Recent completed transactions</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Active Subscriptions</span>
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.activeSubscriptionsCount}
          </p>
          <p className="mt-1 text-xs text-blue-600 font-medium">Platform school tenants</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Recorded Invoices</span>
            <Receipt className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.transactionsCount}
          </p>
          <p className="mt-1 text-xs text-purple-600 font-medium">Billed payments & receipts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Custom Offers</span>
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.activeOffersCount}
          </p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Active promotional discounts</p>
        </div>
      </div>

      {/* 6 Quick Governance Portals */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
          Billing & Subscription Management Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/super-admin/finance"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
                <TrendingUp className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              Financial Overview & Analytics
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Platform GMV, MRR, daily cashflows, plan-wise revenue, and automated reconciliation.
            </p>
          </Link>

          <Link
            href="/super-admin/finance/schools"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
                <Building2 className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              School Subscriptions
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Manage school subscriptions, extend grace periods, and audit tenant billing status.
            </p>
          </Link>

          <Link
            href="/super-admin/finance/transactions"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40">
                <Receipt className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              Transactions & Invoices
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Detailed ledger of online payments, UPI receipts, failed attempts, and PDF export.
            </p>
          </Link>

          <Link
            href="/super-admin/offers"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40">
                <Sparkles className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              Custom Pricing Offers
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Create school-specific promotional coupons, ₹1 onboarding promos, and discounted contracts.
            </p>
          </Link>

          <Link
            href="/super-admin/billing/access-policy"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40">
                <Shield className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              Access Policy & Grace Days
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Configure grace periods, hard cut-off rules, read-only downgrade grace, and auto-suspension.
            </p>
          </Link>

          <Link
            href="/super-admin/settings"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/40">
                <Settings className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
              Payment Gateway Settings
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Razorpay API keys, Live/Test mode toggle, webhook signature validation, and payout credentials.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            Recent Platform Transactions & Invoices
          </h3>
          <Link
            href="/super-admin/finance/transactions"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            View Full Ledger <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm">No recent transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Transaction / Order ID</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Plan / Purpose</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {payments.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                      {p.schoolName || p.schoolId || "School Tenant"}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {p.planName || p.purpose || "Subscription Tier"}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      ₹{Math.round((p.amountPaise || (p.amount ? p.amount * 100 : 0)) / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-xs capitalize">
                      {p.gateway || p.method || "Razorpay"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          p.status === "PAID" || p.status === "captured" || !p.status
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : p.status === "FAILED"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}
                      >
                        {p.status || "PAID"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                      {p.createdAt?.toDate
                        ? p.createdAt.toDate().toLocaleDateString()
                        : p.createdAt?.seconds
                        ? new Date(p.createdAt.seconds * 1000).toLocaleDateString()
                        : "Recently"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
