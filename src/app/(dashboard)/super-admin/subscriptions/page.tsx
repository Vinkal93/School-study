"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useAppQuery, appQueryClient } from "@/lib/cache";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeleton } from "@/components/common/skeletons";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  SlidersHorizontal,
  Zap,
  DollarSign,
  Ban,
  RotateCcw,
  Sparkles,
  Sliders,
} from "lucide-react";
import { SubscriptionControlDrawer } from "@/components/super-admin/SubscriptionControlDrawer";
import type { SubscriptionStatus } from "@/types";

export default function SuperAdminSubscriptionsPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [cycleFilter, setCycleFilter] = useState("ALL");
  const [overrideFilter, setOverrideFilter] = useState("ALL");
  const [penaltyFilter, setPenaltyFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected subscription for control drawer
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!firebaseUser || profile?.role !== "super_admin")) {
      router.push("/dashboard");
    }
  }, [firebaseUser, profile, authLoading, router]);

  const queryKey = profile?.role === "super_admin"
    ? `superAdminSubs:${debouncedSearch}:${statusFilter}:${planFilter}:${cycleFilter}:${overrideFilter}:${penaltyFilter}:${sortBy}:${page}:${pageSize}`
    : null;

  const {
    data: subsBundle,
    isLoading: isSubsLoading,
    error: subsError,
    refetch: refetchSubs,
  } = useAppQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        plan: planFilter,
        cycle: cycleFilter,
        override: overrideFilter,
        penalty: penaltyFilter,
        sort: sortBy,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/subscriptions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load subscriptions.");

      return {
        subscriptions: json.subscriptions || [],
        counts: json.counts || {
          total: 0,
          active: 0,
          expiring: 0,
          grace: 0,
          expired: 0,
          suspended: 0,
          hasOverrides: 0,
          hasPenalties: 0,
        },
        totalPages: json.pagination?.totalPages || 1,
        totalItems: json.pagination?.totalItems || 0,
      };
    },
    { enabled: profile?.role === "super_admin", staleTime: 20_000 }
  );

  const subscriptions = subsBundle?.subscriptions || [];
  const counts = subsBundle?.counts || {
    total: 0,
    active: 0,
    expiring: 0,
    grace: 0,
    expired: 0,
    suspended: 0,
    hasOverrides: 0,
    hasPenalties: 0,
  };
  const totalPages = subsBundle?.totalPages || 1;
  const totalItems = subsBundle?.totalItems || 0;
  const loading = isSubsLoading && !subsBundle;
  const error = subsError ? subsError.message : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetchSubs(true);
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case "ACTIVE":
      case "TRIAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        );
      case "EXPIRING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            EXPIRING
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3" />
            GRACE
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            EXPIRED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-xs font-bold">
            <Ban className="h-3 w-3" />
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            {status || "ACTIVE"}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Subscription & Account Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Super Admin real-time control matrix: period adjustments, access overrides, resource limits, penalties, and audit ledgers.
          </p>
        </div>

        <button
          onClick={() => refetchSubs(true)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active</span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{counts.active}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Expiring</span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{counts.expiring}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Grace</span>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{counts.grace}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Expired</span>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{counts.expired}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/50 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Suspended</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{counts.suspended}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Overrides</span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400">{counts.hasOverrides}</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">Penalties</span>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-400">{counts.hasPenalties}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search school name, admin name, email, phone, school ID..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-9 pr-4 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
          >
            Filter Subscriptions
          </button>
        </form>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRING">EXPIRING</option>
              <option value="GRACE_PERIOD">GRACE PERIOD</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400">Plan:</label>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Plans</option>
              <option value="plan_starter">Starter Plan</option>
              <option value="plan_professional">Professional Plan</option>
              <option value="plan_enterprise">Enterprise Plan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400">Overrides:</label>
            <select
              value={overrideFilter}
              onChange={(e) => { setOverrideFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All</option>
              <option value="YES">Has Active Override</option>
              <option value="NO">No Override</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400">Penalties:</label>
            <select
              value={penaltyFilter}
              onChange={(e) => { setPenaltyFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All</option>
              <option value="YES">Has Pending Penalty</option>
              <option value="NO">No Penalty</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <label className="font-bold text-slate-600 dark:text-slate-400">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="newest">Newest First</option>
              <option value="daysRemaining">Fewest Days Remaining</option>
              <option value="schoolName">School Name (A-Z)</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscription List Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No subscriptions match your filters</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Try changing search queries or resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">School & Admin</th>
                  <th className="py-3.5 px-4">Plan & Cycle</th>
                  <th className="py-3.5 px-4">Status & Access</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Days Left</th>
                  <th className="py-3.5 px-4">Flags</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {subscriptions.map((s: any) => {
                  const expiryStr = s.expiresAt
                    ? new Date(s.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "N/A";

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {s.schoolName || `School (${s.schoolId})`}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {s.adminName} {s.email ? `• ${s.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                            {s.planId?.replace("plan_", "") || "STARTER"}
                          </span>
                          <p className="text-[11px] text-slate-400 uppercase">
                            {s.billingCycle || "MONTHLY"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(s.status)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                        {expiryStr}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${
                          s.daysRemaining <= 3 ? "text-red-600" : s.daysRemaining <= 7 ? "text-amber-600" : "text-slate-900 dark:text-white"
                        }`}>
                          {s.daysRemaining} days
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {s.hasOverride && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              {s.activeOverridesCount} Override
                            </span>
                          )}
                          {s.hasPenalty && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                              ₹{Math.round(s.pendingPenaltyAmount / 100)} Penalty
                            </span>
                          )}
                          {!s.hasOverride && !s.hasPenalty && (
                            <span className="text-[11px] text-slate-400">None</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubId(s.schoolId || s.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Showing page {page} of {totalPages} ({totalItems} total subscriptions)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Control Drawer */}
      {selectedSubId && (
        <SubscriptionControlDrawer
          subscriptionId={selectedSubId}
          onClose={() => setSelectedSubId(null)}
          onUpdate={() => {
            refetchSubs(true);
            appQueryClient.invalidateCache("superAdminSubs:*");
          }}
        />
      )}
    </div>
  );
}
