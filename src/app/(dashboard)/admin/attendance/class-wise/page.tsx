"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  BookOpen,
  Loader2,
  RefreshCw,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Sparkles,
  BarChart3,
  FileText,
  ClipboardList,
  AlertTriangle,
  Award,
  ArrowRight,
  Eye,
  X,
  Filter,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import {
  getClassWiseAttendanceSummary,
  getSchoolAttendanceForDate,
} from "@/lib/services/attendance.service";
import type { SchoolClass, ClassAttendanceSummary, AttendanceRecord } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function ClassWiseAttendanceReportPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  // State
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [summaries, setSummaries] = useState<ClassAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "marked" | "unmarked" | "critical">("all");

  // Inspection Modal
  const [inspectingClass, setInspectingClass] = useState<ClassAttendanceSummary | null>(null);
  const [inspectingRecords, setInspectingRecords] = useState<AttendanceRecord[]>([]);
  const [inspectingLoading, setInspectingLoading] = useState(false);

  // Load Classes
  useEffect(() => {
    async function loadClasses() {
      if (!schoolId) return;
      try {
        const clsList = await getClassesWithSections(schoolId);
        setClasses(clsList);
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, [schoolId]);

  // Load Class Summaries for Date
  const loadData = useCallback(async () => {
    if (!schoolId || classes.length === 0) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getClassWiseAttendanceSummary(schoolId, selectedDate, classes);
      setSummaries(data);
    } catch (err) {
      console.error("Failed to load class-wise attendance summary:", err);
      toast.error("Failed to compute class-wise attendance.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedDate, classes, profile?.role, canAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigation Helpers
  const handleDateStep = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Inspect Modal Loader
  const handleOpenInspect = async (summary: ClassAttendanceSummary) => {
    setInspectingClass(summary);
    setInspectingLoading(true);
    try {
      const recs = await getSchoolAttendanceForDate(
        schoolId,
        selectedDate,
        summary.classId,
        summary.sectionId
      );
      setInspectingRecords(recs);
    } catch (err) {
      console.error("Failed to inspect class records:", err);
      toast.error("Failed to load class roster records.");
    } finally {
      setInspectingLoading(false);
    }
  };

  // School-Wide Metrics
  const metrics = useMemo(() => {
    let totalEnrolled = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let markedClasses = 0;
    let bestClass: ClassAttendanceSummary | null = null;
    let lowestClass: ClassAttendanceSummary | null = null;

    summaries.forEach((s) => {
      totalEnrolled += s.totalStudents;
      totalPresent += s.presentCount;
      totalAbsent += s.absentCount;
      totalLate += s.lateCount;
      if (s.isMarked) {
        markedClasses++;
        if (!bestClass || s.attendancePercentage > bestClass.attendancePercentage) {
          bestClass = s;
        }
        if (!lowestClass || s.attendancePercentage < lowestClass.attendancePercentage) {
          lowestClass = s;
        }
      }
    });

    const effectivePresent = totalPresent + totalLate;
    const overallRate = totalEnrolled > 0 ? Math.round((effectivePresent / totalEnrolled) * 100) : 0;

    return {
      totalClasses: summaries.length,
      markedClasses,
      totalEnrolled,
      totalPresent,
      totalAbsent,
      totalLate,
      overallRate,
      bestClass,
      lowestClass,
    };
  }, [summaries]);

  // Filtered Summaries
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.className && s.className.toLowerCase().includes(q)) ||
        (s.sectionName && s.sectionName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "marked") return s.isMarked;
      if (statusFilter === "unmarked") return !s.isMarked;
      if (statusFilter === "critical") return s.isMarked && s.attendancePercentage < 75;

      return true;
    });
  }, [summaries, searchQuery, statusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (summaries.length === 0) {
      toast.error("No class-wise data to export.");
      return;
    }
    const headers = [
      "Class Name",
      "Section",
      "Total Marked",
      "Present",
      "Absent",
      "Late",
      "Attendance %",
      "Status",
      "Date",
    ];
    const rows = summaries.map((s) => [
      `"${s.className}"`,
      `"${s.sectionName}"`,
      s.totalStudents,
      s.presentCount,
      s.absentCount,
      s.lateCount,
      `${s.attendancePercentage}%`,
      s.isMarked ? "Marked" : "Pending",
      selectedDate,
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", `Class_Wise_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded class-wise attendance CSV.");
  };

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="Attendance Management Required"
      description="Upgrade your subscription plan to analyze comparative class-wise attendance."
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Quick Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/admin/attendance/students"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Students Attendance</span>
          </Link>
          <Link
            href="/admin/attendance/employees"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <Users className="h-4 w-4" />
            <span>Employees Attendance</span>
          </Link>
          <Link
            href="/admin/attendance/class-wise"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Class wise Report</span>
          </Link>
          <Link
            href="/admin/attendance/students-report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span>Students Attendance Report</span>
          </Link>
          <Link
            href="/admin/attendance/employees-report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Employees Attendance Report</span>
          </Link>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <span>Attendance Intelligence</span>
              <span>/</span>
              <span>Institutional Comparative Analysis</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              Class wise Attendance Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Compare attendance turnout across all classrooms, identify low-attendance cohorts, and drill into rosters.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Navigator */}
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => handleDateStep(-1)}
                title="Previous Day"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden border-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDateStep(1)}
                title="Next Day"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="ml-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Top Intelligence KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
              <span>Classes Marked</span>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {metrics.markedClasses} / {metrics.totalClasses}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {metrics.totalClasses > 0 ? Math.round((metrics.markedClasses / metrics.totalClasses) * 100) : 0}% completion
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span>Turnout Rate</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.overallRate}%
            </div>
            <div className="text-[11px] text-emerald-600/70 mt-1">
              {metrics.totalPresent} Present • {metrics.totalAbsent} Absent
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
              <span>Top Class</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-2 truncate">
              {(metrics.bestClass as any)?.className || "N/A"}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">
              {(metrics.bestClass as any) ? `${(metrics.bestClass as any).attendancePercentage}% Attendance` : "No records yet"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/40 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
              <span>Shortage Alert</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-2 truncate">
              {(metrics.lowestClass as any && (metrics.lowestClass as any).attendancePercentage < 75)
                ? `${(metrics.lowestClass as any).className}`
                : "None (<75%)"}
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">
              {(metrics.lowestClass as any && (metrics.lowestClass as any).attendancePercentage < 75)
                ? `${(metrics.lowestClass as any).attendancePercentage}% turnout`
                : "All cohorts healthy"}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter:</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              All Classes ({summaries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("marked")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === "marked"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              Marked ({summaries.filter((s) => s.isMarked).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unmarked")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === "unmarked"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              Pending ({summaries.filter((s) => !s.isMarked).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("critical")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === "critical"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
              }`}
            >
              Low Attendance (&lt;75%) ({summaries.filter((s) => s.isMarked && s.attendancePercentage < 75).length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search class or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Class Cards Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Aggregating class-wise attendance data...
            </p>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <BookOpen className="h-8 w-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">No Classes Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              No classrooms matched the chosen filter or no academic classes are configured yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map((summary) => {
              const isLow = summary.isMarked && summary.attendancePercentage < 75;
              const isHigh = summary.isMarked && summary.attendancePercentage >= 90;

              return (
                <div
                  key={`${summary.classId}_${summary.sectionId}`}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                    isLow
                      ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/10"
                      : isHigh
                      ? "border-emerald-200 dark:border-emerald-900/40"
                      : "border-gray-200 dark:border-gray-700/60"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{summary.className}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {summary.sectionName}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {summary.isMarked ? `${summary.totalStudents} students marked` : "Attendance pending"}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {summary.isMarked ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isLow
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              : isHigh
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {summary.attendancePercentage}% Rate
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 mb-1">
                        <span>Attendance Turnout</span>
                        <span>{summary.attendancePercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLow ? "bg-rose-500" : isHigh ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${summary.attendancePercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Numbers */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-center">
                      <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {summary.presentCount}
                        </div>
                        <div className="text-[10px] text-emerald-600/80 font-medium">Present</div>
                      </div>

                      <div className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/30">
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          {summary.absentCount}
                        </div>
                        <div className="text-[10px] text-rose-600/80 font-medium">Absent</div>
                      </div>

                      <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {summary.lateCount}
                        </div>
                        <div className="text-[10px] text-amber-600/80 font-medium">Late</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(summary)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <Eye className="h-3.5 w-3.5 text-gray-500" />
                      <span>View Roster</span>
                    </button>

                    <Link
                      href={`/admin/attendance/students`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                    >
                      <span>Take Attendance</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inspection Modal */}
        {inspectingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{inspectingClass.className} - {inspectingClass.sectionName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {inspectingClass.attendancePercentage}% Turnout
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Attendance records for {selectedDate} ({inspectingRecords.length} students)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingClass(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto flex-1">
                {inspectingLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-gray-500 mt-2">Loading students roster...</p>
                  </div>
                ) : inspectingRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No attendance records found for this classroom on {selectedDate}.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {inspectingRecords.map((r) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-gray-400 w-8">
                            {r.rollNumber !== undefined ? `#${r.rollNumber}` : "—"}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {r.studentName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Adm: {r.admissionNumber || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {r.remarks && (
                            <span className="text-[11px] text-gray-400 italic max-w-xs truncate">
                              &ldquo;{r.remarks}&rdquo;
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              r.status === "PRESENT"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : r.status === "ABSENT"
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingClass(null)}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
