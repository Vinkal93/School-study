"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
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
  Eye,
  Ban,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { SchoolSubscription, SubscriptionStatus } from "@/types";
import { toast } from "sonner";

export default function SuperAdminSubscriptionsPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    grace: 0,
    expired: 0,
    suspended: 0,
    cancelled: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [cycleFilter, setCycleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Suspension Modal State
  const [selectedSubForSuspend, setSelectedSubForSuspend] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (!authLoading && (!firebaseUser || profile?.role !== "super_admin")) {
      router.push("/dashboard");
    }
  }, [firebaseUser, profile, authLoading, router]);

  const loadSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        plan: planFilter,
        cycle: cycleFilter,
        sort: sortBy,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/subscriptions?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load subscriptions.");

      setSubscriptions(json.subscriptions || []);
      setCounts(json.counts || { total: 0, active: 0, expiring: 0, grace: 0, expired: 0, suspended: 0, cancelled: 0 });
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalItems(json.pagination?.totalItems || 0);
    } catch (err: any) {
      console.error("Subscription fetch error:", err);
      setError(err.message || "Failed to load subscription catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "super_admin") {
      loadSubscriptions();
    }
  }, [profile, statusFilter, planFilter, cycleFilter, sortBy, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSubscriptions();
  };

  const handleSuspendConfirm = async () => {
    if (!selectedSubForSuspend || !suspensionReason.trim()) return;
    setSubmittingAction(true);

    try {
      const res = await fetch(`/api/super-admin/subscriptions/${selectedSubForSuspend.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "suspend", reason: suspensionReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to suspend subscription");

      toast.success(json.message || "Subscription suspended successfully.");
      setSelectedSubForSuspend(null);
      setSuspensionReason("");
      loadSubscriptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend subscription.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResumeClick = async (subId: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "resume" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resume subscription");

      toast.success(json.message || "Subscription resumed successfully.");
      loadSubscriptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to resume subscription.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus, isCancelPending?: boolean) => {
    if (isCancelPending) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          CANCEL AT PERIOD END
        </span>
      );
    }

    switch (status) {
      case "ACTIVE":
      case "TRIAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        );
      case "EXPIRING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            EXPIRING
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3" />
            GRACE PERIOD
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            EXPIRED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-0.5 text-xs font-bold">
            <Ban className="h-3 w-3" />
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (profile?.role !== "super_admin") return null;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            Subscription Lifecycle Engine
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Centralized multi-tenant subscription monitoring, renewals, upgrades, and audit controls.
          </p>
        </div>

        <button
          onClick={loadSubscriptions}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Subscriptions</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">ACTIVE</span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{counts.active}</p>
        </div>
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">EXPIRING</span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{counts.expiring}</p>
        </div>
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">GRACE</span>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{counts.grace}</p>
        </div>
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">EXPIRED</span>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{counts.expired}</p>
        </div>
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">SUSPENDED</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{counts.suspended}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <label htmlFor="subscriptions-search-input" className="sr-only">Search school ID, subscription ID, plan</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="subscriptions-search-input"
              name="search"
              aria-label="Search school ID, subscription ID, plan"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school ID, subscription ID, plan ID..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-9 pr-4 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
          >
            Search Subscriptions
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-subscriptions-status" className="font-bold text-slate-600 dark:text-slate-400">Status:</label>
            <select
              id="filter-subscriptions-status"
              name="statusFilter"
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
              <option value="CANCELLED">CANCEL AT PERIOD END</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-subscriptions-plan" className="font-bold text-slate-600 dark:text-slate-400">Plan:</label>
            <select
              id="filter-subscriptions-plan"
              name="planFilter"
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Plans</option>
              <option value="plan_starter">Starter</option>
              <option value="plan_professional">Professional</option>
              <option value="plan_enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-subscriptions-cycle" className="font-bold text-slate-600 dark:text-slate-400">Billing Cycle:</label>
            <select
              id="filter-subscriptions-cycle"
              name="cycleFilter"
              value={cycleFilter}
              onChange={(e) => { setCycleFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <label htmlFor="filter-subscriptions-sort" className="font-bold text-slate-600 dark:text-slate-400">Sort By:</label>
            <select
              id="filter-subscriptions-sort"
              name="sortBy"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="expiry">Expiration Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table (Desktop) / Cards (Mobile) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Loading subscription state engine...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No subscriptions match your filters</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search query or status filters to inspect tenant subscriptions.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">School ID</th>
                    <th className="py-3 px-4">Plan & Version</th>
                    <th className="py-3 px-4">Billing Cycle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Current Period End</th>
                    <th className="py-3 px-4">Days Left</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {sub.schoolId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 block">
                          {sub.planId}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-mono">
                          {sub.planVersionId || "v1"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold uppercase text-slate-700 dark:text-slate-300">
                        {sub.billingCycle}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(sub.expiresAt || sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {sub.daysRemaining} days
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === "SUSPENDED" ? (
                            <button
                              onClick={() => handleResumeClick(sub.schoolId)}
                              disabled={submittingAction}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold hover:bg-emerald-100 text-xs transition-colors"
                            >
                              Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedSubForSuspend(sub)}
                              disabled={submittingAction}
                              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold hover:bg-red-100 text-xs transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{sub.schoolId}</span>
                    {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <p><strong className="text-slate-900 dark:text-white">Plan:</strong> {sub.planId} ({sub.billingCycle})</p>
                    <p><strong className="text-slate-900 dark:text-white">Expires:</strong> {new Date(sub.expiresAt || sub.currentPeriodEnd).toLocaleDateString()}</p>
                    <p><strong className="text-slate-900 dark:text-white">Days Left:</strong> {sub.daysRemaining} days</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {sub.status === "SUSPENDED" ? (
                      <button
                        onClick={() => handleResumeClick(sub.schoolId)}
                        disabled={submittingAction}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                      >
                        Resume Access
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedSubForSuspend(sub)}
                        disabled={submittingAction}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                      >
                        Suspend School
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Showing {subscriptions.length} of {totalItems} (Page {page} of {totalPages})</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Suspension Modal */}
      {selectedSubForSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Suspend Subscription: {selectedSubForSuspend.schoolId}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  This will immediately restrict tenant access according to suspension security policy.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="suspension-reason-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mandatory Suspension Reason *
              </label>
              <textarea
                id="suspension-reason-input"
                name="suspensionReason"
                aria-label="Mandatory suspension reason"
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Non-payment, violation of SaaS terms of service."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSubForSuspend(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendConfirm}
                disabled={submittingAction || suspensionReason.trim().length < 3}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
