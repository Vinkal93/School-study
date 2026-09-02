"use client";

import { useEffect, useState } from "react";
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
  Filter,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getSchoolAttendanceForDate } from "@/lib/services/attendance.service";
import type { SchoolClass, AttendanceRecord } from "@/types";
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [clsList, attList] = await Promise.all([
        getClassesWithSections(schoolId),
        getSchoolAttendanceForDate(schoolId, selectedDate, selectedClassId, selectedSectionId),
      ]);
      setClasses(clsList);
      setRecords(attList);
    } catch (err) {
      console.error("Failed to load attendance report:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, selectedDate, selectedClassId, selectedSectionId]);

  const filteredRecords = records.filter((r) => {
    return (
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.className.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const totalCount = records.length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const availableSections =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

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
              School Attendance Overview & Reports
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor daily roll calls, attendance percentages, and class-by-class participation.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div>
              <label htmlFor="attendance-date" className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 cursor-pointer">
                Select Date:
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
            <label htmlFor="class-filter" className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Class / Grade:
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
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Section:
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            id="attendance-search"
            name="search"
            aria-label="Search student or class"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or class..."
            className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Recorded</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totalCount}</p>
          </div>
          <GraduationCap className="h-8 w-8 text-blue-500 opacity-80" />
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Present ({attendanceRate}%)</span>
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

      {/* Attendance Sheet Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No attendance records for {selectedDate}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Teachers haven&apos;t submitted roll call for this date yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Student</th>
                  <th className="py-3.5 px-4 font-medium">Admission No</th>
                  <th className="py-3.5 px-4 font-medium">Class & Section</th>
                  <th className="py-3.5 px-4 font-medium">Teacher</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
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
                      {r.teacherName || "Class Teacher"}
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
        )}
      </div>
    </div>
  </EntitlementGate>
);
}
