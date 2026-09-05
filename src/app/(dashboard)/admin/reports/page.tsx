"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  DollarSign,
  Receipt,
  UserPlus,
  Bell,
  Download,
  Lock,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileType,
  X,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { SchoolReportType, ReportDataResult, ReportExportFormat } from "@/types/reports";
import { getStudents } from "@/lib/services/student.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { REPORT_CONFIGS } from "@/lib/reports/reportEngine";
import { toast } from "sonner";

interface ReportMetaCard {
  type: SchoolReportType;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
  isPro?: boolean;
}

const SCHOOL_REPORTS: ReportMetaCard[] = [
  {
    type: "STUDENTS",
    title: "Student Directory Report",
    description: "Complete student register with class, roll numbers, guardian contacts, and admission dates.",
    icon: GraduationCap,
    color: "text-blue-600 dark:text-blue-400",
    bgLight: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900",
  },
  {
    type: "TEACHERS",
    title: "Teaching Faculty Report",
    description: "Teacher employment directory, subject specializations, and assigned classes.",
    icon: Users,
    color: "text-indigo-600 dark:text-indigo-400",
    bgLight: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900",
  },
  {
    type: "ATTENDANCE",
    title: "Attendance & Absence Report",
    description: "Daily attendance records, present vs absent ratios, and overall percentage.",
    icon: ClipboardCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
  },
  {
    type: "CLASSES",
    title: "Classes & Curriculum Report",
    description: "Academic class sections, assigned class teachers, and student capacity metrics.",
    icon: BookOpen,
    color: "text-amber-600 dark:text-amber-400",
    bgLight: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
  },
  {
    type: "FEES_PAYMENTS",
    title: "School Fees & Collections",
    description: "Student fee receipts, collection trends, and payment mode breakdowns.",
    icon: DollarSign,
    color: "text-emerald-600 dark:text-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
    isPro: true,
  },
  {
    type: "INVOICES",
    title: "Subscription & Invoices",
    description: "School SaaS subscription billing history, payment receipts, and plan invoices.",
    icon: Receipt,
    color: "text-purple-600 dark:text-purple-400",
    bgLight: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900",
  },
  {
    type: "ADMISSIONS",
    title: "New Admissions Report",
    description: "Enrolled student intake volume, class requests, and enrollment dates.",
    icon: UserPlus,
    color: "text-cyan-600 dark:text-cyan-400",
    bgLight: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900",
  },
  {
    type: "ACADEMIC_ACTIVITY",
    title: "Circulars & Notices Log",
    description: "Broadcasted school announcements, target audiences, and publication timeline.",
    icon: Bell,
    color: "text-rose-600 dark:text-rose-400",
    bgLight: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
  },
];

import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function SchoolAdminReportsPage() {
  const { firebaseUser, profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const planTier = ((profile as any)?.planTier || "PROFESSIONAL").toUpperCase() as "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

  const [selectedReport, setSelectedReport] = useState<ReportMetaCard | null>(null);
  const [reportData, setReportData] = useState<ReportDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ReportExportFormat | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadReport = async (report: ReportMetaCard, openModal = false, customSearch?: string, customStatus?: string) => {
    if (profile?.role !== "super_admin" && !canAccess("advanced_reports")) {
      toast.error("Advanced Reports is locked on your current plan.");
      return;
    }
    setSelectedReport(report);
    if (openModal) {
      setIsConfigModalOpen(true);
    }
    setLoading(true);

    const activeSearch = customSearch !== undefined ? customSearch : search;
    const activeStatus = customStatus !== undefined ? customStatus : statusFilter;
    const currentSchoolId = schoolId || profile?.schoolId || "";

    try {
      // 1. Direct Authenticated Data Resolution for Students
      if (report.type === "STUDENTS") {
        const students = await getStudents(currentSchoolId);
        const activeCount = students.filter((s) => (s.status || "active").toLowerCase() === "active").length;

        const filteredRows = students
          .filter((s) => {
            const rawStatus = (s.status || "active").toLowerCase();
            if (activeSearch) {
              const kw = activeSearch.toLowerCase().trim();
              const sAny = s as any;
              const name = String(s.name || sAny.fullName || "").toLowerCase();
              const roll = String(s.rollNumber || s.studentId || sAny.rollNo || "").toLowerCase();
              const adm = String(s.admissionNumber || sAny.admissionNo || "").toLowerCase();
              const cls = String(s.className || "").toLowerCase();
              if (!name.includes(kw) && !roll.includes(kw) && !adm.includes(kw) && !cls.includes(kw)) return false;
            }
            if (activeStatus && activeStatus !== "all") {
              if (rawStatus !== activeStatus.toLowerCase()) return false;
            }
            return true;
          })
          .map((s) => {
            const sAny = s as any;
            return {
              id: s.id,
              rollNo: String(s.rollNumber || s.studentId || sAny.rollNo || "-"),
              fullName: s.name || sAny.fullName || "Student",
              className: s.className ? `${s.className} ${s.sectionName || sAny.section || ""}`.trim() : "Unassigned",
              gender: s.gender ? String(s.gender).toUpperCase() : "-",
              parentName: sAny.parentName || s.guardianName || sAny.fatherName || "-",
              parentPhone: s.phone || s.guardianPhone || sAny.parentPhone || sAny.parentContact || "-",
              admissionDate: s.admissionDate || (s.createdAt ? (typeof s.createdAt === "string" ? new Date(s.createdAt).toLocaleDateString("en-IN") : "-") : "-"),
              status: (s.status || "ACTIVE").toUpperCase(),
            };
          });

        setReportData({
          reportType: "STUDENTS",
          title: REPORT_CONFIGS.STUDENTS.title,
          description: "Complete student register with class, roll numbers, guardian contacts, and admission dates.",
          schoolName: (profile as any)?.schoolName || "School",
          generatedAt: new Date().toISOString(),
          columns: REPORT_CONFIGS.STUDENTS.columns,
          rows: filteredRows,
          summaryMetrics: [
            { label: "Total Students", value: students.length },
            { label: "Active Enrolled", value: activeCount },
            { label: "Inactive / Transferred", value: students.length - activeCount },
          ],
          totalRecords: filteredRows.length,
          isRestricted: false,
        });
        setLoading(false);
        return;
      }

      // 2. Direct Authenticated Data Resolution for Teachers
      if (report.type === "TEACHERS") {
        const teachers = await getTeachers(currentSchoolId);
        const activeCount = teachers.filter((t) => (t.status || "active").toLowerCase() === "active").length;

        const filteredRows = teachers
          .filter((t) => {
            const rawStatus = (t.status || "active").toLowerCase();
            if (activeSearch) {
              const kw = activeSearch.toLowerCase().trim();
              const tAny = t as any;
              const name = String(t.name || tAny.fullName || "").toLowerCase();
              const email = String(t.email || "").toLowerCase();
              const subj = String(t.subjects?.join(" ") || tAny.specialization || tAny.subject || "").toLowerCase();
              if (!name.includes(kw) && !email.includes(kw) && !subj.includes(kw)) return false;
            }
            if (activeStatus && activeStatus !== "all") {
              if (rawStatus !== activeStatus.toLowerCase()) return false;
            }
            return true;
          })
          .map((t) => {
            const tAny = t as any;
            return {
              id: t.id,
              fullName: t.name || tAny.fullName || "Teacher",
              email: t.email || "-",
              phone: t.phone || "-",
              subject: t.subjects?.join(", ") || tAny.specialization || tAny.subject || "General",
              assignedClass: t.assignedClassName || tAny.assignedClass || tAny.className || "-",
              joiningDate: t.joiningDate || (t.createdAt ? (typeof t.createdAt === "string" ? new Date(t.createdAt).toLocaleDateString("en-IN") : "-") : "-"),
              status: (t.status || "ACTIVE").toUpperCase(),
            };
          });

        setReportData({
          reportType: "TEACHERS",
          title: REPORT_CONFIGS.TEACHERS.title,
          description: "Directory of faculty members, qualifications, assigned subjects, and employment status.",
          schoolName: (profile as any)?.schoolName || "School",
          generatedAt: new Date().toISOString(),
          columns: REPORT_CONFIGS.TEACHERS.columns,
          rows: filteredRows,
          summaryMetrics: [
            { label: "Total Faculty", value: teachers.length },
            { label: "Active Staff", value: activeCount },
          ],
          totalRecords: filteredRows.length,
          isRestricted: false,
        });
        setLoading(false);
        return;
      }

      // 3. Server-side API preview fallback for other reports
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const uid = firebaseUser?.uid || profile?.uid || "";
      const email = firebaseUser?.email || profile?.email || "";
      const role = profile?.role || "school_admin";

      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          ...(uid ? { "x-user-id": uid } : {}),
          ...(email ? { "x-user-email": email } : {}),
          ...(role ? { "x-user-role": role } : {}),
          ...(currentSchoolId ? { "x-school-id": currentSchoolId } : {}),
        },
        body: JSON.stringify({
          reportType: report.type,
          schoolId: currentSchoolId,
          filters: { search: activeSearch, status: activeStatus },
          userPlanTier: planTier,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load report.");
      setReportData(json.data);
    } catch (err: any) {
      toast.error(err.message || "Unable to generate report.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!selectedReport) return;
    if (reportData?.isRestricted) {
      toast.error("Exporting is restricted on the Starter plan. Please upgrade to Professional or Enterprise.");
      return;
    }

    setExportingFormat(format);
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const uid = firebaseUser?.uid || profile?.uid || "";
      const email = firebaseUser?.email || profile?.email || "";
      const role = profile?.role || "school_admin";
      const currentSchoolId = schoolId || profile?.schoolId || "";

      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          ...(uid ? { "x-user-id": uid } : {}),
          ...(email ? { "x-user-email": email } : {}),
          ...(role ? { "x-user-role": role } : {}),
          ...(currentSchoolId ? { "x-school-id": currentSchoolId } : {}),
        },
        body: JSON.stringify({
          reportType: selectedReport.type,
          schoolId: currentSchoolId,
          format,
          filters: { search, status: statusFilter },
          userPlanTier: planTier,
          clientRows: reportData?.rows || [],
          schoolName: (profile as any)?.schoolName || "School",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Export failed.");
      }

      // Trigger file download in browser
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.type.toLowerCase()}_report.${format === "xlsx" ? "xlsx" : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} export downloaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export report.");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <EntitlementGate
      feature="advanced_reports"
      title="School Reports & Data Export Center"
      description="Generate, analyze, and export real-time verified school records in CSV, Excel, and PDF formats."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span>School Reports & Data Export Center</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Generate, analyze, and export real-time verified school records in CSV, Excel, and PDF formats.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Plan: {planTier}</span>
            </Link>
          </div>
        </div>

      {/* Reports Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCHOOL_REPORTS.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedReport?.type === r.type;

          return (
            <button
              key={r.type}
              onClick={() => loadReport(r, true)}
              className={`text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900 shadow-md"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${r.bgLight}`}>
                    <Icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  {r.isPro && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Pro Feature
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{r.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>View & Export</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Workspace Preview */}
      {selectedReport && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
          {/* Header & Export Actions Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{reportData?.title || selectedReport.title}</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {reportData?.totalRecords || 0} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{reportData?.description}</p>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={loading || Boolean(exportingFormat)}
                onClick={() => loadReport(selectedReport)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Refresh Report Data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                disabled={reportData?.isRestricted || exportingFormat !== null}
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
              >
                <FileType className="h-4 w-4 text-emerald-600" />
                <span>{exportingFormat === "csv" ? "Exporting..." : "CSV"}</span>
              </button>

              <button
                disabled={reportData?.isRestricted || exportingFormat !== null}
                onClick={() => handleExport("xlsx")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>{exportingFormat === "xlsx" ? "Exporting..." : "Excel"}</span>
              </button>

              <button
                disabled={reportData?.isRestricted || exportingFormat !== null}
                onClick={() => handleExport("pdf")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>{exportingFormat === "pdf" ? "Exporting..." : "Download PDF"}</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {reportData?.summaryMetrics && reportData.summaryMetrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {reportData.summaryMetrics.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{m.label}</p>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search / Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search report records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadReport(selectedReport)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => loadReport(selectedReport)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors"
            >
              Apply Filter
            </button>
          </div>

          {/* Table Preview & Starter Lockout Banner */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    {reportData?.columns.map((col) => (
                      <th key={col.key} className="px-4 py-3">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {reportData?.rows.map((row, rIdx) => (
                    <tr key={row.id || rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      {reportData.columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {col.type === "badge" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {row[col.key] || "ACTIVE"}
                            </span>
                          ) : col.type === "currency" ? (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              ₹{Number(row[col.key] || 0).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            row[col.key] || "-"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {(!reportData || reportData.rows.length === 0) && !loading && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
                No records found matching the selected filter criteria.
              </div>
            )}

            {/* Starter Plan Locked Overlay with Upgrade CTA */}
            {reportData?.isRestricted && (
              <div className="p-8 bg-gradient-to-t from-white via-white/95 to-white/70 dark:from-slate-950 dark:via-slate-950/95 dark:to-slate-950/70 border-t border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    🔒 Advanced Report Access & Full Export Locked
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Your current Starter plan only provides a preview of 3 records. Upgrade to Professional or Enterprise to unlock complete school datasets, advanced date filters, and unlimited CSV, Excel, and PDF downloads.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/admin/billing"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:shadow-lg transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Upgrade Plan to Unlock Reports</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          INTERACTIVE REPORT CONFIGURATION & EXPORT MODAL
      ========================================== */}
      {isConfigModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${selectedReport.bgLight}`}>
                  <selectedReport.icon className={`h-6 w-6 ${selectedReport.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {selectedReport.title}
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Configuration & Export
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {selectedReport.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
              {/* Configuration Filters Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                    <span>Report Filters & Customization</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {reportData?.totalRecords ?? 0} records matched
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                  {/* Search Query */}
                  <div className="sm:col-span-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter by name, ID, roll number, class..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadReport(selectedReport, false, search, statusFilter)}
                      className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="sm:col-span-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        loadReport(selectedReport, false, search, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive / Suspended</option>
                    </select>
                  </div>

                  {/* Refresh / Apply */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => loadReport(selectedReport, false, search, statusFilter)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Summary Metrics */}
              {reportData?.summaryMetrics && reportData.summaryMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {reportData.summaryMetrics.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{m.label}</p>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Data Preview Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>Real-Time Data Preview</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Showing top records for export preview
                  </span>
                </div>

                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <tr>
                        {reportData?.columns.map((col) => (
                          <th key={col.key} className="px-3.5 py-2 whitespace-nowrap">
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {loading ? (
                        <tr>
                          <td colSpan={reportData?.columns.length || 5} className="py-8 text-center text-slate-400">
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-600 mb-1" />
                            <span>Loading live report records...</span>
                          </td>
                        </tr>
                      ) : (!reportData || reportData.rows.length === 0) ? (
                        <tr>
                          <td colSpan={reportData?.columns.length || 5} className="py-8 text-center text-slate-400">
                            No records found for current filters.
                          </td>
                        </tr>
                      ) : (
                        reportData.rows.slice(0, 5).map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            {reportData.columns.map((col) => (
                              <td key={col.key} className="px-3.5 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {col.type === "badge" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {row[col.key] || "ACTIVE"}
                                  </span>
                                ) : col.type === "currency" ? (
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    ₹{Number(row[col.key] || 0).toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  row[col.key] || "-"
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer: High-Visibility Export Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                Formats: Vector PDF, Microsoft Excel (.xlsx), and RFC-4180 CSV.
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                <button
                  type="button"
                  disabled={reportData?.isRestricted || exportingFormat !== null}
                  onClick={() => handleExport("csv")}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <FileType className="h-4 w-4 text-emerald-600" />
                  <span>{exportingFormat === "csv" ? "Exporting..." : "Export CSV"}</span>
                </button>

                <button
                  type="button"
                  disabled={reportData?.isRestricted || exportingFormat !== null}
                  onClick={() => handleExport("xlsx")}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>{exportingFormat === "xlsx" ? "Exporting..." : "Export Excel"}</span>
                </button>

                <button
                  type="button"
                  disabled={reportData?.isRestricted || exportingFormat !== null}
                  onClick={() => handleExport("pdf")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>{exportingFormat === "pdf" ? "Exporting PDF..." : "Export PDF (Verified)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </EntitlementGate>
  );
}
