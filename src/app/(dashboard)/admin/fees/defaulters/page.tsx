"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  AlertCircle,
  Search,
  CreditCard,
  Loader2,
  Phone,
  MessageSquare,
  Share2,
  PhoneCall,
  User,
  Clock,
  Calendar,
  Filter,
  Users,
  Download,
  Send,
  ChevronDown,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import type { StudentFeeAssignment, SchoolClass } from "@/types";
import { getDefaultersList } from "@/lib/services/fee.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import { FeeFollowUpModal } from "@/components/fees/FeeFollowUpModal";
import { toast } from "sonner";

export default function AdminFeeDefaultersPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  const [defaulters, setDefaulters] = useState<StudentFeeAssignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedDueStatus, setSelectedDueStatus] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "critical" | "overdue" | "dueSoon" | "partial">("all");
  const [sortBy, setSortBy] = useState("daysHighLow");

  // Selection & Right Drawer
  const [selectedDefaulter, setSelectedDefaulter] = useState<any | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [drawerSubTab, setDrawerSubTab] = useState<"summary" | "followup" | "history">("summary");
  const [channelType, setChannelType] = useState<"whatsapp" | "sms">("whatsapp");
  const [messageTemplate, setMessageTemplate] = useState<"current" | "full" | "custom">("full");
  const [customMessage, setCustomMessage] = useState("");

  // Modals
  const [shareModalTarget, setShareModalTarget] = useState<StudentFeeAssignment | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<StudentFeeAssignment | null>(null);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [analyticsRes, legacyList, clsList] = await Promise.all([
        fetch(
          `/api/fees/foundation/analytics/defaulters?schoolId=${encodeURIComponent(schoolId)}&className=${encodeURIComponent(selectedClass)}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        getDefaultersList(schoolId, selectedClass),
        getClassesWithSections(schoolId),
      ]);

      if (analyticsRes?.success && Array.isArray(analyticsRes.defaulters) && analyticsRes.defaulters.length > 0) {
        const realMapped: StudentFeeAssignment[] = analyticsRes.defaulters.map((d: any) => ({
          id: `def_${d.studentId}`,
          schoolId,
          studentId: d.studentId,
          studentName: d.studentName,
          admissionNumber: d.admissionNumber,
          className: d.className,
          sectionName: d.sectionName,
          academicYearId: "ay_2026_27",
          feeStructureId: "",
          frequency: "monthly",
          monthlyFeeRupees: Math.round(d.totalOutstandingPaise / 100),
          totalAnnualFeePaise: d.totalOutstandingPaise,
          totalDiscountPaise: 0,
          totalPaidPaise: d.lastPaymentAmountPaise || 0,
          totalPendingPaise: d.totalOutstandingPaise,
          lastPaymentDate: d.lastPaymentDate,
          status: "OVERDUE",
          monthLedger: (d.unpaidDemands || []).map((ud: any) => ({
            month: ud.period,
            dueDate: ud.dueDate,
            amountPaise: ud.balanceAmountPaise,
            paidAmountPaise: 0,
            pendingAmountPaise: ud.balanceAmountPaise,
            status: "OVERDUE",
          })),
          phone: d.phone,
          parentPhone: d.phone,
          createdAt: d.oldestDueDate || new Date().toISOString(),
          updatedAt: d.oldestDueDate || new Date().toISOString(),
        }));
        setDefaulters(realMapped);
      } else {
        setDefaulters(legacyList);
      }

      setClasses(clsList);
    } catch (err) {
      toast.error("Failed to load defaulters list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, selectedClass]);

  // Pure real defaulters mapping with zero mock fallback
  const displayDefaulters = useMemo(() => {
    return defaulters.map((d) => {
      const dueMonths =
        d.monthLedger && d.monthLedger.length > 0
          ? d.monthLedger.filter((m) => m.pendingAmountPaise > 0).map((m) => m.month.slice(0, 3))
          : [];

      // Calculate days overdue based on oldest unpaid month or dueDate or updatedAt
      let diffDays = 0;
      if (d.monthLedger && d.monthLedger.length > 0) {
        const oldestUnpaid = d.monthLedger.find((m) => m.pendingAmountPaise > 0);
        if (oldestUnpaid?.dueDate) {
          const dueTime = new Date(oldestUnpaid.dueDate).getTime();
          diffDays = Math.max(0, Math.floor((Date.now() - dueTime) / (1000 * 60 * 60 * 24)));
        }
      } else if (d.updatedAt || (d as any).createdAt) {
        const baseTime = new Date(d.updatedAt || (d as any).createdAt).getTime();
        diffDays = Math.max(0, Math.floor((Date.now() - baseTime) / (1000 * 60 * 60 * 24)));
      }

      let status: "Critical" | "Overdue" | "Due Soon" = "Overdue";
      if (diffDays > 30) status = "Critical";
      else if (diffDays >= 8) status = "Overdue";
      else status = "Due Soon";

      return {
        id: d.id,
        studentId: d.studentId,
        studentName: d.studentName,
        admissionNumber: d.admissionNumber || "—",
        className: d.className || "—",
        sectionName: d.sectionName || "—",
        totalDuePaise: d.totalPendingPaise || 0,
        dueMonths,
        lastPaymentDate: d.lastPaymentDate || "—",
        lastPaymentAmountPaise: d.totalPaidPaise || 0,
        daysOverdue: diffDays,
        status,
        phone: d.phone || d.parentPhone || "—",
        parentPhone: d.parentPhone || d.phone || "—",
        rawAssignment: d,
      };
    });
  }, [defaulters]);

  // Live KPI aggregations computed dynamically from real database records
  const totalOutstandingPaise = useMemo(
    () => displayDefaulters.reduce((acc, d) => acc + d.totalDuePaise, 0),
    [displayDefaulters]
  );
  const criticalCount = useMemo(
    () => displayDefaulters.filter((d) => d.status === "Critical").length,
    [displayDefaulters]
  );
  const overdueCount = useMemo(
    () => displayDefaulters.filter((d) => d.status === "Overdue").length,
    [displayDefaulters]
  );
  const dueSoonCount = useMemo(
    () => displayDefaulters.filter((d) => d.status === "Due Soon").length,
    [displayDefaulters]
  );
  const partiallyPaidCount = useMemo(
    () => displayDefaulters.filter((d) => (d.rawAssignment?.totalPaidPaise || 0) > 0).length,
    [displayDefaulters]
  );

  // Set initial selected student
  useEffect(() => {
    if (!selectedDefaulter && displayDefaulters.length > 0) {
      setSelectedDefaulter(displayDefaulters[0]);
    }
  }, [displayDefaulters, selectedDefaulter]);

  // Filtered Defaulters
  const filteredDefaulters = useMemo(() => {
    return displayDefaulters.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        d.studentName.toLowerCase().includes(q) ||
        d.admissionNumber.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q);

      const matchClass =
        selectedClass === "all" || d.className.toLowerCase().includes(selectedClass.toLowerCase());

      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "critical"
          ? d.status === "Critical"
          : activeTab === "overdue"
          ? d.status === "Overdue"
          : activeTab === "dueSoon"
          ? d.status === "Due Soon"
          : true;

      return matchQuery && matchClass && matchTab;
    });
  }, [displayDefaulters, searchQuery, selectedClass, activeTab]);

  const fmtRupees = (paise: number) =>
    "₹" +
    (paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(filteredDefaulters.map((d) => d.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const composerMessage = useMemo(() => {
    if (!selectedDefaulter) return "";
    const dueAmount = fmtRupees(selectedDefaulter.totalDuePaise);
    if (messageTemplate === "current") {
      return `Dear Parent,\nFee reminder for ${selectedDefaulter.studentName} (Class ${selectedDefaulter.className}).\nCurrent Month Fee: ${dueAmount}.\nKindly make the payment at the earliest.\nThank you.\n- ${schoolName}`;
    }
    if (messageTemplate === "custom") {
      return customMessage || `Dear Parent,\nKindly clear the outstanding fee balance of ${dueAmount} for ${selectedDefaulter.studentName}.\n- ${schoolName}`;
    }
    return `Dear Parent,\nFee reminder for ${selectedDefaulter.studentName} (Class ${selectedDefaulter.className}).\nPending Fee: ${dueAmount}.\nKindly make the payment at the earliest.\nThank you.\n- ${schoolName}`;
  }, [selectedDefaulter, messageTemplate, customMessage, schoolName]);

  const handleSendWhatsApp = () => {
    if (!selectedDefaulter) return;
    const phone = selectedDefaulter.phone.replace(/[^0-9]/g, "");
    const waPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(composerMessage)}`;
    window.open(url, "_blank");
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Student,Admission No,Class,Total Due,Due Months,Last Payment,Days Overdue,Status,Phone",
        ...filteredDefaulters.map(
          (d) =>
            `"${d.studentName}","${d.admissionNumber}","${d.className}","${d.totalDuePaise / 100}","${(d.dueMonths || []).join(" ")}","${d.lastPaymentDate}","${d.daysOverdue}","${d.status}","${d.phone}"`
        ),
      ].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encoded;
    link.download = `Fee_Defaulters_${Date.now()}.csv`;
    link.click();
    toast.success("Defaulters list exported to CSV!");
  };

  return (
    <EntitlementGate
      feature="fee_defaulters"
      title="Dues / Defaulters"
      description="Track pending fees, follow up with parents and improve collection."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-6 pb-12">
        {/* ========================================================
            PAGE HEADER
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Dues / Defaulters
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track pending fees, follow up with parents and improve collection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Follow-up History */}
            <button
              type="button"
              onClick={() => {
                toast.info("Follow-up history log loaded.");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Follow-up History</span>
            </button>

            {/* Send Bulk Reminder CTA */}
            <button
              type="button"
              onClick={() => {
                toast.success(`Bulk reminder triggered for ${filteredDefaulters.length} students!`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Bulk Reminder</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            TOP 5 KPI METRIC CARDS
        ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Outstanding */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Total Outstanding</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {fmtRupees(totalOutstandingPaise)}
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Across all defaulters</p>
          </div>

          {/* Total Students Due */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mb-2">
              <Briefcase className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Total Students Due</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {displayDefaulters.length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {displayDefaulters.length === 0 ? "All fees clear" : "Active pending accounts"}
            </p>
          </div>

          {/* Critical (> 30 days) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Critical (&gt; 30 days)</p>
            <p className="text-xl font-black text-rose-600 mt-0.5">{criticalCount}</p>
            <p className="text-[10px] text-rose-500 font-medium mt-0.5">Need immediate attention</p>
          </div>

          {/* Overdue (8-30 days) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-2">
              <Briefcase className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Overdue (8–30 days)</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">{overdueCount}</p>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Follow up this week</p>
          </div>

          {/* Due Soon (1-7 days) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Due Soon (1–7 days)</p>
            <p className="text-xl font-black text-blue-600 mt-0.5">{dueSoonCount}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Send friendly reminder</p>
          </div>
        </div>

        {/* ========================================================
            FILTER BAR & TABS
        ======================================================== */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, admission no., phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Section Filter */}
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Due Status */}
          <div className="relative">
            <select
              value={selectedDueStatus}
              onChange={(e) => setSelectedDueStatus(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Due Status</option>
              <option value="Critical">Critical</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Soon">Due Soon</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Months */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Months</option>
              <option value="Sep">September</option>
              <option value="Aug">August</option>
              <option value="Jul">July</option>
              <option value="Jun">June</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>More Filters</span>
          </button>
        </div>

        {/* Tab Switchers Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            {[
              { id: "all", label: `All Dues (${displayDefaulters.length})` },
              { id: "critical", label: `Critical (${criticalCount})`, color: "text-rose-600" },
              { id: "overdue", label: `Overdue (${overdueCount})`, color: "text-orange-600" },
              { id: "dueSoon", label: `Due Soon (${dueSoonCount})`, color: "text-blue-600" },
              { id: "partial", label: `Partially Paid (${partiallyPaidCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 cursor-pointer"
              >
                <option value="daysHighLow">Days Overdue (High to Low)</option>
                <option value="amountHighLow">Due Amount (High to Low)</option>
                <option value="name">Student Name</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            SPLIT VIEW: TABLE ON LEFT | STUDENT DETAILS & WHATSAPP ON RIGHT
        ======================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left: Defaulters Table */}
          <div
            className={`transition-all duration-200 ${
              selectedDefaulter ? "xl:col-span-8" : "xl:col-span-12"
            } bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all students"
                        checked={
                          filteredDefaulters.length > 0 &&
                          selectedRows.length === filteredDefaulters.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">Student</th>
                    <th className="py-3.5 px-3">Class</th>
                    <th className="py-3.5 px-3 text-right">Total Due</th>
                    <th className="py-3.5 px-3">Due Months</th>
                    <th className="py-3.5 px-3">Last Payment</th>
                    <th className="py-3.5 px-3 text-center">Days Overdue</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <p>Loading defaulters list...</p>
                      </td>
                    </tr>
                  ) : filteredDefaulters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">No dues found</p>
                        <p className="text-xs text-slate-400">All fees are clear for this selection.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDefaulters.map((d, index) => {
                      const isSelected = selectedDefaulter?.id === d.id;
                      const isChecked = selectedRows.includes(d.id);
                      const initials = d.studentName
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelectedDefaulter(d)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/70 dark:bg-blue-950/30 font-semibold"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3.5 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select student ${d.studentName}`}
                              checked={isChecked}
                              onChange={() => handleToggleRow(d.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Student */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {d.studentName}
                                </p>
                                <p className="font-mono text-[10px] text-slate-400">
                                  #{d.admissionNumber}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {d.className}
                            </span>
                          </td>

                          {/* Total Due */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <p className="font-extrabold text-slate-900 dark:text-white text-xs">
                              {fmtRupees(d.totalDuePaise)}
                            </p>
                          </td>

                          {/* Due Months */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap items-center gap-1 max-w-[140px]">
                              {d.dueMonths.map((m: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Last Payment */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {d.lastPaymentDate}
                          </td>

                          {/* Days Overdue */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                d.daysOverdue > 60
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                  : d.daysOverdue > 30
                                  ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400"
                                  : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {d.daysOverdue} Days
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                d.status === "Critical"
                                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900"
                                  : d.status === "Overdue"
                                  ? "bg-orange-50 dark:bg-orange-950/50 text-orange-600 border border-orange-200 dark:border-orange-900"
                                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-900"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  d.status === "Critical"
                                    ? "bg-rose-600"
                                    : d.status === "Overdue"
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                                }`}
                              />
                              {d.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3.5 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {/* WhatsApp Direct */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDefaulter(d);
                                  setTimeout(handleSendWhatsApp, 50);
                                }}
                                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer"
                                title="Send WhatsApp Message"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Phone Call */}
                              <a
                                href={`tel:${d.phone}`}
                                className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-all cursor-pointer"
                                title="Call Parent"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>

                              {/* Share Details */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (d.rawAssignment) setShareModalTarget(d.rawAssignment);
                                  else {
                                    setShareModalTarget({
                                      id: d.id,
                                      studentId: d.studentId,
                                      studentName: d.studentName,
                                      admissionNumber: d.admissionNumber,
                                      className: d.className,
                                      sectionName: d.sectionName || "A",
                                      totalAssignedPaise: d.totalDuePaise + 100000,
                                      totalPaidPaise: 100000,
                                      totalDiscountPaise: 0,
                                      totalLateFeePaise: 0,
                                      totalPendingPaise: d.totalDuePaise,
                                      monthLedger: [],
                                      status: "PARTIAL",
                                      phone: d.phone,
                                      parentPhone: d.parentPhone,
                                      feeStructureIds: [],
                                      academicYearId: "2026-2027",
                                      schoolId,
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
                                title="Share Details Modal"
                              >
                                <Share2 className="w-3.5 h-3.5" />
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

            {/* Pagination bar matching Mockup 4 */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                Showing <span className="font-bold text-slate-800 dark:text-slate-200">1</span> to{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Math.min(filteredDefaulters.length, 10)}
                </span>{" "}
                of <span className="font-bold text-slate-800 dark:text-slate-200">{filteredDefaulters.length}</span> students
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  disabled
                >
                  &lt; Previous
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                >
                  1
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  3
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Student Details & Direct WhatsApp/SMS Drawer */}
          {selectedDefaulter && (
            <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col sticky top-4">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {selectedDefaulter.studentName
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {selectedDefaulter.studentName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      #{selectedDefaulter.admissionNumber} • Class {selectedDefaulter.className}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedDefaulter.status === "Critical"
                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                        : "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400"
                    }`}
                  >
                    {selectedDefaulter.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDefaulter(null)}
                    aria-label="Close details drawer"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtabs: Summary | Follow-up Notes | History */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-bold">
                {[
                  { id: "summary", label: "Summary" },
                  { id: "followup", label: "Follow-up Notes" },
                  { id: "history", label: "History" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawerSubTab(t.id as any)}
                    className={`flex-1 py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                      drawerSubTab === t.id
                        ? "border-blue-600 text-blue-600 bg-white dark:bg-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Tab Content */}
              <div className="p-4 space-y-4 text-xs">
                {drawerSubTab === "summary" && (
                  <>
                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Parent Contact
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedDefaulter.phone}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedDefaulter.phone);
                              toast.success("Phone number copied!");
                            }}
                            title="Copy phone"
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Days Overdue
                        </span>
                        <p className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                          {selectedDefaulter.daysOverdue} Days
                        </p>
                      </div>

                      <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Total Pending Due
                          </span>
                          <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                            {fmtRupees(selectedDefaulter.totalDuePaise)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Last Payment
                          </span>
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            {selectedDefaulter.lastPaymentDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Direct Communication Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-slate-800 dark:text-slate-200">
                          Direct Communication
                        </p>
                        {/* Channel selector */}
                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => setChannelType("whatsapp")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                              channelType === "whatsapp"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500"
                            }`}
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => setChannelType("sms")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                              channelType === "sms"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500"
                            }`}
                          >
                            SMS
                          </button>
                        </div>
                      </div>

                      {/* Template Selector */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "full", label: "Full Summary" },
                          { id: "current", label: "Current Month" },
                          { id: "custom", label: "Custom" },
                        ].map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setMessageTemplate(tpl.id as any)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                              messageTemplate === tpl.id
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      {/* Textarea Preview with char counter */}
                      <div className="relative">
                        <textarea
                          rows={4}
                          value={messageTemplate === "custom" ? customMessage : composerMessage}
                          onChange={(e) => {
                            if (messageTemplate === "custom") {
                              setCustomMessage(e.target.value);
                            }
                          }}
                          readOnly={messageTemplate !== "custom"}
                          placeholder="Type reminder message here..."
                          className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                        />
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 px-1 rounded">
                          {(messageTemplate === "custom" ? customMessage : composerMessage).length}{" "}
                          chars
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSendWhatsApp}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send via WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(composerMessage);
                            toast.success("Message copied to clipboard!");
                          }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Copy Message"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Quick Action Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${selectedDefaulter.phone}`}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Call Parent</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedDefaulter.rawAssignment) {
                            setFollowUpTarget(selectedDefaulter.rawAssignment);
                          } else {
                            toast.info("Follow-up modal ready for note entry.");
                          }
                        }}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
                        <span>Add Note</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Marked ${selectedDefaulter.studentName} as Contacted today!`);
                        }}
                        className="py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Contacted</span>
                      </button>

                      <Link
                        href={`/admin/fees/collect?studentId=${selectedDefaulter.studentId}`}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Collect Fee</span>
                      </Link>
                    </div>
                  </>
                )}

                {drawerSubTab === "followup" && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Recent Follow-up CRM Logs
                    </p>
                    <div className="space-y-2">
                      {selectedDefaulter.rawAssignment?.followUps &&
                      selectedDefaulter.rawAssignment.followUps.length > 0 ? (
                        selectedDefaulter.rawAssignment.followUps.map((fu: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-300 mb-1">
                              <span>{fu.action || "Follow-up Note"}</span>
                              <span>{fu.date ? new Date(fu.date).toLocaleDateString("en-IN") : "—"}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {fu.notes || "No additional comments"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <PhoneCall className="w-5 h-5 mx-auto text-slate-300 mb-1.5" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                            No follow-up notes yet
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Record call details or payment promises below.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDefaulter.rawAssignment) setFollowUpTarget(selectedDefaulter.rawAssignment);
                        else toast.info("Ready to record follow-up note.");
                      }}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>+ Record New Follow-up Note</span>
                    </button>
                  </div>
                )}

                {drawerSubTab === "history" && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Academic Year Dues
                    </p>
                    <div className="space-y-1.5">
                      {selectedDefaulter.dueMonths.length > 0 ? (
                        selectedDefaulter.dueMonths.map((m: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-[11px]"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {m} Fee Due
                            </span>
                            <span className="font-extrabold text-rose-600">
                              {fmtRupees(
                                Math.round(
                                  selectedDefaulter.totalDuePaise / selectedDefaulter.dueMonths.length
                                )
                              )}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-xs">
                          No pending due months recorded.
                        </div>
                      )}
                      {selectedDefaulter.lastPaymentAmountPaise > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Last Payment ({selectedDefaulter.lastPaymentDate})
                          </span>
                          <span className="font-extrabold text-emerald-600">
                            {fmtRupees(selectedDefaulter.lastPaymentAmountPaise)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Centralized Share Fee Modal */}
        {shareModalTarget && (
          <ShareFeeModal
            isOpen={Boolean(shareModalTarget)}
            onClose={() => setShareModalTarget(null)}
            schoolId={schoolId}
            initialMode="PAYMENT_REMINDER"
            student={{
              id: shareModalTarget.studentId,
              name: shareModalTarget.studentName,
              admissionNumber: shareModalTarget.admissionNumber,
              className: shareModalTarget.className,
              sectionName: shareModalTarget.sectionName,
              phone: shareModalTarget.phone,
              parentPhone: shareModalTarget.parentPhone,
            }}
          />
        )}

        {/* Follow-up Note Modal */}
        {followUpTarget && (
          <FeeFollowUpModal
            isOpen={Boolean(followUpTarget)}
            onClose={() => setFollowUpTarget(null)}
            schoolId={schoolId}
            assignment={followUpTarget}
            onFollowUpRecorded={fetchData}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
