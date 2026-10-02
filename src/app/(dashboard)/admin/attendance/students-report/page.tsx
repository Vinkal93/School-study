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
  Filter,
  MessageSquare,
  Check,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getStudentMonthlyAttendance } from "@/lib/services/attendance.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { SchoolClass, StudentProfile, AttendanceRecord } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function StudentsAttendanceReportPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  // Current Month/Year (YYYY-MM)
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<"summary" | "register">("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [shortageFilter, setShortageFilter] = useState<"all" | "defaulters" | "star">("all");

  // Load Classes
  useEffect(() => {
    async function loadClasses() {
      if (!schoolId) return;
      try {
        const clsList = await getClassesWithSections(schoolId);
        setClasses(clsList);
        if (clsList.length > 0 && selectedClassId === "all") {
          setSelectedClassId(clsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, [schoolId]);

  const activeClass = useMemo(() => classes.find((c) => c.id === selectedClassId), [classes, selectedClassId]);
  const availableSections = useMemo(() => activeClass?.sections || [], [activeClass]);

  // Load Monthly Data
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [stuList, recs] = await Promise.all([
        selectedClassId !== "all"
          ? getStudentsByClassAndSection(schoolId, selectedClassId, selectedSectionId)
          : Promise.resolve([]),
        getStudentMonthlyAttendance(schoolId, selectedYearMonth, selectedClassId, selectedSectionId),
      ]);

      setStudents(stuList);
      setMonthlyRecords(recs);
    } catch (err) {
      console.error("Failed to load student monthly attendance:", err);
      toast.error("Failed to load monthly attendance report.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedYearMonth, selectedClassId, selectedSectionId, profile?.role, canAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month Navigation Helpers
  const handleMonthStep = (offset: number) => {
    const [year, month] = selectedYearMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setSelectedYearMonth(`${d.getFullYear()}-${mm}`);
  };

  // Days in selected month
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedYearMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedYearMonth]);

  const daysArray = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [daysInMonth]);

  // Build matrix: studentId -> date -> AttendanceRecord
  const matrix = useMemo(() => {
    const map = new Map<string, Map<number, AttendanceRecord>>();
    monthlyRecords.forEach((r) => {
      if (!map.has(r.studentId)) {
        map.set(r.studentId, new Map());
      }
      const day = parseInt(r.date.slice(8, 10), 10);
      map.get(r.studentId)!.set(day, r);
    });
    return map;
  }, [monthlyRecords]);

  // Unique marked working dates in this month
  const totalWorkingDates = useMemo(() => {
    const set = new Set<string>();
    monthlyRecords.forEach((r) => set.add(r.date));
    return set.size;
  }, [monthlyRecords]);

  // Student aggregates
  const studentStats = useMemo(() => {
    return students.map((s) => {
      const studentDays = matrix.get(s.id);
      let present = 0;
      let absent = 0;
      let late = 0;
      let halfDay = 0;

      if (studentDays) {
        studentDays.forEach((r) => {
          const st = (r.status || "").toUpperCase();
          if (st === "PRESENT") present++;
          else if (st === "ABSENT") absent++;
          else if (st === "LATE") late++;
          else if (st === "HALF_DAY") halfDay++;
        });
      }

      const totalMarked = present + absent + late + halfDay;
      const effectivePresent = present + late + halfDay * 0.5;
      const pct = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 100;
      const isShortage = totalMarked > 3 && pct < 75;
      const isStar = totalMarked > 5 && pct === 100;

      return {
        student: s,
        present,
        absent,
        late,
        halfDay,
        totalMarked,
        pct,
        isShortage,
        isStar,
      };
    });
  }, [students, matrix]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentStats.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.student.name && String(item.student.name).toLowerCase().includes(q)) ||
        (item.student.studentId && String(item.student.studentId).toLowerCase().includes(q)) ||
        (item.student.rollNumber !== undefined && String(item.student.rollNumber) === q);

      if (!matchesSearch) return false;

      if (shortageFilter === "defaulters") return item.isShortage;
      if (shortageFilter === "star") return item.isStar;

      return true;
    });
  }, [studentStats, searchQuery, shortageFilter]);

  // Aggregate Metrics
  const aggregateMetrics = useMemo(() => {
    const total = studentStats.length;
    const defaulters = studentStats.filter((s) => s.isShortage).length;
    const starStudents = studentStats.filter((s) => s.isStar).length;
    const avgPct =
      total > 0
        ? Math.round(studentStats.reduce((acc, curr) => acc + curr.pct, 0) / total)
        : 0;

    return { total, defaulters, starStudents, avgPct };
  }, [studentStats]);

  // Send WhatsApp Shortage Warning
  const handleSendShortageWarning = (item: (typeof studentStats)[0]) => {
    const phone = String(item.student.guardianPhone || item.student.phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      toast.error(`No guardian contact number for ${item.student.name}.`);
      return;
    }

    const monthName = new Date(`${selectedYearMonth}-01`).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const msg = encodeURIComponent(
      `URGENT NOTICE — School Attendance Shortage\n\nDear Parent,\nThis is to notify you that your child ${item.student.name} (Class: ${activeClass?.name || item.student.className || ""}, Roll: ${item.student.rollNumber || "N/A"}) has recorded an attendance rate of ${item.pct}% for ${monthName}.\n\nAs per institutional policy, minimum 75% attendance is required for exam eligibility. Please meet the class teacher to resolve pending attendance.\n\n— School Administration`
    );

    const intl = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${intl}?text=${msg}`, "_blank");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (studentStats.length === 0) {
      toast.error("No student attendance data to export.");
      return;
    }
    const headers = [
      "Roll No",
      "Student ID",
      "Name",
      "Class",
      "Total Marked Days",
      "Present",
      "Absent",
      "Late",
      "Attendance %",
      "Status",
    ];
    const rows = studentStats.map((item) => [
      item.student.rollNumber ?? "",
      item.student.studentId || item.student.admissionNumber || item.student.id,
      `"${item.student.name}"`,
      `"${item.student.className || activeClass?.name || ""}"`,
      item.totalMarked,
      item.present,
      item.absent,
      item.late,
      `${item.pct}%`,
      item.isShortage ? "Critical Shortage (<75%)" : "Satisfactory",
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", `Student_Monthly_Attendance_${selectedYearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded student monthly attendance report.");
  };

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="Attendance Management Required"
      description="Upgrade your subscription plan to access detailed monthly student attendance registers."
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Class wise Report</span>
          </Link>
          <Link
            href="/admin/attendance/students-report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm shrink-0"
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
              <span>Attendance Records</span>
              <span>/</span>
              <span>Monthly Student Register</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              Students Attendance Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monthly day-by-day attendance register, exam eligibility status, and low attendance defaulter lists.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Navigator */}
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => handleMonthStep(-1)}
                title="Previous Month"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <input
                  type="month"
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden border-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => handleMonthStep(1)}
                title="Next Month"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronRight className="h-4 w-4" />
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
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
              <span>Working Days</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {totalWorkingDates} Days
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Roll calls marked</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span>Average Attendance</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {aggregateMetrics.avgPct}%
            </div>
            <div className="text-[11px] text-emerald-600/70 mt-1">Cohort monthly mean</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/40 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
              <span>Shortage Defaulters</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {aggregateMetrics.defaulters}
            </div>
            <div className="text-[11px] text-rose-500 mt-1">Below 75% threshold</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
              <span>100% Star Students</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {aggregateMetrics.starStudents}
            </div>
            <div className="text-[11px] text-amber-600 mt-1">Flawless attendance</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Class */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Classroom
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("all");
                }}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sections</option>
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Attendance Filter
              </label>
              <select
                value={shortageFilter}
                onChange={(e) => setShortageFilter(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students ({studentStats.length})</option>
                <option value="defaulters">Defaulters (&lt;75% Shortage)</option>
                <option value="star">100% Star Students</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "summary"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Summary Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("register")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "register"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Day-by-Day Register (1-31)
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Showing {filteredStudents.length} of {studentStats.length} students
            </div>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Generating monthly attendance register matrix...
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <Users className="h-8 w-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">No Students Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              No students matched the chosen filters for {selectedYearMonth}.
            </p>
          </div>
        ) : viewMode === "summary" ? (
          /* Summary Table View */
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-16">Roll</th>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4 text-center">Marked Days</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                    <th className="py-3 px-4 text-center">Exam Eligibility</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStudents.map((item) => (
                    <tr
                      key={item.student.id}
                      className={`transition hover:bg-gray-50/70 dark:hover:bg-gray-800/60 ${
                        item.isShortage ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-700 dark:text-gray-300">
                        {item.student.rollNumber !== undefined ? `#${item.student.rollNumber}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {item.student.name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          ID: {item.student.studentId || item.student.admissionNumber || item.student.id.slice(0, 6)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-700 dark:text-gray-300">
                        {item.totalMarked}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {item.present}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                        {item.absent}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                        {item.late}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.pct >= 90
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : item.pct >= 75
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {item.pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isShortage ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200 dark:border-rose-900/60">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Shortage Warning</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/60">
                            <Check className="h-3 w-3" />
                            <span>Eligible</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.isShortage ? (
                          <button
                            type="button"
                            onClick={() => handleSendShortageWarning(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shadow-xs transition"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Alert Parent</span>
                          </button>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Day-by-Day Register (1-31 Matrix) */
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Monthly Register Matrix: {selectedYearMonth} ({daysInMonth} Days)
              </span>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present (P)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent (A)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Late (L)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Half (H)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800 text-[10px]">
                    <th className="py-2.5 px-3 text-left sticky left-0 bg-gray-100 dark:bg-gray-900 z-10 w-44">
                      Student Name
                    </th>
                    {daysArray.map((day) => (
                      <th key={day} className="py-2 px-1.5 min-w-[28px]">
                        {day}
                      </th>
                    ))}
                    <th className="py-2 px-3 bg-gray-100 dark:bg-gray-900 font-bold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStudents.map((item) => {
                    const studentDays = matrix.get(item.student.id);

                    return (
                      <tr key={item.student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                        {/* Student Name Sticky Column */}
                        <td className="py-2 px-3 text-left font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-800 truncate max-w-[176px]">
                          <div className="truncate font-semibold">{item.student.name}</div>
                          <div className="text-[10px] text-gray-400">
                            Roll: {item.student.rollNumber ?? "—"}
                          </div>
                        </td>

                        {/* 1 to 31 Day Cells */}
                        {daysArray.map((day) => {
                          const record = studentDays?.get(day);
                          if (!record) {
                            return (
                              <td key={day} className="py-2 px-1 text-gray-300 dark:text-gray-700 text-[10px]">
                                —
                              </td>
                            );
                          }

                          const st = (record.status || "").toUpperCase();
                          return (
                            <td key={day} className="py-2 px-1">
                              <span
                                className={`inline-flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-bold ${
                                  st === "PRESENT"
                                    ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                                    : st === "ABSENT"
                                    ? "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300"
                                    : st === "LATE"
                                    ? "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                                    : "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300"
                                }`}
                                title={`${record.date}: ${record.status}`}
                              >
                                {st.charAt(0)}
                              </span>
                            </td>
                          );
                        })}

                        {/* Percentage */}
                        <td className="py-2 px-3 font-bold text-gray-900 dark:text-white bg-gray-50/50 dark:bg-gray-900/40">
                          {item.pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
