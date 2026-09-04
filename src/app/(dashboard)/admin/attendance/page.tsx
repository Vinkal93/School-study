"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  ClipboardCheck,
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

export default function AdminAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedSectionId, setSelectedSectionId] = useState("all");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load classes initially
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

  // Main data loader
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (selectedClassId === "all") {
        const attList = await getSchoolAttendanceForDate(
          schoolId,
          selectedDate,
          undefined,
          undefined
        );
        setRecords(attList);
        setClassStudents([]);
      } else {
        const [stuList, existingRecords] = await Promise.all([
          getStudentsByClassAndSection(schoolId, selectedClassId, selectedSectionId),
          getSchoolAttendanceForDate(schoolId, selectedDate, selectedClassId, selectedSectionId),
        ]);

        setClassStudents(stuList);
        setRecords(existingRecords);

        const existingMap: Record<string, AttendanceStatus> = {};
        existingRecords.forEach((r) => {
          existingMap[r.studentId] = r.status;
        });

        const initialMap: Record<string, AttendanceStatus> = {};
        stuList.forEach((s) => {
          initialMap[s.id] = existingMap[s.id] || "PRESENT";
        });
        setAttendanceMap(initialMap);
      }
    } catch (err) {
      console.error("Failed to load attendance data:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedDate, selectedClassId, selectedSectionId, profile?.role, canAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    toast.info(`Marked all students as ${status}.`);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

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

      const pCount = batchRecords.filter((r) => r.status === "PRESENT").length;
      const aCount = batchRecords.filter((r) => r.status === "ABSENT").length;
      const lCount = batchRecords.filter((r) => r.status === "LATE").length;

      toast.success(`Attendance saved! (${pCount} Present, ${aCount} Absent, ${lCount} Late)`);
      loadData();
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      toast.error(err.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Available sections for chosen class
  const availableSections =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

  // Filtered lists based on search query
  const queryLower = searchQuery.toLowerCase().trim();

  const filteredClassStudents = classStudents.filter((s) => {
    if (!queryLower) return true;
    const nameMatch = s.name?.toLowerCase().includes(queryLower);
    const idMatch = (s.studentId || "").toLowerCase().includes(queryLower);
    const admMatch = (s.admissionNumber || "").toLowerCase().includes(queryLower);
    const rollMatch = s.rollNumber !== undefined && s.rollNumber.toString() === queryLower;
    return nameMatch || idMatch || admMatch || rollMatch;
  });

  const filteredRecords = records.filter((r) => {
    if (!queryLower) return true;
    const nameMatch = r.studentName?.toLowerCase().includes(queryLower);
    const idMatch = (r.admissionNumber || "").toLowerCase().includes(queryLower);
    const classMatch = (r.className || "").toLowerCase().includes(queryLower);
    const rollMatch = r.rollNumber !== undefined && r.rollNumber.toString() === queryLower;
    return nameMatch || idMatch || classMatch || rollMatch;
  });

  // Calculate metrics
  let totalCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  if (selectedClassId !== "all") {
    totalCount = classStudents.length;
    classStudents.forEach((s) => {
      const st = attendanceMap[s.id];
      if (st === "PRESENT") presentCount++;
      else if (st === "ABSENT") absentCount++;
      else if (st === "LATE") lateCount++;
    });
  } else {
    totalCount = records.length;
    presentCount = records.filter((r) => r.status === "PRESENT").length;
    absentCount = records.filter((r) => r.status === "ABSENT").length;
    lateCount = records.filter((r) => r.status === "LATE").length;
  }

  const attendanceRate =
    totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="School Attendance Overview & Reports"
      description="Monitor daily roll calls, attendance percentages, and class-by-class participation."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              School Attendance Overview & Recording
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select class and date to take roll call, view daily rosters, and track attendance records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {selectedClassId !== "all" && classStudents.length > 0 && (
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Attendance
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div>
              <label
                htmlFor="attendance-date"
                className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 cursor-pointer"
              >
                Date
              </label>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <input
                  id="attendance-date"
                  name="attendanceDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="font-semibold text-gray-900 dark:text-white bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label
                htmlFor="class-filter"
                className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1"
              >
                Class
              </label>
              <select
                id="class-filter"
                name="classId"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("all");
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="all">All Classes (Report View)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={selectedClassId === "all"}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="all">All Sections</option>
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              id="attendance-search"
              name="search"
              aria-label="Search by student name, ID, or roll number"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID (SBCI1), Roll..."
              className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {selectedClassId !== "all" ? "Enrolled Active Students" : "Total Recorded"}
              </span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totalCount}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-blue-500 opacity-80" />
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Present ({attendanceRate}%)
              </span>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-0.5">{presentCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600 opacity-80" />
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-red-700 dark:text-red-400">Absent</span>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-0.5">{absentCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600 opacity-80" />
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Late</span>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-300 mt-0.5">{lateCount}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600 opacity-80" />
          </div>
        </div>

        {/* Action bar for specific class view */}
        {selectedClassId !== "all" && classStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
              <Users className="h-4 w-4" />
              <span>
                Class Roster: {classStudents.length} Active Students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll("PRESENT")}
                className="px-3 py-1 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("ABSENT")}
                className="px-3 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 flex items-center gap-1 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Mark All Absent
              </button>
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedClassId !== "all" ? (
            /* Specific Class Roster View */
            filteredClassStudents.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  No active students found in this class
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enroll students in this class to start tracking attendance.
                </p>
                <Link
                  href="/admin/students"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Go to Student Enrollment &rarr;
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4 font-medium w-20">Roll No</th>
                      <th className="py-3.5 px-4 font-medium">Student Name</th>
                      <th className="py-3.5 px-4 font-medium">Student ID</th>
                      <th className="py-3.5 px-4 font-medium">Section</th>
                      <th className="py-3.5 px-4 font-medium text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredClassStudents.map((s) => {
                      const currentStatus = attendanceMap[s.id] || "PRESENT";
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="py-3.5 px-4">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {s.rollNumber ?? "-"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                            {s.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                              {s.studentId || s.admissionNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {s.sectionName || "Section A"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, "PRESENT")}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  currentStatus === "PRESENT"
                                    ? "bg-green-600 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, "ABSENT")}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  currentStatus === "ABSENT"
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, "LATE")}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  currentStatus === "LATE"
                                    ? "bg-orange-500 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* All Classes Recorded Report View */
            filteredRecords.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  No attendance records for {selectedDate}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select a specific class above to record attendance for today, or wait for teachers to submit roll call.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4 font-medium w-16">Roll</th>
                      <th className="py-3.5 px-4 font-medium">Student</th>
                      <th className="py-3.5 px-4 font-medium">Student ID</th>
                      <th className="py-3.5 px-4 font-medium">Class & Section</th>
                      <th className="py-3.5 px-4 font-medium">Teacher</th>
                      <th className="py-3.5 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-400">
                          {r.rollNumber ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {r.rollNumber}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                          {r.studentName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                            {r.admissionNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <BookOpen className="h-3 w-3" />
                            {r.className} ({r.sectionName})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400">
                          {r.teacherName || "School Admin"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              r.status === "PRESENT"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : r.status === "ABSENT"
                                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            }`}
                          >
                            {r.status === "PRESENT" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : r.status === "ABSENT" ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </EntitlementGate>
  );
}
