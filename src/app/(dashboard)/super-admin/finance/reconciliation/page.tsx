"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { detectFinancialAnomalies, FinancialAnomaly } from "@/lib/billing/finance";

export default function SuperAdminReconciliationPage() {
  const { profile } = useAuth();
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const runReconciliationScan = async () => {
    setLoading(true);
    try {
      const results = await detectFinancialAnomalies();
      setAnomalies(results);
    } catch (err) {
      console.error("Failed to run reconciliation scan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReconciliationScan();
  }, []);

  const filteredAnomalies = anomalies.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || a.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

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
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            Financial Reconciliation Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated integrity scanner detecting orphan orders, uncaptured payments, and missing invoices.
          </p>
        </div>

        <button
          onClick={runReconciliationScan}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Run Live Scan</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Auditing financial records across collections...</span>
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No reconciliation anomalies detected
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All payment records, internal orders, invoices, and ledger entries are 100% synchronized.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredAnomalies.map((anom) => (
              <div key={anom.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        anom.severity === "CRITICAL"
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {anom.severity}
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {anom.type}
                    </span>
                  </div>
                  <p className="text-slate-900 dark:text-white font-medium">{anom.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Entity: {anom.entityType.toUpperCase()} ({anom.entityId})
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/super-admin/finance/transactions/${anom.entityId}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all"
                  >
                    Inspect Trace →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
