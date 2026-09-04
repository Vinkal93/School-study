"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Calendar,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  ArrowLeft,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { getClassBells, getCurrentDayOfWeek } from "@/lib/services/timetable.service";
import type { DayOfWeek, ClassBell } from "@/types/timetable";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

export default function TeacherTimetablePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [dayBells, setDayBells] = useState<ClassBell[]>([]);
  const [loadingBells, setLoadingBells] = useState(false);

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
      } catch (err) {
        console.error("Failed to load classes for timetable:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail]);

  // 2. Load Bells for Selected Day across teacher's assigned classes
  useEffect(() => {
    if (!schoolId || classes.length === 0) {
      setDayBells([]);
      return;
    }

    setLoadingBells(true);
    async function loadDayBells() {
      try {
        const bellsAcc: ClassBell[] = [];
        for (const cls of classes) {
          const bells = await getClassBells(schoolId, cls.classId, selectedDay);
          bellsAcc.push(...bells);
        }
        bellsAcc.sort((a, b) => a.bellNumber - b.bellNumber);
        setDayBells(bellsAcc);
      } catch (err) {
        console.error("Failed to load day bells:", err);
        setDayBells([]);
      } finally {
        setLoadingBells(false);
      }
    }

    loadDayBells();
  }, [schoolId, classes, selectedDay]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
              Weekly Timetable & Period Bells
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your scheduled teaching lectures, period timings, and classroom bells for the entire week.
            </p>
          </div>
        </div>
      </div>

      {/* Week Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day.key;
          const isToday = getCurrentDayOfWeek() === day.key;
          return (
            <button
              key={day.key}
              onClick={() => setSelectedDay(day.key)}
              className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span className="capitalize">{day.label}</span>
              {isToday && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-blue-700 text-blue-100"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Periods Schedule Timeline */}
      {loadingBells ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : dayBells.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
          <Clock className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 capitalize">
            No lectures scheduled for {selectedDay}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You do not have assigned period bells for this day, or the school timetable has not been configured.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayBells.map((bell, idx) => (
            <div
              key={bell.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-base flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-xs">
                  {bell.bellNumber || idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      Period {bell.bellNumber}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                      {bell.startTime} - {bell.endTime}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {bell.className} • {bell.subject}
                  </h3>
                  {bell.bookName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Textbook: <span className="font-semibold">{bell.bookName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions for this Period */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Link
                  href={`/teacher/attendance?classId=${bell.classId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Take Roll Call
                </Link>
                <Link
                  href={`/teacher/homework?classId=${bell.classId}&bellId=${bell.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Give Homework
                </Link>
                <Link
                  href={`/teacher/classes?classId=${bell.classId}`}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Open Class Hub"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
