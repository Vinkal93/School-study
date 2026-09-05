"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Calendar,
  BookOpen,
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
  MapPin,
  Bookmark,
  FileText,
  AlertCircle,
  MessageSquare,
  Users,
  Bell,
  CheckCircle2,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import {
  getClassBells,
  getTeacherBells,
  getCurrentDayOfWeek,
  calculateBellStatus,
  type BellLiveStatus,
} from "@/lib/services/timetable.service";
import type { DayOfWeek, ClassBell } from "@/types/timetable";
import { bellSound } from "@/lib/sound/bellSound";
import { useClassBellAlert } from "@/hooks/use-class-bell-alert";
import { toast } from "sonner";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

function TeacherTimetableContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const paramBellId = searchParams.get("bellId");

  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [dayBells, setDayBells] = useState<ClassBell[]>([]);
  const [loadingBells, setLoadingBells] = useState(false);
  const [selectedBell, setSelectedBell] = useState<ClassBell | null>(null);

  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(bellSound.isEnabled());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Mount real-time alert hook
  useClassBellAlert((bellId) => {
    const found = dayBells.find((b) => b.id === bellId);
    if (found) setSelectedBell(found);
  });

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

  // 2. Load Bells for Selected Day
  useEffect(() => {
    if (!schoolId) return;

    setLoadingBells(true);
    async function loadDayBells() {
      try {
        // Query bells directly assigned to teacher
        const teacherAssignedBells = await getTeacherBells(schoolId, teacherUid, selectedDay);

        // Also query bells for teacher's assigned classes
        const classBellsAcc: ClassBell[] = [];
        for (const cls of classes) {
          const bells = await getClassBells(schoolId, cls.classId, selectedDay, cls.sectionId);
          classBellsAcc.push(...bells);
        }

        // Merge without duplicates
        const bellMap = new Map<string, ClassBell>();
        teacherAssignedBells.forEach((b) => bellMap.set(b.id, b));
        classBellsAcc.forEach((b) => {
          // If bell explicitly assigned to another teacher, don't duplicate unless assigned to this teacher
          if (!b.teacherId || b.teacherId === teacherUid) {
            bellMap.set(b.id, b);
          }
        });

        const sorted = Array.from(bellMap.values()).sort((a, b) => {
          const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
          if (startDiff !== 0) return startDiff;
          return (a.bellNumber || 0) - (b.bellNumber || 0);
        });

        setDayBells(sorted);

        // Auto-select bell if specified in query parameter
        if (paramBellId) {
          const found = sorted.find((b) => b.id === paramBellId);
          if (found) setSelectedBell(found);
        }
      } catch (err) {
        console.error("Failed to load day bells:", err);
        setDayBells([]);
      } finally {
        setLoadingBells(false);
      }
    }

    loadDayBells();
  }, [schoolId, teacherUid, classes, selectedDay, paramBellId]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    bellSound.setEnabled(next);
    toast.success(next ? "Class Bell Sound Enabled" : "Class Bell Sound Muted");
  };

  const handleTestBell = async () => {
    setIsPlayingTest(true);
    toast.info("Ringing School Bell (Test Ring)...");
    await bellSound.testBell(2);
    setIsPlayingTest(false);
  };

  const getStatusBadge = (status: BellLiveStatus) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            NOW
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            Upcoming
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header with Sound Settings */}
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
              Weekly Timetable &amp; Period Bells
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your scheduled teaching lectures, period timings, classroom bells, and daily lesson tasks.
            </p>
          </div>

          {/* Sound Settings & Test Bell */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                soundEnabled
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>{soundEnabled ? "Bell Sound: ON" : "Bell Sound: OFF"}</span>
            </button>

            <button
              onClick={handleTestBell}
              disabled={isPlayingTest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5 text-amber-500" />
              <span>{isPlayingTest ? "Ringing..." : "Test Bell"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day.key;
          const isToday = getCurrentDayOfWeek() === day.key;
          return (
            <button
              key={day.key}
              onClick={() => setSelectedDay(day.key)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="capitalize">{day.label}</span>
              {isToday && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Bells Grid / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Schedule For:
            </span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 capitalize">
              {selectedDay} ({dayBells.length} Classes / Periods)
            </span>
          </div>
        </div>

        {loadingBells ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : dayBells.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <Clock className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No classes scheduled on {selectedDay}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have no lectures or periods scheduled for this day. Enjoy your free time or check other days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayBells.map((bell) => {
              const status = calculateBellStatus(bell.startTime, bell.endTime);
              const isRunning = status === "Running";

              return (
                <div
                  key={bell.id}
                  onClick={() => setSelectedBell(bell)}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                    isRunning
                      ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-400 hover:shadow-md"
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md">
                          Bell {bell.bellNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {bell.className}
                          {bell.sectionName ? ` • ${bell.sectionName}` : ""}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {bell.subject}
                      </h4>
                    </div>
                    <div>{getStatusBadge(status)}</div>
                  </div>

                  {/* Timing & Room */}
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {bell.startTime} – {bell.endTime}
                    </span>
                    {bell.room && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-medium">
                        <MapPin className="h-3 w-3" />
                        {bell.room}
                      </span>
                    )}
                  </div>

                  {/* Task / Reminder Preview */}
                  {(bell.task || bell.chapter || bell.reminder) && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-xs space-y-1">
                      {bell.chapter && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 truncate">
                          <Bookmark className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{bell.chapter}</span>
                        </div>
                      )}
                      {bell.task && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 truncate">
                          <FileText className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{bell.task}</span>
                        </div>
                      )}
                      {bell.reminder && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{bell.reminder}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>View Class Details →</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {bell.durationMinutes || 40} mins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Details Modal Drawer */}
      {selectedBell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                      Bell {selectedBell.bellNumber}
                    </span>
                    {getStatusBadge(calculateBellStatus(selectedBell.startTime, selectedBell.endTime))}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {selectedBell.className}
                    {selectedBell.sectionName ? ` • ${selectedBell.sectionName}` : ""}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedBell(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Timetable Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {selectedBell.subject}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Timing</span>
                  <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                    {selectedBell.startTime} – {selectedBell.endTime} ({selectedBell.durationMinutes || 40}m)
                  </span>
                </div>

                {selectedBell.room && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Room</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedBell.room}
                    </span>
                  </div>
                )}

                {selectedBell.teacherName && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Teacher</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedBell.teacherName}
                    </span>
                  </div>
                )}
              </div>

              {/* Book / Curriculum & Chapter */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-indigo-500" />
                  Book / Resource &amp; Chapter
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedBell.bookName || "NCERT Standard Curriculum"}
                </p>
                {selectedBell.chapter && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    📖 {selectedBell.chapter}
                  </p>
                )}
              </div>

              {/* Today's Task */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Today&apos;s Task / Lesson Goal
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {selectedBell.task || "No specific lesson task assigned. Proceed with regular syllabus."}
                </p>
              </div>

              {/* Reminder */}
              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Teacher Reminder
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {selectedBell.reminder || "No active reminder."}
                </p>
              </div>

              {/* Admin Message */}
              {selectedBell.message && (
                <div className="p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Message from School Admin
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {selectedBell.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedBell(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherTimetablePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TeacherTimetableContent />
    </Suspense>
  );
}
