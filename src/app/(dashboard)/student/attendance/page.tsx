"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { subscribeToStudentAttendance } from "@/lib/services/attendance.service";
import type { StudentProfile, AttendanceRecord, StudentAttendanceStats } from "@/types";

export default function StudentAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentAttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    percentage: 100,
    records: [],
  });
  const [loading, setLoading] = useState(true);

  // 1. Resolve student record from auth UID
  useEffect(() => {
    async function loadStudent() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        let studentDoc: any = null;

        const q = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          studentDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else if (profile.email) {
          const qEmail = query(
            collection(db, "schools", schoolId, "students"),
            where("email", "==", profile.email.toLowerCase())
          );
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            studentDoc = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
          }
        }

        if (studentDoc) {
          setStudent(studentDoc as StudentProfile);
        }
      } catch (err) {
        console.error("Failed to load student for attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [schoolId, profile?.uid, profile?.email]);

  // 2. Real-time subscription to student's attendance records
  useEffect(() => {
    if (!schoolId || !student?.id) return;

    const unsubscribe = subscribeToStudentAttendance(schoolId, student.id, (liveStats) => {
      setStats(liveStats);
    });

    return () => unsubscribe();
  }, [schoolId, student?.id]);

  const studentName = student?.name || profile?.name || "Student";
  const firstName = studentName.trim().split(" ")[0] || "Student";

  const percentColor =
    stats.percentage >= 75
      ? "text-emerald-600 dark:text-emerald-400"
      : stats.percentage >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const progressBg =
    stats.percentage >= 75 ? "bg-emerald-500" : stats.percentage >= 60 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      {/* Section 1: Overall Attendance Card */}

        {/* Section 1: Overall Attendance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Attendance Rate
          </span>

          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${percentColor}`}>
              {stats.percentage}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {stats.percentage >= 75
                ? "Excellent Attendance Status"
                : stats.percentage >= 60
                ? "Warning: Approaching Minimum Threshold"
                : "Defaulter: Attendance Below 60%"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Present</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {stats.presentDays} Days
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Late</span>
              <span className="font-extrabold text-amber-600 text-sm">
                {stats.lateDays} Days
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Absent</span>
              <span className="font-extrabold text-rose-600 text-sm">
                {stats.absentDays} Days
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Total Recorded</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {stats.totalDays} Days
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressBg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
            />
          </div>
        </div>

        {/* Section 2: Attendance Records List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recorded Daily Roll Calls ({stats.records.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : stats.records.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No attendance sessions recorded yet
              </p>
              <p className="text-[11px] text-slate-400">
                Your attendance will appear here automatically when your teacher or school admin conducts roll-call.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.records.map((rec) => {
                const s = (rec.status || "").toUpperCase();
                const isPresent = s === "PRESENT";
                const isLate = s === "LATE";
                const isAbsent = s === "ABSENT";

                const dateObj = new Date(rec.date);
                const dayName = isNaN(dateObj.getTime())
                  ? ""
                  : dateObj.toLocaleDateString("en-IN", { weekday: "long" });

                return (
                  <div key={rec.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          isPresent
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : isLate
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {isPresent ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isLate ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white">
                          {rec.date}
                        </p>
                        <p className="text-[11px] text-slate-400">{dayName || "School Day"}</p>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : isLate
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
