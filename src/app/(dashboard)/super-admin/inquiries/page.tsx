"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  SlidersHorizontal,
  UserCheck,
  Eye,
  Archive,
} from "lucide-react";
import { Inquiry, InquiryStatus, InquiryPriority } from "@/lib/inquiries";
import { InquiryDetailDrawer } from "@/components/super-admin/InquiryDetailDrawer";
import { toast } from "sonner";

export default function SuperAdminInquiriesPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary Counts state
  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    urgent: 0,
  });

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Active Selected Inquiry Drawer ID
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!firebaseUser || profile?.role !== "super_admin")) {
      router.push("/dashboard");
    }
  }, [firebaseUser, profile, authLoading, router]);

  const loadInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        priority: priorityFilter,
        source: sourceFilter,
        date: dateFilter,
        sort: sortBy,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/inquiries?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load inquiries from server.");
      }

      setInquiries(json.inquiries || []);
      setCounts(json.counts || { total: 0, new: 0, inProgress: 0, waiting: 0, resolved: 0, urgent: 0 });
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalItems(json.pagination?.totalItems || 0);
    } catch (err: any) {
      console.error("Inquiry fetch error:", err);
      setError(err.message || "Unable to communicate with inquiries database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "super_admin") {
      loadInquiries();
    }
  }, [profile, statusFilter, priorityFilter, sourceFilter, dateFilter, sortBy, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInquiries();
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            NEW
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            IN PROGRESS
          </span>
        );
      case "WAITING_FOR_RESPONSE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            WAITING
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            RESOLVED
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            CLOSED
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: InquiryPriority) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            HIGH
          </span>
        );
      case "NORMAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
            NORMAL
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[10px] font-medium">
            LOW
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
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            Contact Inquiries & CRM
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage, respond to, and track school onboarding requests and inquiries in real-time.
          </p>
        </div>

        <button
          onClick={loadInquiries}
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

      {/* Real Summary Counts Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Inquiries</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">NEW</span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{counts.new}</p>
        </div>
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">IN PROGRESS</span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400">{counts.inProgress}</p>
        </div>
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">WAITING</span>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{counts.waiting}</p>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">RESOLVED</span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{counts.resolved}</p>
        </div>
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">URGENT</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{counts.urgent}</p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <label htmlFor="inquiries-search-input" className="sr-only">Search name, email, phone, organization, subject</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="inquiries-search-input"
              name="search"
              aria-label="Search name, email, phone, organization, subject"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, organization, subject, ID..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-9 pr-4 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
          >
            Search Inquiries
          </button>
        </form>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-inquiries-status" className="font-bold text-slate-600 dark:text-slate-400">Status:</label>
            <select
              id="filter-inquiries-status"
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Active</option>
              <option value="NEW">NEW</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="WAITING_FOR_RESPONSE">WAITING RESPONSE</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-inquiries-priority" className="font-bold text-slate-600 dark:text-slate-400">Priority:</label>
            <select
              id="filter-inquiries-priority"
              name="priorityFilter"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-inquiries-date" className="font-bold text-slate-600 dark:text-slate-400">Date:</label>
            <select
              id="filter-inquiries-date"
              name="dateFilter"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <label htmlFor="filter-inquiries-sort" className="font-bold text-slate-600 dark:text-slate-400">Sort By:</label>
            <select
              id="filter-inquiries-sort"
              name="sortBy"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inquiry List Table (Desktop) / Cards (Mobile) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fetching real inquiries from Firestore...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No inquiries match your filters</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search term or status/priority filters to inspect matching onboarding inquiries.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Name & Contact</th>
                    <th className="py-3 px-4">Subject & Org</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      onClick={() => setSelectedInquiryId(inquiry.id)}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        {getPriorityBadge(inquiry.priority)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 dark:text-white block group-hover:text-blue-600 transition-colors">
                            {inquiry.name}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                            {inquiry.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {inquiry.subject}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate">
                            {inquiry.organization}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(inquiry.status)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {new Date(inquiry.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInquiryId(inquiry.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card List */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(inquiry.priority)}
                      {getStatusBadge(inquiry.status)}
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      {new Date(inquiry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {inquiry.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {inquiry.organization} • {inquiry.email}
                    </p>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                    {inquiry.subject}
                  </p>

                  <div className="flex justify-end pt-1">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span>View details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Server-side Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>
              Showing {inquiries.length} of {totalItems} inquiries (Page {page} of {totalPages})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inquiry Detail Side Drawer */}
      {selectedInquiryId && (
        <InquiryDetailDrawer
          inquiryId={selectedInquiryId}
          onClose={() => setSelectedInquiryId(null)}
          onUpdate={loadInquiries}
        />
      )}
    </div>
  );
}
