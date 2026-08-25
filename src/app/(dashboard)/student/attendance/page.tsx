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
  Search,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getStudentAttendanceHistory } from "@/lib/services/attendance.service";
import type { StudentProfile, StudentAttendanceStats } from "@/types";
import { toast } from "sonner";

export default function StudentAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (!schoolId || !profile?.uid) return;
    setLoading(true);
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
        setStudent(s);

        const attStats = await getStudentAttendanceHistory(schoolId, s.id);
        setStats(attStats);
      }
    } catch (err) {
      console.error("Failed to load student attendance:", err);
      toast.error("Failed to load attendance history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, profile?.uid]);

  const filteredRecords = (stats?.records || []).filter((r) =>
    r.date.includes(searchQuery)
  );

  const percentage = stats?.percentage ?? 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Attendance Record
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Personal attendance history for {student?.className || "Class"} ({student?.sectionName || "Section"}).
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
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Attendance Rate</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{percentage}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Session 2026-27</p>
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

        <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 shadow-sm dark:border-green-900/40 dark:bg-green-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Present</span>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-0.5">
              {stats?.presentDays ?? 0}
            </p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">Days</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-600 opacity-80" />
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Absent</span>
            <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-0.5">
              {stats?.absentDays ?? 0}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">Days</p>
          </div>
          <XCircle className="h-8 w-8 text-red-600 opacity-80" />
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Late</span>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-300 mt-0.5">
              {stats?.lateDays ?? 0}
            </p>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-0.5">Days</p>
          </div>
          <Clock className="h-8 w-8 text-orange-600 opacity-80" />
        </div>
      </div>

      {/* Search by date */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search date (e.g. 2026-04)..."
            className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filteredRecords.length} records
        </span>
      </div>

      {/* Detailed Log Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No attendance records found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your class teacher hasn&apos;t recorded any daily roll calls yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Date</th>
                  <th className="py-3.5 px-4 font-medium">Class / Section</th>
                  <th className="py-3.5 px-4 font-medium">Recorded By</th>
                  <th className="py-3.5 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{r.date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                      {r.className} ({r.sectionName})
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {r.teacherName || "Class Teacher"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.status === "PRESENT"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : r.status === "ABSENT"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                            : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                        }`}
                      >
                        {r.status === "PRESENT" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : r.status === "ABSENT" ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
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
  );
}
