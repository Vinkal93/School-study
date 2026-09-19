"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  CreditCard,
  FileText,
  Calendar,
  ChevronDown,
  Plus,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  Download,
  Phone,
  PhoneCall,
  MoreVertical,
  Copy,
  Check,
  CheckCircle2,
  Wallet,
  Sparkles,
  Loader2,
  Printer,
  Share2,
  BookOpen,
  Search,
  X,
  RotateCcw,
  Filter,
} from "lucide-react";
import {
  getFeeDashboardOverviewData,
  getFeeSettings,
  type FeeDashboardOverviewData,
} from "@/lib/services/fee.service";
import {
  getClassesWithSections,
  getAcademicYears,
} from "@/lib/services/academic.service";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { FeeFollowUpModal } from "@/components/fees/FeeFollowUpModal";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import type {
  SchoolClass,
  FeePayment,
  StudentFeeAssignment,
  AcademicYear,
} from "@/types";
import { toast } from "sonner";

export default function AdminFeeDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = profile?.schoolName || "Lord Buddha Public School";

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [data, setData] = useState<FeeDashboardOverviewData | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "all" | "pending" | "paid" | "overdue"
  >("all");
  const [trendView, setTrendView] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [messageType, setMessageType] = useState<
    "reminder" | "received" | "custom"
  >("reminder");
  const [copied, setCopied] = useState(false);

  // Dynamic month options based on selected academic year
  const monthOptions = useMemo(() => {
    if (!selectedYear) return [{ value: "all", label: "All Months" }];
    const year = academicYears.find((y) => y.id === selectedYear);
    if (!year) return [{ value: "all", label: "All Months" }];

    // Parse academic year to get start/end year (e.g., "2026-27" -> 2026, 2027)
    const match = (year.name || year.id).match(/(\d{4})[-_]?(\d{2,4})?/);
    const startYear = match ? parseInt(match[1]) : new Date().getFullYear();
    const endYear =
      match && match[2]
        ? parseInt(match[2].length === 2 ? "20" + match[2] : match[2])
        : startYear + 1;

    const months = [
      { value: "all", label: "All Months" },
      { value: `April ${startYear}`, label: `April ${startYear}` },
      { value: `May ${startYear}`, label: `May ${startYear}` },
      { value: `June ${startYear}`, label: `June ${startYear}` },
      { value: `July ${startYear}`, label: `July ${startYear}` },
      { value: `August ${startYear}`, label: `August ${startYear}` },
      { value: `September ${startYear}`, label: `September ${startYear}` },
      { value: `October ${startYear}`, label: `October ${startYear}` },
      { value: `November ${startYear}`, label: `November ${startYear}` },
      { value: `December ${startYear}`, label: `December ${startYear}` },
      { value: `January ${endYear}`, label: `January ${endYear}` },
      { value: `February ${endYear}`, label: `February ${endYear}` },
      { value: `March ${endYear}`, label: `March ${endYear}` },
    ];
    return months;
  }, [selectedYear, academicYears]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear("");
    setSelectedMonth("all");
    setSelectedClass("all");
    setSelectedSection("all");
    setSearchQuery("");
    setPaymentStatusFilter("all");
    setFilterError(null);
    // Trigger data reload with defaults
    const currentYear =
      academicYears.find((y) => y.isCurrent) || academicYears[0];
    if (currentYear) setSelectedYear(currentYear.id);
  };

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<FeePayment | null>(
    null
  );
  const [followUpTarget, setFollowUpTarget] =
    useState<StudentFeeAssignment | null>(null);
  const [shareModalTarget, setShareModalTarget] = useState<{
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    phone?: string;
    parentPhone?: string;
  } | null>(null);

  // Tooltip state for Collection Trend chart
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(5); // Default Sep

  // 1. Load Academic Years & Classes on initial mount
  useEffect(() => {
    if (!schoolId) return;
    Promise.all([getAcademicYears(schoolId), getClassesWithSections(schoolId)])
      .then(([years, classList]) => {
        setAcademicYears(years);
        setClasses(classList);
        const currentYear = years.find((y) => y.isCurrent) || years[0];
        if (currentYear && !selectedYear) {
          setSelectedYear(currentYear.id);
          setSelectedMonth("all");
        }
      })
      .catch((err) =>
        console.error("Failed to load initial fee metadata:", err)
      );
  }, [schoolId]);

  // 2. Load Dashboard Data whenever any filter changes
  useEffect(() => {
    async function loadData() {
      if (!schoolId) return;
      if (data) {
        setIsUpdating(true);
      } else {
        setLoading(true);
      }
      setFilterError(null);
      try {
        const dashData = await getFeeDashboardOverviewData(schoolId, {
          academicYearId: selectedYear || undefined,
          month: selectedMonth === "all" ? undefined : selectedMonth,
          className: selectedClass === "all" ? undefined : selectedClass,
          sectionName: selectedSection === "all" ? undefined : selectedSection,
          searchQuery: searchQuery || undefined,
          paymentStatusFilter:
            paymentStatusFilter === "all" ? undefined : paymentStatusFilter,
        });
        setData(dashData);
      } catch (err: unknown) {
        console.error("Failed to load fee dashboard:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load fee data for the selected filters.";
        setFilterError(errorMessage);
      } finally {
        setLoading(false);
        setIsUpdating(false);
      }
    }
    loadData();
  }, [
    schoolId,
    selectedYear,
    selectedMonth,
    selectedClass,
    selectedSection,
    searchQuery,
    paymentStatusFilter,
  ]);

  const fmtRupees = (paise: number) =>
    "₹" +
    (paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const availableSections = useMemo(() => {
    if (selectedClass === "all") return [];
    const cls = classes.find(
      (c) => c.name === selectedClass || c.id === selectedClass
    );
    return cls?.sections?.map((s) => s.name) || ["A", "B", "C"];
  }, [selectedClass, classes]);

  // Active student for message preview (top defaulter if available)
  const previewStudent = data?.topDefaulters?.[0] || null;

  const previewMessageText = useMemo(() => {
    if (!previewStudent) {
      return `Dear Parent,\nFee reminder from ${schoolName}.\nKindly clear any pending school fee dues at the earliest.\nThank you.\n- ${schoolName}`;
    }
    const studentName = previewStudent.studentName;
    const className = previewStudent.className;
    const dueAmount = fmtRupees(previewStudent.dueAmountPaise);

    if (messageType === "received") {
      return `Dear Parent,\n${schoolName}\nPayment received for ${studentName}, Class ${className}.\nAmount: ${dueAmount}.\nReceipt has been generated.\nThank you.\n- ${schoolName}`;
    }
    if (messageType === "custom") {
      return `Dear Parent,\n${schoolName}\nPlease note that upcoming term fee adjustments are now scheduled for ${studentName}, Class ${className}.\nContact school office for queries.\n- ${schoolName}`;
    }
    return `Dear Parent,\n${schoolName}\nFee reminder for ${studentName}, Class ${className}.\nPending Fee: ${dueAmount}.\nKindly make the payment at the earliest.\nThank you.\n- ${schoolName}`;
  }, [messageType, previewStudent, schoolName]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(previewMessageText);
    setCopied(true);
    toast.success("Fee message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const phone =
      previewStudent?.phone || previewStudent?.parentPhone || "9876543210";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(previewMessageText)}`;
    window.open(url, "_blank");
  };

  // Quick action: Send Fee Reminder
  const handleTriggerFeeReminder = () => {
    if (data?.topDefaulters && data.topDefaulters.length > 0) {
      const first = data.topDefaulters[0];
      setShareModalTarget({
        id: first.studentId,
        name: first.studentName,
        admissionNumber: first.admissionNumber,
        className: first.className,
        phone: first.phone,
        parentPhone: first.parentPhone,
      });
    } else {
      toast.info("No pending fee accounts found.");
    }
  };

  // Quick action: Export Report
  const handleExportReport = () => {
    if (!data) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Metric,Value",
        `Total Expected Fee,${fmtRupees(data.metrics.totalExpectedPaise)}`,
        `Total Fee Collected,${fmtRupees(data.metrics.totalCollectedPaise)}`,
        `Outstanding Dues,${fmtRupees(data.metrics.totalPendingPaise)}`,
        `Collection Rate,${data.metrics.collectionRate}%`,
        `Today&apos;s Collection,${fmtRupees(data.metrics.todayCollectionPaise)}`,
        `Defaulters Count,${data.metrics.defaultersCount}`,
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Fee_Summary_${selectedMonth === "all" ? "All_Months" : selectedMonth.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fee summary report exported successfully!");
  };

  // SVG Trend Chart Dimensions
  const trendData = data?.collectionTrend || [];
  const chartW = 600;
  const chartH = 180;
  const padL = 45;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const maxPaise = 60000000; // 6L paise limit

  const getX = (idx: number) =>
    padL + (idx / Math.max(trendData.length - 1, 1)) * innerW;
  const getY = (val: number) =>
    padT + innerH - (Math.min(val, maxPaise) / maxPaise) * innerH;

  const buildPath = (
    key: "expectedPaise" | "collectedPaise" | "outstandingPaise"
  ) => {
    if (trendData.length === 0) return "";
    const points = trendData.map((d, i) => ({ x: getX(i), y: getY(d[key]) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // SVG Donut Chart Calculation
  const methods = data?.paymentMethods || [];
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  // Calculate donut segments without mutating state during render
  const donutSegments = methods.map((m, index) => {
    const previousPercentage = methods
      .slice(0, index)
      .reduce((sum, item) => sum + item.percentage, 0);
    const strokeDasharray = `${(m.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((previousPercentage / 100) * circumference);
    return {
      ...m,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <EntitlementGate
      feature="fee_dashboard"
      title="Fee Management Dashboard"
      description="Collection insights, payments, dues and complete fee management."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-6 pb-12">
        {/* Error notification if filter fails */}
        {filterError && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{filterError}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setFilterError(null);
                getFeeDashboardOverviewData(schoolId, {
                  academicYearId: selectedYear || undefined,
                  month: selectedMonth === "all" ? undefined : selectedMonth,
                  className:
                    selectedClass === "all" ? undefined : selectedClass,
                  sectionName:
                    selectedSection === "all" ? undefined : selectedSection,
                  searchQuery: searchQuery || undefined,
                  paymentStatusFilter:
                    paymentStatusFilter === "all"
                      ? undefined
                      : paymentStatusFilter,
                })
                  .then((d) => setData(d))
                  .catch((err) =>
                    setFilterError(err?.message || "Failed to reload fee data")
                  )
                  .finally(() => setLoading(false));
              }}
              className="cursor-pointer rounded-lg bg-amber-200 px-3 py-1 font-bold text-amber-900 transition-all hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================
            TOP BAR / PAGE HEADER
        ======================================================== */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <CreditCard className="h-6 w-6" />
              {isUpdating && (
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 animate-pulse rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Fee Management
                </h1>
                {isUpdating && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/50 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Collection insights, payments, dues and complete fee management.
              </p>
            </div>
          </div>

          {/* Right Controls: Filters & Primary Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Academic Session Selector */}
            {academicYears.length > 0 && (
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name || ay.id} {ay.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            )}

            {/* Month Selector - Dynamic based on Academic Year */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-8 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Class Selector */}
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("all");
                }}
                className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Section Selector */}
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={selectedClass === "all"}
                className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Student Search */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[180px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-8 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Payment Status Filter */}
            <div className="relative">
              <select
                value={paymentStatusFilter}
                onChange={(e) =>
                  setPaymentStatusFilter(
                    e.target.value as "all" | "pending" | "paid" | "overdue"
                  )
                }
                className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <Filter className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Reset Filters Button */}
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 transition-all hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            {/* Student Ledger Link */}
            <Link
              href="/admin/fees/ledger"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Student Ledger</span>
            </Link>

            {/* Cash & Bank Link */}
            <Link
              href="/admin/fees/cash-bank"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>Cash & Bank</span>
            </Link>

            {/* Accounting & Trial Balance Link */}
            <Link
              href="/admin/fees/accounting"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <BookOpen className="h-4 w-4 text-purple-600" />
              <span>Accounting & TB</span>
            </Link>

            {/* + Collect Fee CTA */}
            <Link
              href="/admin/fees/collect"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Collect Fee</span>
            </Link>
          </div>
        </div>

        {/* ========================================================
            DASHBOARD CONTENT / SKELETON
        ======================================================== */}
        {loading && !data ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="h-80 rounded-2xl bg-slate-100 lg:col-span-2 dark:bg-slate-800" />
              <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            {/* ========================================================
            ROW 1: 4 KEY METRIC CARDS (KPIs)
        ======================================================== */}
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-4 ${isUpdating ? "opacity-70" : "opacity-100"}`}
            >
              {/* Card 1: Total Expected */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/50 dark:text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  {/* Mini Blue Bars Sparkline */}
                  <div className="flex h-8 items-end gap-1">
                    {[35, 50, 65, 45, 80, 60, 90].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 rounded-sm bg-blue-200 dark:bg-blue-800/80"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Expected
                  </span>
                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {fmtRupees(data?.metrics.totalExpectedPaise || 0)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {selectedMonth === "all"
                      ? "All Months"
                      : `For ${selectedMonth}`}
                  </p>
                </div>
              </div>

              {/* Card 2: Total Collected */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                  {/* Mini Emerald Bars Sparkline */}
                  <div className="flex h-8 items-end gap-1">
                    {[30, 45, 60, 75, 70, 85, 95].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 rounded-sm bg-emerald-200 dark:bg-emerald-800/80"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Collected
                  </span>
                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {fmtRupees(data?.metrics.totalCollectedPaise || 0)}
                  </p>
                  <p className="mt-1 flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span>
                      {data?.metrics.collectedPercentVsLastMonth
                        ? `↑ ${data.metrics.collectedPercentVsLastMonth}%`
                        : "Live"}
                    </span>
                    <span className="font-normal text-slate-400">
                      {" "}
                      collections
                    </span>
                  </p>
                </div>
              </div>

              {/* Card 3: Outstanding */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  {/* Mini Rose Bars Sparkline */}
                  <div className="flex h-8 items-end gap-1">
                    {[60, 80, 50, 70, 55, 85, 65].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 rounded-sm bg-rose-200 dark:bg-rose-800/80"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Outstanding
                  </span>
                  <p className="mt-1 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                    {fmtRupees(data?.metrics.totalPendingPaise || 0)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-rose-500 dark:text-rose-400">
                    {data?.metrics.defaultersCount || 0} students due
                  </p>
                </div>
              </div>

              {/* Card 4: Collection Rate */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-900/40 dark:bg-purple-950/50 dark:text-purple-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  {/* Mini Purple Bars Sparkline */}
                  <div className="flex h-8 items-end gap-1">
                    {[45, 60, 70, 75, 80, 85, 81].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1.5 rounded-sm bg-purple-200 dark:bg-purple-800/80"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Collection Rate
                  </span>
                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {data?.metrics.collectionRate || 0}%
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Target: 90%
                  </p>
                </div>
              </div>
            </div>

            {/* ========================================================
            ROW 2: COLLECTION TREND | QUICK ACTIONS | PAYMENT METHOD
        ======================================================== */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Panel 1: Collection Trend (6 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Collection Trend
                    </h3>
                  </div>

                  {/* Legends */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Expected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Collected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Outstanding
                    </span>
                  </div>

                  {/* Monthly / Quarterly / Yearly toggle */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                    {(["monthly", "quarterly", "yearly"] as const).map(
                      (view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => setTrendView(view)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                            trendView === view
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          {view}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* SVG Chart Area */}
                <div className="relative mt-3 w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="h-44 w-full select-none"
                  >
                    {/* Y-axis grid lines & labels */}
                    {[
                      { label: "₹6L", val: 60000000 },
                      { label: "₹4L", val: 40000000 },
                      { label: "₹2L", val: 20000000 },
                      { label: "0", val: 0 },
                    ].map((grid, idx) => {
                      const y = getY(grid.val);
                      return (
                        <g key={idx}>
                          <text
                            x={padL - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-slate-400 font-mono text-[10px]"
                          >
                            {grid.label}
                          </text>
                          <line
                            x1={padL}
                            y1={y}
                            x2={chartW - padR}
                            y2={y}
                            stroke="currentColor"
                            strokeDasharray={idx === 3 ? "none" : "3,3"}
                            className="text-slate-100 dark:text-slate-800"
                          />
                        </g>
                      );
                    })}

                    {/* X-axis labels */}
                    {trendData.map((d, i) => (
                      <text
                        key={i}
                        x={getX(i)}
                        y={chartH - 8}
                        textAnchor="middle"
                        className={`text-[10px] ${
                          hoveredTrendIndex === i
                            ? "fill-blue-600 font-bold"
                            : "fill-slate-400"
                        }`}
                      >
                        {d.month}
                      </text>
                    ))}

                    {/* 3 Continuous Curve Paths */}
                    <path
                      d={buildPath("expectedPaise")}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={buildPath("collectedPaise")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={buildPath("outstandingPaise")}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />

                    {/* Node Points & Hover Touchpoints */}
                    {trendData.map((d, i) => {
                      const expY = getY(d.expectedPaise);
                      const colY = getY(d.collectedPaise);
                      const outY = getY(d.outstandingPaise);
                      const x = getX(i);
                      const isHovered = hoveredTrendIndex === i;

                      return (
                        <g
                          key={i}
                          onMouseEnter={() => setHoveredTrendIndex(i)}
                          className="cursor-pointer"
                        >
                          {/* Vertical indicator line on hover */}
                          {isHovered && (
                            <line
                              x1={x}
                              y1={padT}
                              x2={x}
                              y2={chartH - padB}
                              stroke="#94a3b8"
                              strokeDasharray="2,2"
                              strokeWidth="1"
                            />
                          )}
                          <circle
                            cx={x}
                            cy={expY}
                            r={isHovered ? 4.5 : 2.5}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={x}
                            cy={colY}
                            r={isHovered ? 4.5 : 2.5}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={x}
                            cy={outY}
                            r={isHovered ? 4.5 : 2.5}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Hover Tooltip display */}
                  {hoveredTrendIndex !== null &&
                    trendData[hoveredTrendIndex] && (
                      <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold dark:border-slate-700/60 dark:bg-slate-800/80">
                        <span className="text-slate-600 dark:text-slate-300">
                          Month: {trendData[hoveredTrendIndex].month}
                        </span>
                        <span className="text-blue-600">
                          Exp:{" "}
                          {fmtRupees(
                            trendData[hoveredTrendIndex].expectedPaise
                          )}
                        </span>
                        <span className="text-emerald-600">
                          Col:{" "}
                          {fmtRupees(
                            trendData[hoveredTrendIndex].collectedPaise
                          )}
                        </span>
                        <span className="text-rose-600">
                          Due:{" "}
                          {fmtRupees(
                            trendData[hoveredTrendIndex].outstandingPaise
                          )}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Panel 2: Quick Actions (3 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800/60 dark:text-white">
                  Quick Actions
                </h3>

                {/* 2x2 Grid */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {/* Action 1: Send Fee Reminder */}
                  <button
                    type="button"
                    onClick={handleTriggerFeeReminder}
                    className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-blue-100/60 bg-blue-50/50 p-3.5 text-center transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/60 dark:text-blue-400">
                      <Send className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] leading-tight font-bold text-slate-700 dark:text-slate-200">
                      Send Fee
                      <br />
                      Reminder
                    </span>
                  </button>

                  {/* Action 2: Send Due Alert */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSendWhatsApp();
                    }}
                    className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-100/60 bg-emerald-50/50 p-3.5 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/60 dark:text-emerald-400">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] leading-tight font-bold text-slate-700 dark:text-slate-200">
                      Send Due
                      <br />
                      Alert
                    </span>
                  </button>

                  {/* Action 3: Generate Receipt */}
                  <Link
                    href="/admin/fees/collect"
                    className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-purple-100/60 bg-purple-50/50 p-3.5 text-center transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-purple-900/40 dark:bg-purple-950/20 dark:hover:bg-purple-950/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100/80 text-purple-600 transition-transform group-hover:scale-110 dark:bg-purple-900/60 dark:text-purple-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] leading-tight font-bold text-slate-700 dark:text-slate-200">
                      Generate
                      <br />
                      Receipt
                    </span>
                  </Link>

                  {/* Action 4: Export Report */}
                  <button
                    type="button"
                    onClick={handleExportReport}
                    className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-amber-100/60 bg-amber-50/50 p-3.5 text-center transition-all hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-600 transition-transform group-hover:scale-110 dark:bg-amber-900/60 dark:text-amber-400">
                      <Download className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] leading-tight font-bold text-slate-700 dark:text-slate-200">
                      Export
                      <br />
                      Report
                    </span>
                  </button>
                </div>
              </div>

              {/* Panel 3: Fee Collection by Method (3 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Fee Collection by Method
                  </h3>
                </div>

                {/* Donut Chart & Legend Side by Side */}
                <div className="mt-3 flex items-center justify-between gap-4">
                  {/* Donut Canvas */}
                  <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                    <svg
                      className="h-full w-full -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="14"
                        className="dark:stroke-slate-800"
                      />
                      {donutSegments.map((seg, i) => (
                        <circle
                          key={i}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="14"
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          strokeLinecap="butt"
                          className="transition-all duration-700"
                        />
                      ))}
                    </svg>
                    {/* Center Value */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                        {fmtRupees(data?.metrics.totalCollectedPaise || 0)}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">
                        Total Collected
                      </span>
                    </div>
                  </div>

                  {/* Legend with percentages and amounts */}
                  <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                    {methods.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                          <span className="truncate font-semibold text-slate-600 dark:text-slate-300">
                            {m.method}
                          </span>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5 text-right">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {fmtRupees(m.amountPaise)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({m.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
            ROW 3: TODAY'S COLLECTION | PAYMENT FOLLOW-UP | MONTHLY CLASS OVERVIEW
        ======================================================== */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Column 1: Today's Collection (3 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Today&apos;s Collection
                    </h3>
                  </div>

                  {/* Number and Sparkline Wave */}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {fmtRupees(data?.metrics.todayCollectionPaise || 0)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {data?.metrics.todayPaymentsCount || 0} Payments
                      </p>
                      <p className="mt-1 flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
                        {data?.metrics.todayPercentVsYesterday
                          ? `↑ ${data.metrics.todayPercentVsYesterday}% vs yesterday`
                          : "Live payments"}
                      </p>
                    </div>

                    {/* Green Wave Graphic */}
                    <div className="h-12 w-24 flex-shrink-0">
                      <svg viewBox="0 0 100 40" className="h-full w-full">
                        <defs>
                          <linearGradient
                            id="waveGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity="0.3"
                            />
                            <stop
                              offset="100%"
                              stopColor="#10b981"
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 30 Q 25 35, 50 15 T 100 8 L 100 40 L 0 40 Z"
                          fill="url(#waveGrad)"
                        />
                        <path
                          d="M 0 30 Q 25 35, 50 15 T 100 8"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Link
                    href="/admin/fees/transactions"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span>View Transactions</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Column 2: Payment Follow-up (4 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Payment Follow-up
                      </h3>
                      <p className="text-[11px] font-semibold text-rose-500">
                        {data?.paymentFollowUp.totalNeedAttention || 0} Students
                        need attention
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/fees/defaulters"
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* 4 Status Blocks */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {/* Critical */}
                  <Link
                    href="/admin/fees/defaulters"
                    className="rounded-xl border border-rose-100 bg-rose-50/70 p-2.5 text-center transition-transform hover:scale-105 dark:border-rose-900/40 dark:bg-rose-950/30"
                  >
                    <p className="text-lg font-black text-rose-600">
                      {data?.paymentFollowUp.criticalCount || 0}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-none font-bold text-rose-950 dark:text-rose-200">
                      Critical
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      &gt; 30 days
                    </p>
                  </Link>

                  {/* Overdue */}
                  <Link
                    href="/admin/fees/defaulters"
                    className="rounded-xl border border-orange-100 bg-orange-50/70 p-2.5 text-center transition-transform hover:scale-105 dark:border-orange-900/40 dark:bg-orange-950/30"
                  >
                    <p className="text-lg font-black text-orange-600">
                      {data?.paymentFollowUp.overdueCount || 0}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-none font-bold text-orange-950 dark:text-orange-200">
                      Overdue
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">8-30 days</p>
                  </Link>

                  {/* Due Soon */}
                  <Link
                    href="/admin/fees/defaulters"
                    className="rounded-xl border border-amber-100 bg-amber-50/70 p-2.5 text-center transition-transform hover:scale-105 dark:border-amber-900/40 dark:bg-amber-950/30"
                  >
                    <p className="text-lg font-black text-amber-600">
                      {data?.paymentFollowUp.dueSoonCount || 0}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-none font-bold text-amber-950 dark:text-amber-200">
                      Due Soon
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">1-7 days</p>
                  </Link>

                  {/* On Track */}
                  <Link
                    href="/admin/fees/student-fees"
                    className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 text-center transition-transform hover:scale-105 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                  >
                    <p className="text-lg font-black text-emerald-600">
                      {data?.paymentFollowUp.onTrackCount || 0}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-none font-bold text-emerald-950 dark:text-emerald-200">
                      On Track
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">All good</p>
                  </Link>
                </div>
              </div>

              {/* Column 3: Monthly Collection Overview Heatmap (5 cols) */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Monthly Collection Overview
                    </h3>
                  </div>

                  {/* Year dropdown */}
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>2026-27</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Matrix Heatmap Table */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                        <th className="py-2 text-left font-medium">Class</th>
                        {[
                          "Apr",
                          "May",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dec",
                          "Jan",
                          "Feb",
                          "Mar",
                        ].map((m) => (
                          <th
                            key={m}
                            className="px-1 py-2 text-center font-medium"
                          >
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {(data?.monthlyClassOverview || []).map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-2.5 font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">
                            {row.className}
                          </td>
                          {row.rates.map((rate, rIdx) => {
                            if (rate === null) {
                              return (
                                <td
                                  key={rIdx}
                                  className="py-2.5 text-center font-medium text-slate-300 dark:text-slate-600"
                                >
                                  -
                                </td>
                              );
                            }
                            const isGreen = rate >= 90;
                            const isYellow = rate >= 80 && rate < 90;
                            const isOrange = rate < 80;

                            return (
                              <td
                                key={rIdx}
                                className="px-1 py-2.5 text-center"
                              >
                                <span
                                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    isGreen
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                      : isYellow
                                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                        : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                  }`}
                                >
                                  {rate}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ========================================================
            ROW 4: TOP DEFAULTERS | RECENT COLLECTIONS | FEE MESSAGE PREVIEW
        ======================================================== */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Column 1: Top Defaulters (Overdue) (5 cols) */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Top Defaulters (Overdue)
                    </h3>
                  </div>
                  <Link
                    href="/admin/fees/defaulters"
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Table */}
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                        <th className="px-2 py-2.5 font-medium">#</th>
                        <th className="px-2 py-2.5 font-medium">Student</th>
                        <th className="px-2 py-2.5 font-medium">Class</th>
                        <th className="px-2 py-2.5 font-medium">Due Amount</th>
                        <th className="px-2 py-2.5 font-medium">Overdue</th>
                        <th className="px-2 py-2.5 font-medium">
                          Last Payment
                        </th>
                        <th className="px-2 py-2.5 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(data?.topDefaulters || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-xs text-slate-400"
                          >
                            <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              No overdue defaulters
                            </p>
                            <p className="text-[11px] text-slate-400">
                              All student dues are clear for this selection.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        (data?.topDefaulters || [])
                          .slice(0, 4)
                          .map((def, idx) => {
                            const avatarBg =
                              idx === 0
                                ? "bg-purple-100 text-purple-600"
                                : idx === 1
                                  ? "bg-blue-100 text-blue-600"
                                  : idx === 2
                                    ? "bg-rose-100 text-rose-600"
                                    : "bg-amber-100 text-amber-600";

                            return (
                              <tr
                                key={def.id}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                              >
                                <td className="px-2 py-3 font-mono text-[11px] text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="px-2 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${avatarBg}`}
                                    >
                                      {def.studentName.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="leading-tight font-bold text-slate-900 dark:text-white">
                                        {def.studentName}
                                      </p>
                                      <p className="font-mono text-[10px] text-slate-400">
                                        {def.admissionNumber}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                  {def.className}
                                </td>
                                <td className="px-2 py-3 font-black text-slate-900 dark:text-white">
                                  {fmtRupees(def.dueAmountPaise)}
                                </td>
                                <td className="px-2 py-3 font-bold whitespace-nowrap text-rose-600 dark:text-rose-400">
                                  {def.daysOverdue} days
                                </td>
                                <td className="px-2 py-3 text-[11px] whitespace-nowrap text-slate-500">
                                  {def.lastPaymentDate}
                                </td>
                                <td className="px-2 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* WhatsApp Button */}
                                    <button
                                      type="button"
                                      title="Send WhatsApp Alert"
                                      onClick={() => {
                                        const waMsg = `Dear Parent,\nFee reminder for ${def.studentName} (${def.className}).\nPending fee: ${fmtRupees(def.dueAmountPaise)}.\nKindly clear dues.\n- ${schoolName}`;
                                        const phone = def.phone || "9876543210";
                                        const clean = phone.replace(
                                          /[^0-9]/g,
                                          ""
                                        );
                                        const waPhone =
                                          clean.length === 10
                                            ? `91${clean}`
                                            : clean;
                                        window.open(
                                          `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`,
                                          "_blank"
                                        );
                                      }}
                                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Phone Call / CRM follow-up */}
                                    <button
                                      type="button"
                                      title="Follow-up Call"
                                      onClick={() => {
                                        setFollowUpTarget({
                                          id: def.id,
                                          schoolId,
                                          studentId: def.studentId,
                                          studentName: def.studentName,
                                          admissionNumber: def.admissionNumber,
                                          className: def.className,
                                          sectionName: def.sectionName || "A",
                                          academicYearId: "2026-27",
                                          feeStructureIds: [],
                                          totalAssignedPaise: 0,
                                          totalPaidPaise: 0,
                                          totalDiscountPaise: 0,
                                          totalLateFeePaise: 0,
                                          totalPendingPaise: def.dueAmountPaise,
                                          monthLedger: [],
                                          status: "OVERDUE",
                                          phone: def.phone,
                                          parentPhone: def.parentPhone,
                                          updatedAt: new Date().toISOString(),
                                        });
                                      }}
                                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/50"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Share Fee Modal / Statement */}
                                    <button
                                      type="button"
                                      title="View Statement & Share"
                                      onClick={() => {
                                        setShareModalTarget({
                                          id: def.studentId,
                                          name: def.studentName,
                                          admissionNumber: def.admissionNumber,
                                          className: def.className,
                                          phone: def.phone,
                                          parentPhone: def.parentPhone,
                                        });
                                      }}
                                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-purple-50 text-purple-600 transition-colors hover:bg-purple-100 dark:bg-purple-950/50"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column 2: Recent Collections (3 cols) */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Recent Collections
                    </h3>
                  </div>
                  <Link
                    href="/admin/fees/transactions"
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* List of collections or empty state */}
                <div className="mt-3 space-y-3">
                  {(data?.recentCollections || []).length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <CreditCard className="mx-auto mb-1 h-6 w-6 text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No collections yet
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Payments will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    (data?.recentCollections || [])
                      .slice(0, 5)
                      .map((tx, idx) => {
                        const avatarColors = [
                          "bg-rose-100 text-rose-600",
                          "bg-blue-100 text-blue-600",
                          "bg-purple-100 text-purple-600",
                          "bg-amber-100 text-amber-600",
                          "bg-cyan-100 text-cyan-600",
                        ];
                        const mode = tx.paymentMethod || "UPI";
                        const isUPI = mode.toLowerCase().includes("upi");
                        const isCash = mode.toLowerCase().includes("cash");

                        return (
                          <div
                            key={tx.id || idx}
                            className="flex items-center justify-between gap-3 py-1 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                  avatarColors[idx % avatarColors.length]
                                }`}
                              >
                                {tx.studentName?.charAt(0) || "S"}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate leading-tight font-bold text-slate-900 dark:text-white">
                                  {tx.studentName}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {tx.className}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-shrink-0 items-center gap-2">
                              <span className="font-black text-slate-900 dark:text-white">
                                ₹
                                {(tx.amountPaidPaise / 100).toLocaleString(
                                  "en-IN"
                                )}
                              </span>

                              {/* Mode Badge */}
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  isUPI
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                    : isCash
                                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                      : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                }`}
                              >
                                {isUPI ? "UPI" : isCash ? "Cash" : "Bank"}
                              </span>

                              <span className="font-mono text-[10px] text-slate-400">
                                {tx.createdAt && tx.createdAt.includes(":")
                                  ? tx.createdAt
                                  : "10:42 AM"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Column 3: Fee Message Preview (4 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Fee Message Preview
                    </h3>
                  </div>

                  {/* Message Type Tabs */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMessageType("reminder")}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        messageType === "reminder"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Due Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType("received")}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        messageType === "received"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Payment Received
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType("custom")}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        messageType === "custom"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Message Preview Box */}
                  <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 font-sans text-xs leading-relaxed whitespace-pre-line text-slate-700 shadow-inner dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300">
                    {previewMessageText}
                  </div>
                </div>

                {/* Bottom Actions: Copy & Send on WhatsApp */}
                <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Send on WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================
            MODALS FOR DIRECT ACTIONS
        ======================================================== */}
        {/* Receipt Modal */}
        {selectedReceipt && (
          <FeeReceiptModal
            isOpen={Boolean(selectedReceipt)}
            onClose={() => setSelectedReceipt(null)}
            payment={selectedReceipt}
            schoolName={schoolName}
          />
        )}

        {/* CRM Follow-up Modal */}
        {followUpTarget && (
          <FeeFollowUpModal
            isOpen={Boolean(followUpTarget)}
            onClose={() => setFollowUpTarget(null)}
            schoolId={schoolId}
            assignment={followUpTarget}
            onFollowUpRecorded={() => {
              toast.success("Follow-up logged successfully!");
            }}
          />
        )}

        {/* Share Fee Modal */}
        {shareModalTarget && (
          <ShareFeeModal
            isOpen={Boolean(shareModalTarget)}
            onClose={() => setShareModalTarget(null)}
            schoolId={schoolId}
            student={shareModalTarget}
            initialMode="PAYMENT_REMINDER"
          />
        )}
      </div>
    </EntitlementGate>
  );
}
