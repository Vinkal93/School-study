"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Search,
  Filter,
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
import { getSchoolWiseRevenue, DateFilterInput } from "@/lib/billing/finance";
import type { SchoolRevenueSummary } from "@/types";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminFinanceSchoolsPage() {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<SchoolRevenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSchoolWiseRevenue();
      setSchools(data);
    } catch (err) {
      console.error("Failed to load school revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSchools = schools.filter((s) => {
    const matchesPlan =
      planFilter === "all" || s.currentPlanId.toLowerCase().includes(planFilter.toLowerCase());
    const matchesSearch =
      searchQuery === "" ||
      s.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.schoolId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlan && matchesSearch;
  });

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <Building2 className="h-6 w-6 text-blue-600" />
            School-Wise Revenue Breakdown
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gross sales, coupon subsidies, and net collected revenue per institution.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by school name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Aggregating school accounts...</span>
          </div>
        ) : paginatedSchools.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No school financial records found.
            </p>
            <p className="text-xs text-slate-400">
              Transactions will appear as schools subscribe and recharge.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                    <th className="p-3">School Name</th>
                    <th className="p-3">Current Plan</th>
                    <th className="p-3">Payments Count</th>
                    <th className="p-3">Gross Sales</th>
                    <th className="p-3">Discounts</th>
                    <th className="p-3">Net Collected</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Drilldown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedSchools.map((s) => (
                    <tr key={s.schoolId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        <div>
                          <span>{s.schoolName}</span>
                          <span className="block text-[10px] font-mono text-slate-400">{s.schoolId}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold capitalize text-blue-600 dark:text-blue-400">
                        {s.currentPlanId.replace("plan_", "")}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {s.totalPaymentsCount} orders
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {formatRupees(s.grossRevenue)}
                      </td>
                      <td className="p-3 font-mono text-purple-600">
                        {s.discount > 0 ? `-${formatRupees(s.discount)}` : "₹0"}
                      </td>
                      <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatRupees(s.netRevenue)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.subscriptionStatus === "ACTIVE"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {s.subscriptionStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/super-admin/finance/schools/${s.schoolId}`}
                          className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
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
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
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
