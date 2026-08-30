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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { SchoolReportType, ReportDataResult, ReportExportFormat } from "@/types/reports";
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

export default function SchoolAdminReportsPage() {
  const { firebaseUser, profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const planTier = ((profile as any)?.planTier || "PROFESSIONAL").toUpperCase() as "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

  const [selectedReport, setSelectedReport] = useState<ReportMetaCard | null>(null);
  const [reportData, setReportData] = useState<ReportDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ReportExportFormat | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadReport = async (report: ReportMetaCard) => {
    setSelectedReport(report);
    setLoading(true);
    try {
      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: report.type,
          schoolId,
          filters: { search, status: statusFilter },
          userPlanTier: planTier,
          actorId: profile?.email || firebaseUser?.uid || "admin",
          actorRole: "school_admin",
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
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: selectedReport.type,
          schoolId,
          format,
          filters: { search, status: statusFilter },
          userPlanTier: planTier,
          actorId: profile?.email || firebaseUser?.uid || "admin",
          actorRole: "school_admin",
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
              onClick={() => loadReport(r)}
              className={`text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
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
    </div>
  );
}
