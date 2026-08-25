"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { TeacherProfile, StudentProfile } from "@/types";

export default function TeacherClassesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [teacherData, setTeacherData] = useState<TeacherProfile | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!schoolId || !profile?.uid) return;
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "schools", schoolId, "teachers"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const tch = {
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          } as TeacherProfile;
          setTeacherData(tch);

          if (tch.assignedClassId) {
            const stuList = await getStudentsByClassAndSection(
              schoolId,
              tch.assignedClassId,
              tch.assignedSectionId
            );
            setStudents(stuList);
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
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

  const assignedClassName = teacherData?.assignedClassName || "Not Assigned";
  const assignedSectionName = teacherData?.assignedSectionName || "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Teaching Assignments & Classes
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Overview of classroom assignments, active subjects, and schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Assigned Class Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {assignedClassName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {assignedSectionName ? `Division: ${assignedSectionName}` : "Class Teacher"}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Assigned
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">Enrolled Students</span>
              <p className="font-bold text-base text-gray-900 dark:text-white mt-1">
                {students.length}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">Academic Year</span>
              <p className="font-bold text-base text-gray-900 dark:text-white mt-1">
                2026-27
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Assigned Subjects:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {teacherData?.subjects && teacherData.subjects.length > 0 ? (
                teacherData.subjects.map((sub, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900"
                  >
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">General Class Teacher</span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/teacher/students"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Class Students Roster →
            </Link>
          </div>
        </div>

        {/* Schedule & Information Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
              Daily Class Schedule
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Regular timetable for morning roll call and subject periods.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="font-medium text-gray-800 dark:text-gray-200">08:00 AM - 08:30 AM</span>
                <span className="text-blue-600 font-semibold">Morning Attendance & Assembly</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="font-medium text-gray-800 dark:text-gray-200">08:30 AM - 12:30 PM</span>
                <span className="text-gray-600 dark:text-gray-300">Teaching Periods (1 - 4)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="font-medium text-gray-800 dark:text-gray-200">12:30 PM - 01:15 PM</span>
                <span className="text-gray-600 dark:text-gray-300">Lunch Break</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="font-medium text-gray-800 dark:text-gray-200">01:15 PM - 03:00 PM</span>
                <span className="text-gray-600 dark:text-gray-300">Teaching Periods (5 - 7)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Take Today&apos;s Roll Call →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
