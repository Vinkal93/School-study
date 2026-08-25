"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  ClipboardCheck,
  Bell,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getStudentAttendanceHistory } from "@/lib/services/attendance.service";
import { getNoticesForStudent } from "@/lib/services/notice.service";
import type { StudentProfile, StudentAttendanceStats, Notice } from "@/types";

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [studentData, setStudentData] = useState<StudentProfile | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<StudentAttendanceStats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const s = {
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          } as StudentProfile;
          setStudentData(s);

          const [stats, stuNotices] = await Promise.all([
            getStudentAttendanceHistory(schoolId, s.id),
            getNoticesForStudent(schoolId, s.classId),
          ]);
          setAttendanceStats(stats);
          setNotices(stuNotices);
        }
      } catch (err) {
        console.error("Failed to load student dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [schoolId, profile?.uid]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const percentage = attendanceStats?.percentage ?? 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Student Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>STUDENT PORTAL • ADMISSION NO: {studentData?.admissionNumber || "—"}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Welcome back, {profile?.name || "Student"}!
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Class:{" "}
            <strong className="text-gray-900 dark:text-white">
              {studentData?.className || "Class"} ({studentData?.sectionName || "Section"})
            </strong>
          </p>
        </div>

        <Link
          href="/student/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <User className="h-4 w-4" />
          View Full Profile
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Attendance Rate Meter */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Attendance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{percentage}%</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {attendanceStats?.presentDays ?? 0} / {attendanceStats?.totalDays ?? 0} Days
            </p>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
              percentage >= 75
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {percentage}%
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Present Days</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {attendanceStats?.presentDays ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Days Attended</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Absent Days</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {attendanceStats?.absentDays ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Days Missed</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Class & Section</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
              {studentData?.className || "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{studentData?.sectionName || ""}</p>
          </div>
        </div>
      </div>

      {/* Action Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Summary Panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Recent Attendance Log
              </h3>
              <Link
                href="/student/attendance"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View Full Log →
              </Link>
            </div>

            {attendanceStats?.records && attendanceStats.records.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {attendanceStats.records.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">{r.date}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.status === "PRESENT"
                          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          : r.status === "ABSENT"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">
                No attendance recorded yet for this session.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <Link
              href="/student/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Check Monthly Attendance Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Notices Panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                School Circulars & Notices
              </h3>
              <Link
                href="/student/notices"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View All →
              </Link>
            </div>

            {notices.length > 0 ? (
              <div className="space-y-2">
                {notices.slice(0, 2).map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg bg-blue-50/50 p-3.5 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-400">{n.date}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-blue-50/50 p-4 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  <Bell className="h-4 w-4" />
                  <span>Academic Session 2026-27</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Welcome to the new school term! Keep track of your daily attendance and notices right from this portal.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <Link
              href="/student/notices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Open Notice Board
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
