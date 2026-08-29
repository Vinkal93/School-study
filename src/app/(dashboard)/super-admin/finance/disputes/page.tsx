"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Receipt,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DisputeRecord, getDisputesList } from "@/lib/payments/disputes";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminDisputesPage() {
  const { profile } = useAuth();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getDisputesList();
      setDisputes(list);
    } catch (err) {
      console.error("Failed to load disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/super-admin/finance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Finance Center</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-purple-600" />
            Disputed Payments & Chargebacks Foundation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dedicated accounting boundary for bank chargebacks and gateway disputes (Section 27).
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0" />
        <div>
          <p className="font-bold">Authoritative Gateway Dispute Isolation</p>
          <p className="mt-0.5 text-purple-800 dark:text-purple-400">
            Disputed payments are isolated from voluntary refunds to ensure clean, audit-compliant financial ledgers.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading dispute ledger...</span>
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zero active payment disputes or chargebacks
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any dispute webhook reported by Razorpay will be recorded here for review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3">Date</th>
                  <th className="p-3">Dispute ID</th>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 font-mono font-bold text-purple-600">{d.id}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{d.paymentId}</td>
                    <td className="p-3 font-mono font-bold text-red-600">{formatRupees(d.amount)}</td>
                    <td className="p-3 text-slate-600">{d.reason}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        {d.status}
                      </span>
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
