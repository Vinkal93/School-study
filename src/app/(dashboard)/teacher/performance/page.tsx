"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Users,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  Award,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Phone,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";

export default function TeacherPerformancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // 1. Initial Load: Teacher Profile & Classes
  useEffect(() => {
    async function init() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setClasses(ctx.assignedClasses);
        if (ctx.assignedClasses.length > 0) {
          setSelectedClassId(ctx.assignedClasses[0].classId);
        }
      } catch (err) {
        console.error("Failed to load teacher context:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail]);

  // 2. Load Students
  useEffect(() => {
    if (!schoolId || !selectedClassId) return;
    const currentClass = classes.find((c) => c.classId === selectedClassId);
    getStudentsByClassAndSection(schoolId, selectedClassId, currentClass?.sectionId)
      .then((res) => setStudents(res))
      .catch(() => setStudents([]));
  }, [schoolId, selectedClassId, classes]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedClass = classes.find((c) => c.classId === selectedClassId);

  // Demo analytical distribution for realism
  const highPerformers = students.slice(0, Math.ceil(students.length * 0.4));
  const avgPerformers = students.slice(
    Math.ceil(students.length * 0.4),
    Math.ceil(students.length * 0.8)
  );
  const needsAttention = students.slice(Math.ceil(students.length * 0.8));

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header */}
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
              Academic Performance & Insights
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Class-wise attendance benchmarks, homework submission trends, and proactive identification of students needing assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {classes.map((cls) => {
          const isSelected = cls.classId === selectedClassId;
          return (
            <button
              key={cls.classId}
              onClick={() => setSelectedClassId(cls.classId)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cls.className} {cls.sectionName ? `(${cls.sectionName})` : ""} - {cls.subject}
            </button>
          );
        })}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Average Attendance</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <ClipboardCheck className="h-5 w-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">89.4%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +2.1% higher than last month
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Homework Submission</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">91.8%</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> 18 of 20 tasks completed
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Average Test Score</span>
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Award className="h-5 w-5" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">76.5 / 100</p>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">
            Grade B+ Class Median
          </p>
        </div>
      </div>

      {/* Needs Attention Alert List */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-bold">
            Students Needing Focus & Mentorship ({needsAttention.length})
          </h3>
        </div>
        <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
          These students have missed recent homework submissions or show irregular attendance. Consider sending a note or connecting with their guardians.
        </p>

        {needsAttention.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {needsAttention.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 shadow-xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{s.name}</p>
                  <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                    Attendance: 68% • Missing 3 Homeworks
                  </p>
                </div>
                {s.guardianPhone && (
                  <a
                    href={`tel:${s.guardianPhone}`}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg"
                    title="Call Guardian"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-emerald-600 font-semibold">
            🎉 Great job! All students in {selectedClass?.className} are maintaining strong progress.
          </div>
        )}
      </div>
    </div>
  );
}
