"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Users,
  Search,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Layers,
  Phone,
  User as UserIcon,
  Check,
  X,
  Volume2,
  RefreshCw,
  MoreVertical,
  HelpCircle,
  Filter,
  CheckCheck,
  ChevronDown,
  LayoutList,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveBatchAttendance,
  getClassAttendanceForDate,
} from "@/lib/services/attendance.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { SchoolClass, StudentProfile, AttendanceStatus } from "@/types";

interface SmartSwipeAttendanceProps {
  schoolId: string;
  initialClassId?: string;
  initialSectionId?: string;
  initialDate?: string;
  userRole?: "teacher" | "school_admin" | "super_admin";
  teacherId?: string;
  teacherName?: string;
  classes: SchoolClass[];
  onBack?: () => void;
  subjects?: Array<{ id: string; name: string; period?: string; time?: string }>;
}

export function SmartSwipeAttendance({
  schoolId,
  initialClassId,
  initialSectionId,
  initialDate,
  userRole = "teacher",
  teacherId = "teacher_current",
  teacherName = "Teacher",
  classes = [],
  onBack,
  subjects = [
    { id: "sub_math", name: "Mathematics", period: "Period 2", time: "10:00 - 10:45" },
    { id: "sub_eng", name: "English", period: "Period 1", time: "09:00 - 09:45" },
    { id: "sub_sci", name: "Science", period: "Period 3", time: "11:00 - 11:45" },
    { id: "sub_daily", name: "Daily Morning Roll Call", period: "Homeroom", time: "08:30 - 09:00" },
  ],
}: SmartSwipeAttendanceProps) {
  // Navigation / Mode state
  const [activeMode, setActiveMode] = useState<"overview" | "swipe" | "completion">("overview");

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || classes[0]?.id || ""
  );
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || classes[0],
    [classes, selectedClassId]
  );

  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSectionId || selectedClass?.sections?.[0]?.id || ""
  );
  const selectedSection = useMemo(
    () => selectedClass?.sections?.find((s) => s.id === selectedSectionId) || selectedClass?.sections?.[0],
    [selectedClass, selectedSectionId]
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  // Student and Attendance data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Swipe Card Stack Index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Undo history stack
  const [history, setHistory] = useState<
    Array<{ studentId: string; studentName: string; previousStatus?: AttendanceStatus; newStatus: AttendanceStatus }>
  >([]);
  const [lastActionToast, setLastActionToast] = useState<{
    studentName: string;
    status: AttendanceStatus;
  } | null>(null);

  // List search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus | "UNMARKED">("all");

  // Auto-sync selectedClassId and selectedSectionId when classes prop loads or changes
  useEffect(() => {
    if (classes.length > 0) {
      if (!selectedClassId || !classes.some((c) => c.id === selectedClassId)) {
        const firstClass = classes[0];
        setSelectedClassId(firstClass.id);
        if (firstClass.sections && firstClass.sections.length > 0) {
          setSelectedSectionId(firstClass.sections[0].id);
        }
      }
    } else {
      setLoading(false);
    }
  }, [classes, selectedClassId]);

  // Sync section if class changes
  useEffect(() => {
    if (selectedClass && selectedClass.sections && selectedClass.sections.length > 0) {
      if (!selectedClass.sections.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(selectedClass.sections[0].id);
      }
    } else {
      setSelectedSectionId("");
    }
  }, [selectedClass, selectedSectionId]);

  // Load students and existing attendance records
  const loadClassData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    const effectiveClassId = selectedClassId || selectedClass?.id;
    if (!effectiveClassId) {
      if (classes.length === 0) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const effectiveSectionId = selectedSectionId || selectedSection?.id || undefined;
      const [initialStudentList, attRecords] = await Promise.all([
        getStudentsByClassAndSection(schoolId, effectiveClassId, effectiveSectionId),
        getClassAttendanceForDate(schoolId, effectiveClassId, effectiveSectionId || "", selectedDate),
      ]);

      let finalStudents = initialStudentList || [];
      // Fallback: If section filter yielded 0 students, load all students for the class
      if (finalStudents.length === 0 && effectiveSectionId) {
        const classRoster = await getStudentsByClassAndSection(schoolId, effectiveClassId);
        if (classRoster && classRoster.length > 0) {
          finalStudents = classRoster;
        }
      }

      setStudents(finalStudents);
      setAttendanceMap(attRecords || {});

      // Point currentIndex to the first unmarked student if available
      const firstUnmarked = (finalStudents || []).findIndex((s) => !attRecords?.[s.id]);
      setCurrentIndex(firstUnmarked !== -1 ? firstUnmarked : 0);
    } catch (err: any) {
      console.error("[SmartSwipeAttendance] Error loading class records:", err);
      toast.error(err.message || "Failed to load class attendance.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedClassId, selectedSectionId, selectedDate, classes.length]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Derived counts
  const totalStudents = students.length;
  const presentCount = useMemo(
    () => students.filter((s) => attendanceMap[s.id] === "PRESENT").length,
    [students, attendanceMap]
  );
  const absentCount = useMemo(
    () => students.filter((s) => attendanceMap[s.id] === "ABSENT").length,
    [students, attendanceMap]
  );
  const lateCount = useMemo(
    () => students.filter((s) => attendanceMap[s.id] === "LATE").length,
    [students, attendanceMap]
  );
  const markedCount = presentCount + absentCount + lateCount;
  const progressPercent = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0;

  // Filtered students for Overview List
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const matchesSearch =
        q === "" ||
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.rollNumber || "").toLowerCase().includes(q) ||
        String(s.admissionNumber || (s as any).studentId || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const currentStatus = attendanceMap[s.id];
      if (statusFilter === "all") return true;
      if (statusFilter === "UNMARKED") return !currentStatus;
      return currentStatus === statusFilter;
    });
  }, [students, attendanceMap, searchQuery, statusFilter]);

  // Format Date for Display: e.g. "Mon, 27 Jan 2025"
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Mark student attendance (optimistic UI + instant atomic persistence)
  const handleMarkAttendance = async (
    studentId: string,
    newStatus: AttendanceStatus,
    advanceCard = true
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const previousStatus = attendanceMap[studentId];

    // Optimistic state update
    setAttendanceMap((prev) => ({ ...prev, [studentId]: newStatus }));
    setHistory((prev) => [
      ...prev,
      { studentId, studentName: student.name, previousStatus, newStatus },
    ]);
    setLastActionToast({ studentName: student.name, status: newStatus });

    // Advance card if in Swipe mode
    if (advanceCard) {
      if (currentIndex + 1 >= students.length) {
        setTimeout(() => setActiveMode("completion"), 400);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }

    // Persist to Firestore idempotently
    try {
      await saveBatchAttendance(schoolId, {
        classId: selectedClassId,
        className: selectedClass?.name || "",
        sectionId: selectedSectionId || "sec_default",
        sectionName: selectedSection?.name || "Section A",
        teacherId,
        teacherName,
        date: selectedDate,
        records: [
          {
            studentId: student.id,
            studentName: student.name,
            admissionNumber: student.admissionNumber || student.studentId || student.id,
            rollNumber: student.rollNumber,
            status: newStatus,
          },
        ],
      });
    } catch (err: any) {
      console.error("[SmartSwipeAttendance] Save error:", err);
      toast.error("Network notice: Could not sync attendance. Retrying...");
      // Revert optimistic update on failure
      setAttendanceMap((prev) => {
        const next = { ...prev };
        if (previousStatus) next[studentId] = previousStatus;
        else delete next[studentId];
        return next;
      });
    }
  };

  // Undo last marked action
  const handleUndo = async () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const prevHistory = history.slice(0, -1);
    setHistory(prevHistory);

    // Revert in local map
    setAttendanceMap((prev) => {
      const next = { ...prev };
      if (last.previousStatus) {
        next[last.studentId] = last.previousStatus;
      } else {
        delete next[last.studentId];
      }
      return next;
    });

    setLastActionToast(null);

    // Adjust card index back if in swipe mode
    if (activeMode === "swipe" && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (activeMode === "completion") {
      setActiveMode("swipe");
      setCurrentIndex(students.length - 1);
    }

    toast.info(`Restored ${last.studentName} to ${last.previousStatus || "Unmarked"}`);

    // Persist undo to backend
    try {
      const student = students.find((s) => s.id === last.studentId);
      if (student && last.previousStatus) {
        await saveBatchAttendance(schoolId, {
          classId: selectedClassId,
          className: selectedClass?.name || "",
          sectionId: selectedSectionId || "sec_default",
          sectionName: selectedSection?.name || "Section A",
          teacherId,
          teacherName,
          date: selectedDate,
          records: [
            {
              studentId: student.id,
              studentName: student.name,
              admissionNumber: student.admissionNumber || student.id,
              rollNumber: student.rollNumber,
              status: last.previousStatus,
            },
          ],
        });
      }
    } catch (e) {
      console.warn("Undo persistence error:", e);
    }
  };

  // Current student being evaluated in swipe deck
  const currentStudent = students[currentIndex];
  const nextStudent = students[currentIndex + 1];
  const thirdStudent = students[currentIndex + 2];

  // Motion Values for Tinder Gestures
  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-220, 220], [-18, 18]);
  const presentBadgeOpacity = useTransform(dragX, [30, 110], [0, 1]);
  const absentBadgeOpacity = useTransform(dragX, [-110, -30], [1, 0]);
  const cardGreenGlow = useTransform(dragX, [0, 150], [0, 0.4]);
  const cardRedGlow = useTransform(dragX, [-150, 0], [0.4, 0]);

  // Keyboard navigation for accessible desktop usage
  useEffect(() => {
    if (activeMode !== "swipe") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        if (currentStudent) handleMarkAttendance(currentStudent.id, "PRESENT");
      } else if (e.key === "ArrowLeft") {
        if (currentStudent) handleMarkAttendance(currentStudent.id, "ABSENT");
      } else if (e.key.toLowerCase() === "l") {
        if (currentStudent) handleMarkAttendance(currentStudent.id, "LATE");
      } else if (e.key.toLowerCase() === "z" || (e.ctrlKey && e.key.toLowerCase() === "z")) {
        handleUndo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMode, currentStudent, currentIndex, history]);

  // Swipe drag handler
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 95;
    if (info.offset.x > threshold) {
      // Swiped Right -> Present
      if (currentStudent) handleMarkAttendance(currentStudent.id, "PRESENT");
    } else if (info.offset.x < -threshold) {
      // Swiped Left -> Absent
      if (currentStudent) handleMarkAttendance(currentStudent.id, "ABSENT");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors">
      {/* =========================================================================
          SCREEN 1: ATTENDANCE DASHBOARD / OVERVIEW
      ========================================================================== */}
      {activeMode === "overview" && (
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">
                  StudySchool
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  School Study Software
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMode("swipe")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Swipe Mode</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Module Title Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Attendance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mark and manage class attendance with Smart Swipe 3.0
                </p>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              {/* Date Input with Formatted Display */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Attendance Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Class & Subject Two-Column Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Class & Section
                  </label>
                  <div className="relative flex items-center">
                    <Layers className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {selectedSection?.name ? `(${selectedSection.name})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Period / Subject
                  </label>
                  <div className="relative flex items-center">
                    <BookOpen className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} {sub.period ? `(${sub.period})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Summary Cards Row (Matching Reference Screen 1) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Students */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase">Total</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100">
                {totalStudents}
              </span>
            </div>

            {/* Present */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase">Present</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                {presentCount}
              </span>
            </div>

            {/* Absent */}
            <div className="p-3.5 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 mb-1">
                <XCircle className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase">Absent</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-red-950 dark:text-red-100">
                {absentCount}
              </span>
            </div>

            {/* Late */}
            <div className="hidden sm:block p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase">Late</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                {lateCount}
              </span>
            </div>
          </div>

          {/* Attendance Progress Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">Attendance Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 dark:text-white font-mono">
                  {markedCount} / {totalStudents} marked
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                  {progressPercent}%
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Student List View with Search & Quick Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Student List ({filteredStudents.length})
                </h3>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="pl-2.5 pr-7 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
                  >
                    <option value="all">All Students</option>
                    <option value="PRESENT">Present ({presentCount})</option>
                    <option value="ABSENT">Absent ({absentCount})</option>
                    <option value="LATE">Late ({lateCount})</option>
                    <option value="UNMARKED">Unmarked</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>

            {/* Students Scrollable Roster */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex h-36 items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <Users className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    No students match the chosen filters
                  </p>
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const status = attendanceMap[st.id];
                  return (
                    <div
                      key={st.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Student Avatar */}
                        <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.name} className="h-full w-full object-cover" />
                          ) : (
                            st.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {st.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            Roll No. {String(st.rollNumber || 1).padStart(2, "0")} | {selectedClass?.name}{" "}
                            ({selectedSection?.name || "A"})
                          </p>
                        </div>
                      </div>

                      {/* Quick 1-Tap Mark Action Pills in List Mode */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st.id, "PRESENT", false)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            status === "PRESENT"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st.id, "ABSENT", false)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            status === "ABSENT"
                              ? "bg-red-600 text-white shadow-xs"
                              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100"
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st.id, "LATE", false)}
                          className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            status === "LATE"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          L
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Bottom Primary CTA (Matching Reference Screen 1) */}
          <div className="sticky bottom-4 pt-2">
            <button
              type="button"
              onClick={() => {
                if (students.length === 0) {
                  toast.error("No students enrolled in this class to mark.");
                  return;
                }
                setActiveMode("swipe");
              }}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 text-white text-sm font-extrabold shadow-xl shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Taking Attendance</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2 & 3: SMART SWIPE ATTENDANCE (TINDER-STYLE 3D CARD STACK)
      ========================================================================== */}
      {activeMode === "swipe" && (
        <div className="max-w-md mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
          {/* Top Bar with Back Arrow & Class Subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveMode("overview")}
                className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
                title="Back to List"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Attendance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {selectedClass?.name} ({selectedSection?.name || "A"}) · {selectedSubject.name} (
                  {selectedSubject.period || "P1"})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMode("overview")}
                className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                title="Toggle List View"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Subheader: Formatted Date & Student Index Counter (e.g. "1 / 40") */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>{formattedDate}</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-extrabold">
              {totalStudents > 0 ? currentIndex + 1 : 0} / {totalStudents}
            </div>
          </div>

          {/* Undo Confirmation Floating Pill (Matching Reference Screen 3) */}
          <AnimatePresence>
            {lastActionToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    {lastActionToast.studentName} marked {lastActionToast.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-black hover:bg-emerald-100 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Undo</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Counters Row (Matching Reference Screen 3) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-blue-600 block">Total</span>
              <span className="text-base font-black text-blue-950 dark:text-blue-100 font-mono">
                {totalStudents}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Present</span>
              <span className="text-base font-black text-emerald-950 dark:text-emerald-100 font-mono">
                {presentCount}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-red-600 block">Absent</span>
              <span className="text-base font-black text-red-950 dark:text-red-100 font-mono">
                {absentCount}
              </span>
            </div>
          </div>

          {/* Instruction Guide Banner (Matching Reference Screen 2) */}
          <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <p className="font-extrabold text-emerald-900 dark:text-emerald-200">
                Swipe right to mark Present
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Swipe left for Absent · Tap button for Late
              </p>
            </div>
          </div>

          {/* =========================================================================
              3D CARD STACK CONTAINER
          ========================================================================== */}
          <div className="relative h-[410px] w-full flex items-center justify-center pt-2">
            {/* Background Layer 3 (Third card in stack) */}
            {thirdStudent && (
              <div
                className="absolute w-[92%] h-[375px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-md pointer-events-none transition-all duration-300"
                style={{
                  transform: "translateY(28px) scale(0.90)",
                  opacity: 0.55,
                  zIndex: 1,
                }}
              />
            )}

            {/* Background Layer 2 (Next card in stack) */}
            {nextStudent && (
              <div
                className="absolute w-[96%] h-[380px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg pointer-events-none transition-all duration-300"
                style={{
                  transform: "translateY(14px) scale(0.95)",
                  opacity: 0.85,
                  zIndex: 2,
                }}
              />
            )}

            {/* Foreground Active Interactive Top Card */}
            {currentStudent ? (
              <motion.div
                key={currentStudent.id}
                style={{
                  x: dragX,
                  rotate: cardRotate,
                  zIndex: 10,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.65}
                onDragEnd={handleDragEnd}
                className="absolute w-full h-[385px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between select-none cursor-grab active:cursor-grabbing overflow-hidden"
              >
                {/* Floating "Mark Present" Badge (Top-Right, activates when swiping right) */}
                <motion.div
                  style={{ opacity: presentBadgeOpacity }}
                  className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-2xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark Present</span>
                  <span>&gt;&gt;</span>
                </motion.div>

                {/* Floating "Mark Absent" Badge (Top-Left, activates when swiping left) */}
                <motion.div
                  style={{ opacity: absentBadgeOpacity }}
                  className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-500/30"
                >
                  <span>&lt;&lt;</span>
                  <X className="h-4 w-4" />
                  <span>Mark Absent</span>
                </motion.div>

                {/* Dynamic Drag Gradient Overlay */}
                <motion.div
                  style={{ opacity: cardGreenGlow }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent to-emerald-500 pointer-events-none rounded-3xl"
                />
                <motion.div
                  style={{ opacity: cardRedGlow }}
                  className="absolute inset-0 bg-gradient-to-l from-transparent to-red-500 pointer-events-none rounded-3xl"
                />

                {/* Student Photo Section (Matching Reference Screen 2 & 3) */}
                <div className="flex flex-col items-center text-center mt-2 z-10">
                  <div className="h-32 w-32 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800">
                    {currentStudent.photoUrl ? (
                      <img
                        src={currentStudent.photoUrl}
                        alt={currentStudent.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      currentStudent.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-4">
                    {currentStudent.name}
                  </h3>

                  {/* Previous status pill if student already marked today */}
                  {attendanceMap[currentStudent.id] && (
                    <span
                      className={`mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        attendanceMap[currentStudent.id] === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : attendanceMap[currentStudent.id] === "ABSENT"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      Currently: {attendanceMap[currentStudent.id]}
                    </span>
                  )}
                </div>

                {/* Meta details: Roll No, Class, Parent Contact */}
                <div className="space-y-2 py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 z-10">
                  <div className="flex items-center gap-2 font-bold">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Roll No. {String(currentStudent.rollNumber || 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-medium">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {selectedClass?.name} ({selectedSection?.name || "Sec. A"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Parent: {currentStudent.guardianPhone || currentStudent.phone || "+91 98765 43210"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* All cards swiped placeholder */
              <div className="w-full h-[385px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCheck className="h-12 w-12 text-emerald-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  All Students Reviewed!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  You have reviewed attendance for all {totalStudents} students in this class.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMode("completion")}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer hover:bg-blue-700"
                >
                  View Attendance Summary
                </button>
              </div>
            )}
          </div>

          {/* Bottom Action Controls (Matching Reference Screen 2 & 3) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (currentStudent) handleMarkAttendance(currentStudent.id, "ABSENT");
              }}
              className="py-3 px-4 rounded-2xl border-2 border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-red-100 cursor-pointer active:scale-98 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Swipe Left · Mark Absent</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentStudent) handleMarkAttendance(currentStudent.id, "PRESENT");
              }}
              className="py-3 px-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-100 cursor-pointer active:scale-98 transition-all"
            >
              <span>Swipe Right · Mark Present</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Optional Late Action & Attendance Progress Bar */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (currentStudent) handleMarkAttendance(currentStudent.id, "LATE");
                }}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Mark {currentStudent?.name || "Student"} Late</span>
              </button>

              <span className="text-xs font-mono font-bold text-slate-500">
                {markedCount} / {totalStudents} marked ({progressPercent}%)
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: COMPLETION SUMMARY & ATTENDANCE VERIFICATION
      ========================================================================== */}
      {activeMode === "completion" && (
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-md">
              <CheckCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Attendance Completed!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {selectedClass?.name} ({selectedSection?.name || "A"}) · {formattedDate}
            </p>
          </div>

          {/* Key Summary Breakdown Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {totalStudents}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Present</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {presentCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200/60">
                <span className="text-[10px] font-extrabold uppercase text-red-600 block">Absent</span>
                <span className="text-xl font-black text-red-700 dark:text-red-300 font-mono">
                  {absentCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60">
                <span className="text-[10px] font-extrabold uppercase text-amber-600 block">Late</span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  {lateCount}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Overall Attendance</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">
                  {presentCount} of {totalStudents} students attended
                </p>
              </div>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveMode("overview")}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-500/25 hover:bg-blue-700 cursor-pointer transition-all"
            >
              Review Attendance & Student Roster
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setActiveMode("swipe");
              }}
              className="w-full py-3 px-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all"
            >
              Re-take Swipe Attendance from Start
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
