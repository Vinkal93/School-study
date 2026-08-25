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
  ArrowLeft,
  Loader2,
  RefreshCw,
  Save,
  BookOpen,
  UserCheck,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import {
  saveBatchAttendance,
  getClassAttendanceForDate,
} from "@/lib/services/attendance.service";
import type { TeacherProfile, StudentProfile, SchoolClass, AttendanceStatus } from "@/types";
import { toast } from "sonner";

export default function TeacherAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [teacherData, setTeacherData] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initial Load: Teacher Profile & Classes
  useEffect(() => {
    async function loadInitial() {
      if (!schoolId || !profile?.uid) return;
      setLoading(true);
      try {
        const db = getFirebaseDb();
        const [tchSnap, clsList] = await Promise.all([
          getDocs(
            query(
              collection(db, "schools", schoolId, "teachers"),
              where("userId", "==", profile.uid)
            )
          ),
          getClassesWithSections(schoolId),
        ]);

        setClasses(clsList);

        if (!tchSnap.empty) {
          const tch = {
            id: tchSnap.docs[0].id,
            ...tchSnap.docs[0].data(),
          } as TeacherProfile;
          setTeacherData(tch);

          if (tch.assignedClassId) {
            setSelectedClassId(tch.assignedClassId);
            setSelectedSectionId(tch.assignedSectionId || "");
          } else if (clsList.length > 0) {
            setSelectedClassId(clsList[0].id);
            setSelectedSectionId(clsList[0].sections?.[0]?.id || "");
          }
        } else if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
          setSelectedSectionId(clsList[0].sections?.[0]?.id || "");
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [schoolId, profile?.uid]);

  // 2. Load Students & Previous marks
  useEffect(() => {
    async function loadRosterAndMarks() {
      if (!schoolId || !selectedClassId) return;
      setLoadingStudents(true);
      try {
        const [stuList, existingMarks] = await Promise.all([
          getStudentsByClassAndSection(schoolId, selectedClassId, selectedSectionId),
          selectedSectionId
            ? getClassAttendanceForDate(schoolId, selectedClassId, selectedSectionId, selectedDate)
            : Promise.resolve({} as Record<string, AttendanceStatus>),
        ]);

        setStudents(stuList);

        const initialMap: Record<string, AttendanceStatus> = {};
        stuList.forEach((s) => {
          initialMap[s.id] = existingMarks[s.id] || "PRESENT";
        });
        setAttendanceMap(initialMap);
      } catch (err) {
        console.error("Failed to load students/marks:", err);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadRosterAndMarks();
  }, [schoolId, selectedClassId, selectedSectionId, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    toast.info(`Marked all students as ${status}.`);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClassId || students.length === 0) {
      toast.error("No class or students selected.");
      return;
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const selectedSection = selectedClass?.sections?.find((s) => s.id === selectedSectionId);

    setIsSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        admissionNumber: s.admissionNumber,
        status: attendanceMap[s.id] || ("PRESENT" as AttendanceStatus),
      }));

      await saveBatchAttendance(schoolId, {
        classId: selectedClassId,
        className: selectedClass?.name || "",
        sectionId: selectedSectionId,
        sectionName: selectedSection?.name || "",
        teacherId: teacherData?.id || profile?.uid || "",
        teacherName: teacherData?.name || profile?.name || "",
        date: selectedDate,
        records,
      });

      const presentCount = records.filter((r) => r.status === "PRESENT").length;
      const absentCount = records.filter((r) => r.status === "ABSENT").length;
      const lateCount = records.filter((r) => r.status === "LATE").length;

      toast.success(
        `Attendance recorded! (${presentCount} Present, ${absentCount} Absent, ${lateCount} Late)`
      );
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      toast.error(err.message || "Failed to submit attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableSections =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

  const presentCount = Object.values(attendanceMap).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(attendanceMap).filter((s) => s === "LATE").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Roll Call & Attendance
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Fast, single-tap roll call optimized for mobile and desktop.
            </p>
          </div>

          <button
            onClick={handleSubmitAttendance}
            disabled={isSaving || students.length === 0}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit Attendance
              </>
            )}
          </button>
        </div>
      </div>

      {/* Controls Bar: Class, Section, Date */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Class / Grade:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const newCId = e.target.value;
                setSelectedClassId(newCId);
                const cls = classes.find((c) => c.id === newCId);
                setSelectedSectionId(cls?.sections?.[0]?.id || "");
              }}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Section:
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Date:
            </label>
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full font-semibold text-gray-900 dark:text-white bg-transparent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Bulk Buttons */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
          <button
            onClick={() => handleMarkAll("PRESENT")}
            className="flex-1 sm:flex-initial rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800/50"
          >
            All Present
          </button>
          <button
            onClick={() => handleMarkAll("ABSENT")}
            className="flex-1 sm:flex-initial rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/50"
          >
            All Absent
          </button>
        </div>
      </div>

      {/* Summary Pills Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 text-center dark:border-gray-800 dark:bg-gray-950 shadow-sm">
          <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{students.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 sm:p-4 text-center dark:border-green-900/40 dark:bg-green-950/20 shadow-sm">
          <span className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-400">Present</span>
          <p className="text-lg sm:text-2xl font-bold text-green-800 dark:text-green-300 mt-0.5">{presentCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 sm:p-4 text-center dark:border-red-900/40 dark:bg-red-950/20 shadow-sm">
          <span className="text-[10px] sm:text-xs font-medium text-red-700 dark:text-red-400">Absent</span>
          <p className="text-lg sm:text-2xl font-bold text-red-800 dark:text-red-300 mt-0.5">{absentCount}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 sm:p-4 text-center dark:border-orange-900/40 dark:bg-orange-950/20 shadow-sm">
          <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-400">Late</span>
          <p className="text-lg sm:text-2xl font-bold text-orange-800 dark:text-orange-300 mt-0.5">{lateCount}</p>
        </div>
      </div>

      {/* ==========================================
          ATTENDANCE LIST (RESPONSIVE CARDS + TABLE)
      ========================================== */}
      {loading || loadingStudents ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-xs font-medium text-gray-500">Loading student roster...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            No students found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select another class or section above.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Touch Cards with 48px Touch Targets */}
          <div className="block sm:hidden space-y-3">
            {students.map((s, idx) => {
              const currentStatus = attendanceMap[s.id] || "PRESENT";
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 shadow-sm transition-all ${
                    currentStatus === "PRESENT"
                      ? "border-green-200 bg-green-50/20 dark:border-green-900/40 dark:bg-green-950/10"
                      : currentStatus === "ABSENT"
                      ? "border-red-200 bg-red-50/20 dark:border-red-900/40 dark:bg-red-950/10"
                      : "border-orange-200 bg-orange-50/20 dark:border-orange-900/40 dark:bg-orange-950/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {s.name}
                        </h4>
                        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                          {s.admissionNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 48px Large Touch Target Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(s.id, "PRESENT")}
                      className={`min-h-[48px] rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        currentStatus === "PRESENT"
                          ? "bg-green-600 text-white shadow-md ring-2 ring-green-600"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Present
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(s.id, "ABSENT")}
                      className={`min-h-[48px] rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        currentStatus === "ABSENT"
                          ? "bg-red-600 text-white shadow-md ring-2 ring-red-600"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Absent
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(s.id, "LATE")}
                      className={`min-h-[48px] rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        currentStatus === "LATE"
                          ? "bg-orange-500 text-white shadow-md ring-2 ring-orange-500"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Fast Table */}
          <div className="hidden sm:block rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium w-12 text-center">#</th>
                  <th className="py-3.5 px-4 font-medium">Student</th>
                  <th className="py-3.5 px-4 font-medium">Admission No</th>
                  <th className="py-3.5 px-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {students.map((s, idx) => {
                  const currentStatus = attendanceMap[s.id] || "PRESENT";
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {s.name.charAt(0)}
                          </div>
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                          {s.admissionNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "PRESENT")}
                            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                              currentStatus === "PRESENT"
                                ? "bg-green-600 text-white shadow-sm ring-2 ring-green-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PRESENT
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "ABSENT")}
                            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                              currentStatus === "ABSENT"
                                ? "bg-red-600 text-white shadow-sm ring-2 ring-red-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            ABSENT
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "LATE")}
                            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                              currentStatus === "LATE"
                                ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            LATE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ==========================================
          MOBILE STICKY BOTTOM SUBMISSION BAR
      ========================================== */}
      <div className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-between border-t border-gray-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur sm:hidden dark:border-gray-800 dark:bg-gray-950/95">
        <div className="text-xs">
          <span className="font-bold text-gray-900 dark:text-white">
            {presentCount} Present
          </span>
          <span className="text-gray-400 mx-1">•</span>
          <span className="font-bold text-red-600">
            {absentCount} Absent
          </span>
        </div>

        <button
          onClick={handleSubmitAttendance}
          disabled={isSaving || students.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Attendance
            </>
          )}
        </button>
      </div>
    </div>
  );
}
