"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Upload,
  FileCheck,
  Search,
  Phone,
  Mail,
  ChevronRight,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  subscribeToStudyMaterials,
  subscribeToTeacherTests,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import { getClassBells, getCurrentDayOfWeek } from "@/lib/services/timetable.service";
import { subscribeToClassHomework } from "@/lib/services/homework.service";
import type { TeacherProfile, StudentProfile, StudyMaterial, TeacherTest } from "@/types";
import type { HomeworkItem, ClassBell } from "@/types/timetable";

type TabKey =
  | "overview"
  | "students"
  | "attendance"
  | "homework"
  | "study"
  | "tests"
  | "timetable";

export default function TeacherClassesPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlClassId = searchParams.get("classId");

  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Tab State
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Tab Specific Data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [tests, setTests] = useState<TeacherTest[]>([]);
  const [bells, setBells] = useState<ClassBell[]>([]);

  const currentDay = getCurrentDayOfWeek();

  // 1. Initial Load of Teacher Classes
  useEffect(() => {
    async function init() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setTeacher(ctx.teacher);
        setClasses(ctx.assignedClasses);

        // Resolve default selected class
        const matched = ctx.assignedClasses.find((c) => c.classId === urlClassId);
        if (matched) {
          setSelectedClassId(matched.classId);
        } else if (ctx.assignedClasses.length > 0) {
          setSelectedClassId(ctx.assignedClasses[0].classId);
        }
      } catch (err) {
        console.error("Failed to load teacher classes:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail, urlClassId]);

  // Selected Class Object
  const selectedClass = useMemo(() => {
    return classes.find((c) => c.classId === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // 2. Load Class Details when selectedClass changes
  useEffect(() => {
    if (!schoolId || !selectedClass?.classId) return;

    // A. Load Students
    setLoadingStudents(true);
    getStudentsByClassAndSection(schoolId, selectedClass.classId, selectedClass.sectionId)
      .then((res) => setStudents(res))
      .catch((err) => console.error("Error loading students:", err))
      .finally(() => setLoadingStudents(false));

    // B. Subscriptions to Homework, Materials, Tests, Bells
    const unsubHw = subscribeToClassHomework(
      schoolId,
      selectedClass.classId,
      selectedClass.sectionId,
      (hwList) => setHomework(hwList)
    );

    const unsubMat = subscribeToStudyMaterials(
      schoolId,
      selectedClass.classId,
      (matList) => setMaterials(matList)
    );

    const unsubTests = subscribeToTeacherTests(
      schoolId,
      selectedClass.classId,
      (testList) => setTests(testList)
    );

    getClassBells(schoolId, selectedClass.classId, currentDay)
      .then((res) => setBells(res))
      .catch(() => setBells([]));

    return () => {
      unsubHw();
      unsubMat();
      unsubTests();
    };
  }, [schoolId, selectedClass?.classId, selectedClass?.sectionId, currentDay]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNumber?.toString().includes(q) ||
        s.studentId?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              My Classes & Classroom Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your classrooms, student roster, daily roll calls, homework assignments, and curriculum materials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
            >
              <ClipboardCheck className="h-4 w-4" />
              Take Attendance
            </Link>
            <Link
              href="/teacher/homework"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Add Homework
            </Link>
          </div>
        </div>
      </div>

      {/* Class Selector Carousel / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {classes.map((c) => {
          const isSelected = c.classId === selectedClass?.classId;
          return (
            <div
              key={c.classId}
              onClick={() => setSelectedClassId(c.classId)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20 dark:bg-blue-950/30 dark:border-blue-500"
                  : "border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                  {c.sectionName ? `Sec ${c.sectionName}` : "Classroom"}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {c.className}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {c.subject || "All Subjects"}
              </p>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {c.studentCount || 0} Students
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                  {isSelected ? "Selected" : "Open Hub"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Class Workspace */}
      {selectedClass && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Header Banner */}
          <div className="border-b border-slate-200/80 p-6 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                  {selectedClass.className.replace("Class ", "")}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedClass.className}{" "}
                    {selectedClass.sectionName ? `(Section ${selectedClass.sectionName})` : ""}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Subject: <strong className="text-slate-800 dark:text-slate-200">{selectedClass.subject || "General"}</strong> •{" "}
                    Enrolled: {students.length} Students
                  </p>
                </div>
              </div>

              {/* Tab navigation pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(
                  [
                    { id: "overview", label: "Overview", icon: BookOpen },
                    { id: "students", label: `Students (${students.length})`, icon: GraduationCap },
                    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
                    { id: "homework", label: `Homework (${homework.length})`, icon: ClipboardList },
                    { id: "study", label: `Study (${materials.length})`, icon: Upload },
                    { id: "tests", label: `Tests (${tests.length})`, icon: FileCheck },
                    { id: "timetable", label: "Timetable", icon: Clock },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        isActive
                          ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Roster Size
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {students.length} Students
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Active enrollments</p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Active Homework
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {homework.length} Assignments
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned to this class</p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    Study References
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {materials.length} Materials
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Available on student portal</p>
                </div>
              </div>

              {/* Quick Actions for this class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daily Roll Call
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mark today&apos;s attendance for {selectedClass.className}
                    </p>
                  </div>
                  <Link
                    href={`/teacher/attendance?classId=${selectedClass.classId}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Open Sheet
                  </Link>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Homework & Homework Bells
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assign homework connected to scheduled timetable periods
                    </p>
                  </div>
                  <Link
                    href={`/teacher/homework?classId=${selectedClass.classId}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Assign
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === "students" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredStudents.length} of {students.length} students
                </span>
              </div>

              {loadingStudents ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading class roster...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No students found in this class roster.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-y border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Roll</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Admission / ID</th>
                        <th className="py-2.5 px-3">Guardian Phone</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            #{stu.rollNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100">
                            {stu.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {stu.studentId || stu.admissionNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 flex items-center gap-1.5">
                            {stu.guardianPhone || stu.phone ? (
                              <>
                                <Phone className="h-3 w-3 text-slate-400" />
                                {stu.guardianPhone || stu.phone}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Class Attendance Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live roll call and attendance log for {selectedClass.className}
                  </p>
                </div>
                <Link
                  href={`/teacher/attendance?classId=${selectedClass.classId}`}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Take Today&apos;s Attendance
                </Link>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Real-time Roll Call Integration Active
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you submit attendance for this class, records are immediately synchronized to the Student Portal in real time.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: HOMEWORK */}
          {activeTab === "homework" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assignments for {selectedClass.className}
                </h3>
                <Link
                  href={`/teacher/homework?classId=${selectedClass.classId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign Homework
                </Link>
              </div>

              {homework.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No homework currently assigned for this class.
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                          {hw.subject}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {hw.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {hw.description}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Assigned: {hw.assignedDate} • Due:{" "}
                          <strong className="text-rose-500">{hw.dueDate}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STUDY MATERIAL */}
          {activeTab === "study" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Study Material & Notes for {selectedClass.className}
                </h3>
                <Link
                  href={`/teacher/study?classId=${selectedClass.classId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload Notes
                </Link>
              </div>

              {materials.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No study materials uploaded for this class yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-purple-600 uppercase">
                          {m.subject}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                          {m.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {m.description || "Curriculum note"}
                        </p>
                      </div>
                      {m.externalUrl && (
                        <a
                          href={m.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TESTS & MARKS */}
          {activeTab === "tests" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Class Tests & Exams
                </h3>
                <Link
                  href={`/teacher/tests?classId=${selectedClass.classId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Test
                </Link>
              </div>

              {tests.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No tests created for this class yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {tests.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase">
                          {t.subject}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Max Marks: {t.maxMarks} • Test Date: {t.testDate}
                        </p>
                      </div>
                      <Link
                        href={`/teacher/tests?testId=${t.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg"
                      >
                        Enter Marks
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled Periods for {selectedClass.className} ({currentDay.toUpperCase()})
              </h3>

              {bells.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No bell periods scheduled for today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bells.map((bell) => (
                    <div
                      key={bell.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          {bell.bellNumber}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">
                            {bell.subject}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {bell.startTime} - {bell.endTime}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Period {bell.bellNumber}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
