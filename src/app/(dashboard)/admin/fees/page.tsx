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
} from "lucide-react";
import {
  getFeeDashboardOverviewData,
  getFeeSettings,
  type FeeDashboardOverviewData,
} from "@/lib/services/fee.service";
import { getClassesWithSections, getAcademicYears } from "@/lib/services/academic.service";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { FeeFollowUpModal } from "@/components/fees/FeeFollowUpModal";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import type { SchoolClass, FeePayment, StudentFeeAssignment, AcademicYear } from "@/types";
import { toast } from "sonner";

export default function AdminFeeDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName =
    (profile as any)?.schoolName || "Lord Buddha Public School";

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [data, setData] = useState<FeeDashboardOverviewData | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState("September 2026");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [trendView, setTrendView] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [messageType, setMessageType] = useState<"reminder" | "received" | "custom">("reminder");
  const [copied, setCopied] = useState(false);

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<FeePayment | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<StudentFeeAssignment | null>(null);
  const [shareModalTarget, setShareModalTarget] = useState<any | null>(null);

  // Tooltip state for Collection Trend chart
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(5); // Default Sep

  // 1. Load Academic Years & Classes on initial mount
  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      getAcademicYears(schoolId),
      getClassesWithSections(schoolId),
    ])
      .then(([years, classList]) => {
        setAcademicYears(years);
        setClasses(classList);
        const currentYear = years.find((y) => y.isCurrent) || years[0];
        if (currentYear && !selectedYear) {
          setSelectedYear(currentYear.id);
        }
      })
      .catch((err) => console.error("Failed to load initial fee metadata:", err));
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
          month: selectedMonth,
          className: selectedClass,
          sectionName: selectedSection,
        });
        setData(dashData);
      } catch (err: any) {
        console.error("Failed to load fee dashboard:", err);
        setFilterError(err?.message || "Failed to load fee data for the selected filters.");
      } finally {
        setLoading(false);
        setIsUpdating(false);
      }
    }
    loadData();
  }, [schoolId, selectedYear, selectedMonth, selectedClass, selectedSection]);

  const fmtRupees = (paise: number) =>
    "₹" +
    (paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const availableSections = useMemo(() => {
    if (selectedClass === "all") return [];
    const cls = classes.find((c) => c.name === selectedClass || c.id === selectedClass);
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
    const phone = previewStudent?.phone || previewStudent?.parentPhone || "9876543210";
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
        `Today's Collection,${fmtRupees(data.metrics.todayCollectionPaise)}`,
        `Defaulters Count,${data.metrics.defaultersCount}`,
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Summary_${selectedMonth.replace(/\s+/g, "_")}.csv`);
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

  const getX = (idx: number) => padL + (idx / Math.max(trendData.length - 1, 1)) * innerW;
  const getY = (val: number) => padT + innerH - (Math.min(val, maxPaise) / maxPaise) * innerH;

  const buildPath = (key: "expectedPaise" | "collectedPaise" | "outstandingPaise") => {
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
  let accumulatedPct = 0;
  const donutSegments = methods.map((m) => {
    const strokeDasharray = `${(m.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += m.percentage;
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
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{filterError}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setFilterError(null);
                getFeeDashboardOverviewData(schoolId, {
                  academicYearId: selectedYear || undefined,
                  month: selectedMonth,
                  className: selectedClass,
                  sectionName: selectedSection,
                })
                  .then((d) => setData(d))
                  .catch((err) => setFilterError(err?.message || "Failed to reload fee data"))
                  .finally(() => setLoading(false));
              }}
              className="px-3 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold hover:bg-amber-300 transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================
            TOP BAR / PAGE HEADER
        ======================================================== */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 relative">
              <CreditCard className="w-6 h-6" />
              {isUpdating && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Fee Management
                </h1>
                {isUpdating && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/50">
                    <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name || ay.id} {ay.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
                <option value="July 2026">July 2026</option>
                <option value="June 2026">June 2026</option>
                <option value="May 2026">May 2026</option>
                <option value="April 2026">April 2026</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Class Selector */}
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("all");
                }}
                className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Section Selector */}
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={selectedClass === "all"}
                className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <option value="all">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Student Ledger Link */}
            <Link
              href="/admin/fees/ledger"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Student Ledger</span>
            </Link>

            {/* Cash & Bank Link */}
            <Link
              href="/admin/fees/cash-bank"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Cash & Bank</span>
            </Link>

            {/* Accounting & Trial Balance Link */}
            <Link
              href="/admin/fees/accounting"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Accounting & TB</span>
            </Link>

            {/* + Collect Fee CTA */}
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Collect Fee</span>
            </Link>
          </div>
        </div>

        {/* ========================================================
            DASHBOARD CONTENT / SKELETON
        ======================================================== */}
        {loading && !data ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            </div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          </div>
        ) : (
          <>
        {/* ========================================================
            ROW 1: 4 KEY METRIC CARDS (KPIs)
        ======================================================== */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${isUpdating ? "opacity-70" : "opacity-100"}`}>
          {/* Card 1: Total Expected */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              {/* Mini Blue Bars Sparkline */}
              <div className="flex items-end gap-1 h-8">
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
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                {fmtRupees(data?.metrics.totalExpectedPaise || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                For {selectedMonth}
              </p>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              {/* Mini Emerald Bars Sparkline */}
              <div className="flex items-end gap-1 h-8">
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
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                {fmtRupees(data?.metrics.totalCollectedPaise || 0)}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-1">
                <span>
                  {data?.metrics.collectedPercentVsLastMonth
                    ? `↑ ${data.metrics.collectedPercentVsLastMonth}%`
                    : "Live"}
                </span>
                <span className="font-normal text-slate-400"> collections</span>
              </p>
            </div>
          </div>

          {/* Card 3: Outstanding */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              {/* Mini Rose Bars Sparkline */}
              <div className="flex items-end gap-1 h-8">
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
              <p className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {fmtRupees(data?.metrics.totalPendingPaise || 0)}
              </p>
              <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400 mt-1">
                {data?.metrics.defaultersCount || 0} students due
              </p>
            </div>
          </div>

          {/* Card 4: Collection Rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              {/* Mini Purple Bars Sparkline */}
              <div className="flex items-end gap-1 h-8">
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
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                {data?.metrics.collectionRate || 0}%
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Target: 90%
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            ROW 2: COLLECTION TREND | QUICK ACTIONS | PAYMENT METHOD
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Panel 1: Collection Trend (6 cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Collection Trend
                </h3>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Collected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Outstanding
                </span>
              </div>

              {/* Monthly / Quarterly / Yearly toggle */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
                {(["monthly", "quarterly", "yearly"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setTrendView(view)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                      trendView === view
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart Area */}
            <div className="mt-3 relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-44 select-none"
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
                        className="text-[10px] fill-slate-400 font-mono"
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
              {hoveredTrendIndex !== null && trendData[hoveredTrendIndex] && (
                <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-semibold mt-1">
                  <span className="text-slate-600 dark:text-slate-300">
                    Month: {trendData[hoveredTrendIndex].month}
                  </span>
                  <span className="text-blue-600">
                    Exp: {fmtRupees(trendData[hoveredTrendIndex].expectedPaise)}
                  </span>
                  <span className="text-emerald-600">
                    Col: {fmtRupees(trendData[hoveredTrendIndex].collectedPaise)}
                  </span>
                  <span className="text-rose-600">
                    Due: {fmtRupees(trendData[hoveredTrendIndex].outstandingPaise)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Panel 2: Quick Actions (3 cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/60">
              Quick Actions
            </h3>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Action 1: Send Fee Reminder */}
              <button
                type="button"
                onClick={handleTriggerFeeReminder}
                className="group p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/40 flex flex-col items-center justify-center text-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  Send Fee<br />Reminder
                </span>
              </button>

              {/* Action 2: Send Due Alert */}
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsApp();
                }}
                className="group p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 flex flex-col items-center justify-center text-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  Send Due<br />Alert
                </span>
              </button>

              {/* Action 3: Generate Receipt */}
              <Link
                href="/admin/fees/collect"
                className="group p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/40 flex flex-col items-center justify-center text-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100/80 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  Generate<br />Receipt
                </span>
              </Link>

              {/* Action 4: Export Report */}
              <button
                type="button"
                onClick={handleExportReport}
                className="group p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40 flex flex-col items-center justify-center text-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  Export<br />Report
                </span>
              </button>
            </div>
          </div>

          {/* Panel 3: Fee Collection by Method (3 cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Fee Collection by Method
              </h3>
            </div>

            {/* Donut Chart & Legend Side by Side */}
            <div className="flex items-center justify-between gap-4 mt-3">
              {/* Donut Canvas */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {fmtRupees(data?.metrics.totalCollectedPaise || 0)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    Total Collected
                  </span>
                </div>
              </div>

              {/* Legend with percentages and amounts */}
              <div className="space-y-1.5 flex-1 min-w-0 text-xs">
                {methods.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-300 font-semibold truncate">
                        {m.method}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {fmtRupees(m.amountPaise)}
                      </span>
                      <span className="text-slate-400 text-[10px]">({m.percentage}%)</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Today's Collection (3 cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Today's Collection
                </h3>
              </div>

              {/* Number and Sparkline Wave */}
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {fmtRupees(data?.metrics.todayCollectionPaise || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {data?.metrics.todayPaymentsCount || 0} Payments
                  </p>
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                    {data?.metrics.todayPercentVsYesterday
                      ? `↑ ${data.metrics.todayPercentVsYesterday}% vs yesterday`
                      : "Live payments"}
                  </p>
                </div>

                {/* Green Wave Graphic */}
                <div className="w-24 h-12 flex-shrink-0">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
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

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/admin/fees/transactions"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>View Transactions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Column 2: Payment Follow-up (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Payment Follow-up
                  </h3>
                  <p className="text-[11px] font-semibold text-rose-500">
                    {data?.paymentFollowUp.totalNeedAttention || 0} Students need attention
                  </p>
                </div>
              </div>
              <Link
                href="/admin/fees/defaulters"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 4 Status Blocks */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {/* Critical */}
              <Link
                href="/admin/fees/defaulters"
                className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center hover:scale-105 transition-transform"
              >
                <p className="text-lg font-black text-rose-600">
                  {data?.paymentFollowUp.criticalCount || 0}
                </p>
                <p className="text-[11px] font-bold text-rose-950 dark:text-rose-200 leading-none mt-0.5">
                  Critical
                </p>
                <p className="text-[9px] text-slate-400 mt-1">&gt; 30 days</p>
              </Link>

              {/* Overdue */}
              <Link
                href="/admin/fees/defaulters"
                className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 text-center hover:scale-105 transition-transform"
              >
                <p className="text-lg font-black text-orange-600">
                  {data?.paymentFollowUp.overdueCount || 0}
                </p>
                <p className="text-[11px] font-bold text-orange-950 dark:text-orange-200 leading-none mt-0.5">
                  Overdue
                </p>
                <p className="text-[9px] text-slate-400 mt-1">8-30 days</p>
              </Link>

              {/* Due Soon */}
              <Link
                href="/admin/fees/defaulters"
                className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center hover:scale-105 transition-transform"
              >
                <p className="text-lg font-black text-amber-600">
                  {data?.paymentFollowUp.dueSoonCount || 0}
                </p>
                <p className="text-[11px] font-bold text-amber-950 dark:text-amber-200 leading-none mt-0.5">
                  Due Soon
                </p>
                <p className="text-[9px] text-slate-400 mt-1">1-7 days</p>
              </Link>

              {/* On Track */}
              <Link
                href="/admin/fees/student-fees"
                className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center hover:scale-105 transition-transform"
              >
                <p className="text-lg font-black text-emerald-600">
                  {data?.paymentFollowUp.onTrackCount || 0}
                </p>
                <p className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 leading-none mt-0.5">
                  On Track
                </p>
                <p className="text-[9px] text-slate-400 mt-1">All good</p>
              </Link>
            </div>
          </div>

          {/* Column 3: Monthly Collection Overview Heatmap (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Collection Overview
                </h3>
              </div>

              {/* Year dropdown */}
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>2026-27</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Matrix Heatmap Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 text-left font-medium">Class</th>
                    {["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map(
                      (m) => (
                        <th key={m} className="py-2 text-center font-medium px-1">
                          {m}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {(data?.monthlyClassOverview || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.className}
                      </td>
                      {row.rates.map((rate, rIdx) => {
                        if (rate === null) {
                          return (
                            <td key={rIdx} className="py-2.5 text-center text-slate-300 dark:text-slate-600 font-medium">
                              -
                            </td>
                          );
                        }
                        const isGreen = rate >= 90;
                        const isYellow = rate >= 80 && rate < 90;
                        const isOrange = rate < 80;

                        return (
                          <td key={rIdx} className="py-2.5 text-center px-1">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isGreen
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                  : isYellow
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Top Defaulters (Overdue) (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top Defaulters (Overdue)
                </h3>
              </div>
              <Link
                href="/admin/fees/defaulters"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Table */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-2 font-medium">#</th>
                    <th className="py-2.5 px-2 font-medium">Student</th>
                    <th className="py-2.5 px-2 font-medium">Class</th>
                    <th className="py-2.5 px-2 font-medium">Due Amount</th>
                    <th className="py-2.5 px-2 font-medium">Overdue</th>
                    <th className="py-2.5 px-2 font-medium">Last Payment</th>
                    <th className="py-2.5 px-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(data?.topDefaulters || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No overdue defaulters</p>
                        <p className="text-[11px] text-slate-400">All student dues are clear for this selection.</p>
                      </td>
                    </tr>
                  ) : (
                    (data?.topDefaulters || []).slice(0, 4).map((def, idx) => {
                      const avatarBg =
                        idx === 0
                          ? "bg-purple-100 text-purple-600"
                          : idx === 1
                          ? "bg-blue-100 text-blue-600"
                          : idx === 2
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-600";

                      return (
                        <tr key={def.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${avatarBg}`}
                              >
                                {def.studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {def.studentName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {def.admissionNumber}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                            {def.className}
                          </td>
                          <td className="py-3 px-2 font-black text-slate-900 dark:text-white">
                            {fmtRupees(def.dueAmountPaise)}
                          </td>
                          <td className="py-3 px-2 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {def.daysOverdue} days
                          </td>
                          <td className="py-3 px-2 text-slate-500 whitespace-nowrap text-[11px]">
                            {def.lastPaymentDate}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Button */}
                              <button
                                type="button"
                                title="Send WhatsApp Alert"
                                onClick={() => {
                                  const waMsg = `Dear Parent,\nFee reminder for ${def.studentName} (${def.className}).\nPending fee: ${fmtRupees(def.dueAmountPaise)}.\nKindly clear dues.\n- ${schoolName}`;
                                  const phone = def.phone || "9876543210";
                                  const clean = phone.replace(/[^0-9]/g, "");
                                  const waPhone = clean.length === 10 ? `91${clean}` : clean;
                                  window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`, "_blank");
                                }}
                                className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
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
                                className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
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
                                className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
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
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Collections
                </h3>
              </div>
              <Link
                href="/admin/fees/transactions"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* List of collections or empty state */}
            <div className="mt-3 space-y-3">
              {(data?.recentCollections || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CreditCard className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No collections yet</p>
                  <p className="text-[11px] text-slate-400">Payments will appear here in real-time.</p>
                </div>
              ) : (
                (data?.recentCollections || []).slice(0, 5).map((tx, idx) => {
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
                    className="flex items-center justify-between gap-3 text-xs py-1"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                          avatarColors[idx % avatarColors.length]
                        }`}
                      >
                        {tx.studentName?.charAt(0) || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate leading-tight">
                          {tx.studentName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {tx.className}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-slate-900 dark:text-white">
                        ₹{(tx.amountPaidPaise / 100).toLocaleString("en-IN")}
                      </span>

                      {/* Mode Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isUPI
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : isCash
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                        }`}
                      >
                        {isUPI ? "UPI" : isCash ? "Cash" : "Bank"}
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {tx.createdAt && tx.createdAt.includes(":")
                          ? tx.createdAt
                          : "10:42 AM"}
                      </span>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Column 3: Fee Message Preview (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Fee Message Preview
                </h3>
              </div>

              {/* Message Type Tabs */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setMessageType("reminder")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    messageType === "reminder"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Due Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType("received")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    messageType === "received"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Payment Received
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType("custom")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    messageType === "custom"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Message Preview Box */}
              <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-line shadow-inner">
                {previewMessageText}
              </div>
            </div>

            {/* Bottom Actions: Copy & Send on WhatsApp */}
            <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
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
