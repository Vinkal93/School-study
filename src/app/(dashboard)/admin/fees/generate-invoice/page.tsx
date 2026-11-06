"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { feeFetch } from "@/lib/fees/client-request";
import { getStudents } from "@/lib/services/student.service";
import { formatINR } from "@/lib/services/fee-foundation.service";
import type { StudentProfile } from "@/types";
import type { FeeDemand } from "@/types/fee-foundation";
import { toast } from "sonner";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  FileText,
  Calendar,
  Filter,
  Search,
  Sparkles,
  ArrowUpDown,
  Eye,
  ExternalLink,
  X,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  UserCheck,
} from "lucide-react";

type StatusFilter = "ALL" | "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export default function GenerateFeeInvoicePage() {
  const { profile } = useAuth();
  const { academicYearId, years } = useFeeSession();
  const schoolId = profile?.schoolId || "";

  // Data states
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revision, setRevision] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<"dueDate" | "invoiceNumber" | "studentName" | "balance">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Detail Modal / Drawer state
  const [selectedDemand, setSelectedDemand] = useState<FeeDemand | null>(null);

  const busy = useRef(false);

  // Fetch active students
  useEffect(() => {
    if (!schoolId) return;
    getStudents(schoolId, { status: "active" })
      .then(setStudents)
      .catch((err) => {
        console.warn("Could not load students for invoice filter:", err);
      });
  }, [schoolId]);

  // Fetch fee demands
  useEffect(() => {
    let cancelled = false;
    if (!schoolId) return;

    setLoading(true);
    setLoadError(null);

    feeFetch(
      `/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&academicYearId=${encodeURIComponent(
        academicYearId
      )}`
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invoices unavailable.");
        }
        return (data.demands || []) as FeeDemand[];
      })
      .then((list) => {
        if (!cancelled) {
          setDemands(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load fee invoices.";
          setLoadError(msg);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, academicYearId, revision]);

  // Extract unique classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className).filter(Boolean))).sort();
  }, [students]);

  // Eligible students for selected class
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => selectedClass === "all" || s.className === selectedClass);
  }, [students, selectedClass]);

  // Compute Overdue helper
  const isOverdue = (demand: FeeDemand) => {
    if (demand.status === "PAID" || demand.balanceAmountPaise <= 0) return false;
    try {
      const due = new Date(demand.dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return due < now;
    } catch {
      return false;
    }
  };

  // Metrics KPI calculations
  const metrics = useMemo(() => {
    let totalInvoicedPaise = 0;
    let totalCollectedPaise = 0;
    let totalOutstandingPaise = 0;
    let overdueCount = 0;
    let overdueAmountPaise = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    demands.forEach((d) => {
      if (d.status === "CANCELLED") return;
      totalInvoicedPaise += d.netAmountPaise || 0;
      totalCollectedPaise += d.paidAmountPaise || 0;
      totalOutstandingPaise += d.balanceAmountPaise || 0;

      if (d.status === "PAID" || d.balanceAmountPaise === 0) {
        paidCount++;
      } else if (d.status === "PARTIAL" || (d.paidAmountPaise > 0 && d.balanceAmountPaise > 0)) {
        partialCount++;
      } else {
        pendingCount++;
      }

      if (isOverdue(d)) {
        overdueCount++;
        overdueAmountPaise += d.balanceAmountPaise || 0;
      }
    });

    const totalActive = demands.filter((d) => d.status !== "CANCELLED").length;
    const collectionRate = totalInvoicedPaise > 0 ? Math.round((totalCollectedPaise / totalInvoicedPaise) * 100) : 0;

    return {
      totalInvoicedPaise,
      totalCollectedPaise,
      totalOutstandingPaise,
      overdueCount,
      overdueAmountPaise,
      paidCount,
      partialCount,
      pendingCount,
      totalActive,
      collectionRate,
    };
  }, [demands]);

  // Filtered and Sorted invoices
  const visibleDemands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return demands
      .filter((d) => {
        if (d.status === "CANCELLED") return false;

        // Class filter
        if (selectedClass !== "all" && d.className !== selectedClass) return false;

        // Student filter
        if (selectedStudentId && d.studentId !== selectedStudentId) return false;

        // Status filter
        if (statusFilter === "PAID" && d.status !== "PAID" && d.balanceAmountPaise > 0) return false;
        if (statusFilter === "PARTIAL" && d.status !== "PARTIAL") return false;
        if (statusFilter === "PENDING" && d.status !== "DUE" && (d.status as string) !== "PENDING") return false;
        if (statusFilter === "OVERDUE" && !isOverdue(d)) return false;

        // Search query
        if (q) {
          const name = (d.studentName || "").toLowerCase();
          const inv = (d.invoiceNumber || "").toLowerCase();
          const adm = String(d.admissionNumber || "").toLowerCase();
          const head = (d.feeHeadName || "").toLowerCase();
          const period = (d.period || "").toLowerCase();
          return (
            name.includes(q) ||
            inv.includes(q) ||
            adm.includes(q) ||
            head.includes(q) ||
            period.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "dueDate") {
          comparison = (a.dueDate || "").localeCompare(b.dueDate || "");
        } else if (sortBy === "invoiceNumber") {
          comparison = (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "");
        } else if (sortBy === "studentName") {
          comparison = (a.studentName || "").localeCompare(b.studentName || "");
        } else if (sortBy === "balance") {
          comparison = (a.balanceAmountPaise || 0) - (b.balanceAmountPaise || 0);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [demands, selectedClass, selectedStudentId, statusFilter, searchQuery, sortBy, sortOrder]);

  // Bulk generate invoices
  const handleGenerate = async () => {
    if (busy.current || !schoolId || academicYearId === "all") return;
    const targetStudentIds = selectedStudentId ? [selectedStudentId] : eligibleStudents.map((s) => s.id);

    if (!targetStudentIds.length) {
      toast.error("No eligible students found in the selected class.");
      return;
    }

    busy.current = true;
    setGenerating(true);

    try {
      const yearName = years.find((y) => y.id === academicYearId)?.name;
      const res = await feeFetch("/api/fees/foundation/demands/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          action: "generate",
          academicYearId,
          academicYearName: yearName,
          studentIds: targetStudentIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invoice generation failed.");
      }

      const result = data.result || data;
      if (result.errors?.length || result.failed) {
        throw new Error(result.errors?.join("; ") || "Some invoices failed to generate. Please retry.");
      }

      toast.success(
        `Generated ${result.newlyGenerated || 0} missing invoices! Existing paid invoices remained untouched.`
      );
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Invoice generation failed.");
    } finally {
      busy.current = false;
      setGenerating(false);
      setRevision((v) => v + 1);
    }
  };

  return (
    <EntitlementGate feature="fee_structure" title="Fee Invoices" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Fee Invoices & Billing Register
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track billing demands, verify collections, and generate missing invoices atomically.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              type="button"
              onClick={() => setRevision((v) => v + 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-all shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              disabled={!visibleDemands.length}
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-all shadow-xs disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5 text-gray-500" />
              <span>Print Register</span>
            </button>

            <button
              type="button"
              disabled={generating || academicYearId === "all"}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating Invoices…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate Missing Invoices</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Academic Session Warning */}
        {academicYearId === "all" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 flex items-center gap-3 text-amber-800 dark:text-amber-300 print:hidden">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-medium">
              You are currently viewing &ldquo;All Sessions&rdquo;. Select an explicit Academic Session from the topbar
              selector to generate new invoices.
            </p>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Billed */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 dark:border-gray-800 dark:bg-gray-950 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Billed</span>
              <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                {formatINR(metrics.totalInvoicedPaise)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Across {metrics.totalActive} active invoices
            </p>
          </div>

          {/* Total Collected */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 dark:border-gray-800 dark:bg-gray-950 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Collected</span>
              <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatINR(metrics.totalCollectedPaise)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>{metrics.collectionRate}% Recovery Rate</span>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 dark:border-gray-800 dark:bg-gray-950 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Outstanding Dues</span>
              <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {formatINR(metrics.totalOutstandingPaise)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {metrics.pendingCount + metrics.partialCount} pending/partial invoices
            </p>
          </div>

          {/* Overdue */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 dark:border-gray-800 dark:bg-gray-950 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overdue Invoices</span>
              <span className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {formatINR(metrics.overdueAmountPaise)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-rose-600 font-semibold">
              {metrics.overdueCount} invoices past due date
            </p>
          </div>
        </div>

        {/* Filter Toolbar & Status Pills */}
        <div className="space-y-3.5 print:hidden">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "ALL", label: "All Invoices", count: metrics.totalActive },
                { key: "OVERDUE", label: "Overdue", count: metrics.overdueCount },
                { key: "PENDING", label: "Pending", count: metrics.pendingCount },
                { key: "PARTIAL", label: "Partial", count: metrics.partialCount },
                { key: "PAID", label: "Fully Paid", count: metrics.paidCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                      active
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-gray-900"
                        : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, invoice#, admission#…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Class Filter */}
            <div>
              <select
                aria-label="Filter by Class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudentId("");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Filter */}
            <div>
              <select
                aria-label="Filter by Student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Students in Selected Class</option>
                {eligibleStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admissionNumber || s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                aria-label="Sort by"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split(":");
                  setSortBy(f as any);
                  setSortOrder(o as any);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="dueDate:asc">Due Date (Earliest First)</option>
                <option value="dueDate:desc">Due Date (Latest First)</option>
                <option value="balance:desc">Balance Due (High to Low)</option>
                <option value="studentName:asc">Student Name (A-Z)</option>
                <option value="invoiceNumber:asc">Invoice Number</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Register Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden dark:border-gray-800 dark:bg-gray-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Fee Head / Period</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Net Charge</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleDemands.map((demand) => {
                  const overdue = isOverdue(demand);
                  return (
                    <tr
                      key={demand.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      {/* Invoice Number */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                        {demand.invoiceNumber}
                      </td>

                      {/* Student */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/fees/student-fees?studentId=${encodeURIComponent(demand.studentId)}`}
                          className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{demand.studentName}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                        </Link>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          {demand.admissionNumber}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {demand.className} {demand.sectionName ? `(${demand.sectionName})` : ""}
                      </td>

                      {/* Head & Period */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                          {demand.feeHeadName}
                        </span>
                        <span className="text-[10px] text-gray-400 block">{demand.period}</span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            overdue
                              ? "text-rose-600 font-bold dark:text-rose-400"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{demand.dueDate?.slice(0, 10)}</span>
                        </span>
                        {overdue && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-rose-50 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ml-1.5">
                            OVERDUE
                          </span>
                        )}
                      </td>

                      {/* Net Amount */}
                      <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                        {formatINR(demand.netAmountPaise)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(demand.paidAmountPaise)}
                      </td>

                      {/* Balance Amount */}
                      <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatINR(demand.balanceAmountPaise)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                            demand.status === "PAID" || demand.balanceAmountPaise === 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : overdue
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : demand.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              demand.status === "PAID" || demand.balanceAmountPaise === 0
                                ? "bg-emerald-500"
                                : overdue
                                ? "bg-rose-500"
                                : demand.status === "PARTIAL"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                          />
                          {overdue ? "Overdue" : demand.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDemand(demand)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>

                          {demand.balanceAmountPaise > 0 && (
                            <Link
                              href={`/admin/fees/collect?studentId=${encodeURIComponent(demand.studentId)}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Collect</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty and Loading States */}
            {loading && demands.length === 0 && (
              <div className="p-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Loading invoices from database…
                </p>
              </div>
            )}

            {!loading && visibleDemands.length === 0 && (
              <div className="p-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                  No fee invoices found
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {searchQuery || selectedClass !== "all" || statusFilter !== "ALL"
                    ? "No invoices match your active search and filter criteria. Try resetting filters."
                    : "No invoices generated yet for this session. Click \"Generate Missing Invoices\" to create invoices based on configured fee structures."}
                </p>
                {academicYearId !== "all" && !demands.length && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate Invoices Now</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Detail Modal / Drawer */}
        {selectedDemand && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-150 space-y-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Invoice #{selectedDemand.invoiceNumber}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Academic Year: {selectedDemand.academicYearName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDemand(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Student Info Card */}
              <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedDemand.studentName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Adm#: {selectedDemand.admissionNumber} • Class: {selectedDemand.className}{" "}
                      {selectedDemand.sectionName ? `(${selectedDemand.sectionName})` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/fees/student-fees?studentId=${encodeURIComponent(selectedDemand.studentId)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>Ledger</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Fee Head</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedDemand.feeHeadName} ({selectedDemand.period})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Gross Charge</span>
                  <span className="font-mono font-medium">
                    {formatINR(selectedDemand.grossAmountPaise)}
                  </span>
                </div>
                {selectedDemand.discountAmountPaise > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 text-emerald-600 font-semibold">
                    <span>Discount / Concession</span>
                    <span>- {formatINR(selectedDemand.discountAmountPaise)}</span>
                  </div>
                )}
                {selectedDemand.lateFeePaise > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 text-rose-600 font-semibold">
                    <span>Late Fee Penalty</span>
                    <span>+ {formatINR(selectedDemand.lateFeePaise)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">
                  <span>Net Payable</span>
                  <span>{formatINR(selectedDemand.netAmountPaise)}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                  <span>Amount Paid</span>
                  <span>{formatINR(selectedDemand.paidAmountPaise)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-extrabold text-amber-600 dark:text-amber-400 text-sm bg-amber-50/60 dark:bg-amber-950/30 px-2 rounded-lg">
                  <span>Remaining Balance</span>
                  <span>{formatINR(selectedDemand.balanceAmountPaise)}</span>
                </div>
              </div>

              {/* Due Date & Status */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due Date: {selectedDemand.dueDate?.slice(0, 10)}</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    selectedDemand.status === "PAID" || selectedDemand.balanceAmountPaise === 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : isOverdue(selectedDemand)
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {isOverdue(selectedDemand) ? "Overdue" : selectedDemand.status}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedDemand(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                >
                  Close
                </button>
                {selectedDemand.balanceAmountPaise > 0 && (
                  <Link
                    href={`/admin/fees/collect?studentId=${encodeURIComponent(selectedDemand.studentId)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Collect Payment</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
