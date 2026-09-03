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
  Filter,
} from "lucide-react";
import { getFeeDashboardMetrics } from "@/lib/services/fee.service";

export default function AdminFeeDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    async function loadMetrics() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const data = await getFeeDashboardMetrics(schoolId);
        setMetrics(data);
      } catch (err) {
        console.error("Failed to load fee dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Management Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time overview of fee collections, outstanding dues, and defaulters.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Collect Fee</span>
            </Link>
            <Link
              href="/admin/fees/structures"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <span>Fee Structures</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Expected Fee</span>
              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalExpectedPaise)}</p>
            <p className="text-[11px] text-slate-400">Total assigned fee budget</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">Total Fee Collected</span>
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalCollectedPaise)}</p>
            <p className="text-[11px] text-emerald-600 font-medium">This Month: {fmtRupees(metrics.thisMonthCollectionPaise)}</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600">Total Pending Dues</span>
              <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.totalPendingPaise)}</p>
            <p className="text-[11px] text-amber-600 font-medium">Defaulters: {metrics.defaultersCount} students</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600">Today's Collection</span>
              <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtRupees(metrics.todayCollectionPaise)}</p>
            <p className="text-[11px] text-purple-600 font-medium">Paid Students: {metrics.paidStudentsCount}</p>
          </div>
        </div>

        {/* Collection & Defaulter Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Collection Progress</h3>
              <Link href="/admin/fees/reports" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                <span>View Reports</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Collected vs Pending</span>
                <span className="text-blue-600">
                  {metrics.totalExpectedPaise > 0
                    ? Math.round((metrics.totalCollectedPaise / metrics.totalExpectedPaise) * 100)
                    : 0}% Collected
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
              <div>
                <p className="text-xs text-slate-500">Fully Paid</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">{metrics.paidStudentsCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Partial Payments</p>
                <p className="text-lg font-bold text-amber-600 mt-1">{metrics.partialPaymentsCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Overdue / Defaulters</p>
                <p className="text-lg font-bold text-red-600 mt-1">{metrics.defaultersCount}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
            <h3 className="text-lg font-extrabold">Fee Management Actions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record fee payments, create class fee structures, configure late fee rules, and print student receipts.
            </p>
            <div className="space-y-2.5 pt-2">
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
                  View Defaulters List
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/admin/fees/transactions"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold text-white"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Transaction Ledger & Receipts
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </EntitlementGate>
  );
}
