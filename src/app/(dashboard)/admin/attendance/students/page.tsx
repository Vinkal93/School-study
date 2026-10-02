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
  Save,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  MessageSquare,
  Sparkles,
  BarChart3,
  FileText,
  ClipboardList,
  AlertCircle,
  Check,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import {
  getSchoolAttendanceForDate,
  saveBatchAttendance,
} from "@/lib/services/attendance.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { SchoolClass, AttendanceRecord, AttendanceStatus, StudentProfile } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function StudentsAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  // State
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Main Data Loader
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (selectedClassId === "all") {
        const attList = await getSchoolAttendanceForDate(schoolId, selectedDate);
        setClassStudents([]);
        const map: Record<string, AttendanceStatus> = {};
        const rems: Record<string, string> = {};
        attList.forEach((r) => {
          map[r.studentId] = r.status;
          if (r.remarks) rems[r.studentId] = r.remarks;
        });
        setAttendanceMap(map);
        setRemarksMap(rems);
      } else {
        const [stuList, existingRecords] = await Promise.all([
          getStudentsByClassAndSection(schoolId, selectedClassId, selectedSectionId),
          getSchoolAttendanceForDate(schoolId, selectedDate, selectedClassId, selectedSectionId),
        ]);

        setClassStudents(stuList);

        const existingMap: Record<string, AttendanceStatus> = {};
        const existingRemarks: Record<string, string> = {};
        existingRecords.forEach((r) => {
          existingMap[r.studentId] = r.status;
          if (r.remarks) existingRemarks[r.studentId] = r.remarks;
        });

        const initialMap: Record<string, AttendanceStatus> = {};
        stuList.forEach((s) => {
          initialMap[s.id] = existingMap[s.id] || "PRESENT";
        });
        setAttendanceMap(initialMap);
        setRemarksMap(existingRemarks);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedDate, selectedClassId, selectedSectionId, profile?.role, canAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Available sections for chosen class
  const activeClass = useMemo(() => classes.find((c) => c.id === selectedClassId), [classes, selectedClassId]);
  const availableSections = useMemo(() => activeClass?.sections || [], [activeClass]);

  // Date Navigation Helpers
  const handleDateStep = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Status Modifiers
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    toast.success(`Marked all students as ${status}.`);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleRemarksChange = (studentId: string, val: string) => {
    setRemarksMap((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (selectedClassId === "all" || classStudents.length === 0) {
      toast.error("Please select a specific class with enrolled students to record attendance.");
      return;
    }

    const currentClass = classes.find((c) => c.id === selectedClassId);
    const currentSection = currentClass?.sections?.find((s) => s.id === selectedSectionId);

    setIsSaving(true);
    try {
      const batchRecords = classStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        admissionNumber: s.admissionNumber || s.studentId || "",
        rollNumber: s.rollNumber,
        status: attendanceMap[s.id] || "PRESENT",
        remarks: remarksMap[s.id] || "",
      }));

      await saveBatchAttendance(schoolId, {
        classId: selectedClassId,
        className: currentClass?.name || "",
        sectionId: selectedSectionId !== "all" ? selectedSectionId : (currentClass?.sections?.[0]?.id || ""),
        sectionName: currentSection?.name || currentClass?.sections?.[0]?.name || "Default",
        teacherId: profile?.uid || "admin",
        teacherName: profile?.name || "School Admin",
        date: selectedDate,
        records: batchRecords,
      });

      toast.success(`Successfully saved attendance for ${batchRecords.length} students.`);
    } catch (err: any) {
      console.error("Save attendance error:", err);
      toast.error(err?.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp Alert for Absent Student
  const handleSendAbsentWhatsApp = (student: StudentProfile) => {
    const phone = String(student.guardianPhone || student.phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      toast.error(`No contact number registered for ${student.name}'s parent.`);
      return;
    }

    const currentClass = classes.find((c) => c.id === selectedClassId);
    const formattedDate = new Date(selectedDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const msg = encodeURIComponent(
      `Dear Parent,\nThis is to notify you that your child ${student.name} (Class: ${currentClass?.name || student.className || "Class"}, Roll: ${student.rollNumber || "N/A"}) is marked ABSENT today (${formattedDate}) at school.\n\nIf this was not pre-authorized, please contact the school administration.\n\n— School Admin Office`
    );

    const intlPhone = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, "_blank");
  };

  // WhatsApp Bulk Absent Alert
  const handleBulkAbsentAlerts = () => {
    const absentStudents = classStudents.filter((s) => attendanceMap[s.id] === "ABSENT");
    if (absentStudents.length === 0) {
      toast.info("No students are marked ABSENT currently.");
      return;
    }

    toast.info(`Preparing notices for ${absentStudents.length} absent students.`);
    // Trigger first absent student
    handleSendAbsentWhatsApp(absentStudents[0]);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.name && String(s.name).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        (s.rollNumber !== undefined && String(s.rollNumber) === q);

      const status = attendanceMap[s.id] || "PRESENT";
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [classStudents, searchQuery, attendanceMap, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (selectedClassId === "all") {
      const total = Object.keys(attendanceMap).length;
      let present = 0;
      let absent = 0;
      let late = 0;
      let halfDay = 0;
      Object.values(attendanceMap).forEach((st) => {
        if (st === "PRESENT") present++;
        else if (st === "ABSENT") absent++;
        else if (st === "LATE") late++;
        else if (st === "HALF_DAY") halfDay++;
      });
      const pct = total > 0 ? Math.round(((present + late + halfDay * 0.5) / total) * 100) : 0;
      return { total, present, absent, late, halfDay, pct };
    }

    const total = classStudents.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;

    classStudents.forEach((s) => {
      const st = attendanceMap[s.id] || "PRESENT";
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else if (st === "LATE") late++;
      else if (st === "HALF_DAY") halfDay++;
    });

    const pct = total > 0 ? Math.round(((present + late + halfDay * 0.5) / total) * 100) : 0;
    return { total, present, absent, late, halfDay, pct };
  }, [classStudents, attendanceMap, selectedClassId]);

  // Export CSV
  const handleExportCSV = () => {
    if (classStudents.length === 0) {
      toast.error("No student attendance data to export.");
      return;
    }
    const headers = ["Roll No", "Student ID", "Name", "Class", "Section", "Status", "Date", "Remarks"];
    const rows = classStudents.map((s) => [
      s.rollNumber ?? "",
      s.studentId || s.admissionNumber || s.id,
      `"${s.name}"`,
      `"${s.className || activeClass?.name || ""}"`,
      `"${s.sectionName || ""}"`,
      attendanceMap[s.id] || "PRESENT",
      selectedDate,
      `"${remarksMap[s.id] || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Students_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded attendance CSV.");
  };

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="Attendance Management Required"
      description="Upgrade your subscription plan to record and manage daily student roll calls."
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Quick Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/admin/attendance/students"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm shrink-0"
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
              <span>Attendance Hub</span>
              <span>/</span>
              <span>Daily Student Roll Call</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              Students Attendance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mark daily attendance, track absent students, and broadcast instant WhatsApp alerts to guardians.
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

            {/* Primary Save Button */}
            {selectedClassId !== "all" && classStudents.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Attendance</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
              <span>Total Students</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</div>
            <div className="text-[11px] text-gray-400 mt-1">Enrolled in cohort</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span>Present</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.present}</div>
            <div className="text-[11px] text-emerald-600/70 mt-1">
              {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}% of cohort
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/40 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
              <span>Absent</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{stats.absent}</div>
            <div className="text-[11px] text-rose-500 mt-1">
              {stats.absent > 0 ? `${stats.absent} alert notices pending` : "Full attendance recorded"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
              <span>Late / Half Day</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {stats.late + stats.halfDay}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Late: {stats.late} • Half: {stats.halfDay}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-100 text-xs font-medium">
              <span>Attendance Rate</span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black mt-2">{stats.pct}%</div>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.pct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter & Batch Action Toolbar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Class Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Target Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("all");
                }}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Classes Overview</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={selectedClassId === "all"}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="all">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Search */}
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
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
                <option value="LATE">Late Only</option>
                <option value="HALF_DAY">Half Day Only</option>
              </select>
            </div>
          </div>

          {/* Quick Mark Batch Actions */}
          {selectedClassId !== "all" && classStudents.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Quick Mark:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAll("PRESENT")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>All Present</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll("ABSENT")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>All Absent</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll("LATE")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition flex items-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>All Late</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {stats.absent > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkAbsentAlerts}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp Absent ({stats.absent})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Loading student roster and attendance marks...
            </p>
          </div>
        ) : selectedClassId === "all" ? (
          /* All Classes Overview Notice */
          <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 w-fit mx-auto mb-3">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Select a Class to Take Attendance
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
              Choose a specific classroom from the dropdown above to view student roll numbers, mark attendance, and dispatch parental notifications.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Link
                href="/admin/attendance/class-wise"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
              >
                View Class-wise Report →
              </Link>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-2">No Students Found</h3>
            <p className="text-xs text-gray-500 mt-1">No enrolled students matched the chosen filters or search query.</p>
          </div>
        ) : (
          /* Student Attendance Table */
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-16">Roll</th>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4">Parent Phone</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4">Remarks / Note</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStudents.map((student) => {
                    const status = attendanceMap[student.id] || "PRESENT";
                    const remarks = remarksMap[student.id] || "";
                    const guardianPhone = String(student.guardianPhone || student.phone || "");

                    return (
                      <tr
                        key={student.id}
                        className={`transition hover:bg-gray-50/70 dark:hover:bg-gray-800/60 ${
                          status === "ABSENT" ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                        }`}
                      >
                        {/* Roll Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-700 dark:text-gray-300">
                          {student.rollNumber !== undefined ? `#${student.rollNumber}` : "—"}
                        </td>

                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {student.name}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                ID: {student.studentId || student.admissionNumber || student.id.slice(0, 6)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Parent Phone */}
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                          {guardianPhone || "Not Provided"}
                        </td>

                        {/* Interactive Status Selector */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Present */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "PRESENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Present</span>
                            </button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "ABSENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
                              }`}
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Absent</span>
                            </button>

                            {/* Late */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "LATE")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "LATE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>Late</span>
                            </button>

                            {/* Half Day */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "HALF_DAY")}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                                status === "HALF_DAY"
                                  ? "bg-purple-600 text-white shadow-xs font-semibold"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600"
                              }`}
                              title="Half Day Attendance"
                            >
                              Half
                            </button>
                          </div>
                        </td>

                        {/* Remarks Input */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="Optional reason..."
                            value={remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {status === "ABSENT" && guardianPhone ? (
                            <button
                              type="button"
                              onClick={() => handleSendAbsentWhatsApp(student)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition"
                              title="Send WhatsApp Absent Notice"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Floating Bar */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredStudents.length} of {classStudents.length} enrolled students
              </div>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Class Attendance</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
