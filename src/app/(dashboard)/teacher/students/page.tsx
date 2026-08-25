"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Loader2,
  RefreshCw,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { TeacherProfile, StudentProfile } from "@/types";
import { toast } from "sonner";

export default function TeacherStudentsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [teacherData, setTeacherData] = useState<TeacherProfile | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (!schoolId || !profile?.uid) return;
    setLoading(true);
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
      console.error("Failed to load class roster:", err);
      toast.error("Failed to load class students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, profile?.uid]);

  const filteredStudents = students.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const assignedClassName = teacherData?.assignedClassName || "Not Assigned";
  const assignedSectionName = teacherData?.assignedSectionName || "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Class Roster & Students
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Students enrolled in{" "}
              <strong className="text-gray-900 dark:text-white">
                {assignedClassName} {assignedSectionName ? `(${assignedSectionName})` : ""}
              </strong>
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Roster
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, admission no..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Enrolled: {filteredStudents.length} Students
        </span>
      </div>

      {/* Students List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !teacherData?.assignedClassId ? (
          <div className="text-center py-16">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No Class Assigned
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please ask your School Administrator to assign you as a Class Teacher.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No student records have been enrolled in {assignedClassName} {assignedSectionName ? `(${assignedSectionName})` : ""} yet.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< sm) */}
            <div className="block sm:hidden divide-y divide-gray-200 dark:divide-gray-800">
              {filteredStudents.map((s) => (
                <div key={s.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={s.name}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{s.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{s.admissionNumber}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.status === "active"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span className="capitalize">{s.gender}</span>
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Student</th>
                    <th className="py-3.5 px-4 font-medium">Admission No</th>
                    <th className="py-3.5 px-4 font-medium">Gender</th>
                    <th className="py-3.5 px-4 font-medium">Guardian Contact</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.name}
                              className="h-10 w-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="rounded bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                          {s.admissionNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300 capitalize">
                        {s.gender}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                        {s.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{s.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            s.status === "active"
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {s.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
