"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  Bell,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  UserCheck,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { TeacherProfile, StudentProfile } from "@/types";

import { getNoticesForTeacher } from "@/lib/services/notice.service";

export default function TeacherPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [teacherData, setTeacherData] = useState<TeacherProfile | null>(null);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [noticesCount, setNoticesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacherProfile() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "schools", schoolId, "teachers"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        let assignedClassId: string | undefined = undefined;

        if (!snap.empty) {
          const tch = {
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          } as TeacherProfile;
          setTeacherData(tch);
          assignedClassId = tch.assignedClassId;

          if (tch.assignedClassId) {
            const students = await getStudentsByClassAndSection(
              schoolId,
              tch.assignedClassId,
              tch.assignedSectionId
            );
            setClassStudents(students);
          }
        }

        const notices = await getNoticesForTeacher(schoolId, assignedClassId);
        setNoticesCount(notices.length);
      } catch (err) {
        console.error("Failed to fetch teacher profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTeacherProfile();
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Teacher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>FACULTY PORTAL • EMPLOYEE CODE: {teacherData?.teacherCode || "TCH"}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Welcome back, {profile?.name || "Teacher"}!
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Primary Class:{" "}
            <strong className="text-gray-900 dark:text-white">
              {assignedClassName} {assignedSectionName ? `(${assignedSectionName})` : ""}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active Session 2026-27
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">My Class</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {assignedClassName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{assignedSectionName || "Section A"}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Class Students</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {classStudents.length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Enrolled in Roster</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Today&apos;s Roll Call</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {classStudents.length > 0 ? "Ready" : "Pending"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Daily Attendance</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-orange-50 p-3 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">School Notices</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{noticesCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Announcements</p>
          </div>
        </div>
      </div>

      {/* Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between">
          <div>
            <div className="inline-flex rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-3">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Mark Daily Attendance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Take daily roll call for {assignedClassName} {assignedSectionName ? `(${assignedSectionName})` : ""}, mark present/absent/late, and submit attendance records.
            </p>
          </div>
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-6"
          >
            Open Attendance Sheet
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between">
          <div>
            <div className="inline-flex rounded-lg bg-purple-50 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 mb-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Class Roster & Students ({classStudents.length})
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View student profiles, admission numbers, and guardian contact details for your assigned class.
            </p>
          </div>
          <Link
            href="/teacher/students"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 mt-6"
          >
            View Students Roster
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
