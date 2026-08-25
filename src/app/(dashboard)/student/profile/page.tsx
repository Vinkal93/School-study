"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { StudentProfile } from "@/types";

export default function StudentProfilePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!schoolId || !profile?.uid) return;
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setStudent({
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          } as StudentProfile);
        }
      } catch (err) {
        console.error("Failed to load student profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [schoolId, profile?.uid]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Student Profile
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Official enrollment records and demographic details.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
        {/* Header Avatar & Name */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-gray-100 dark:border-gray-800">
          {student?.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              className="h-20 w-20 rounded-full object-cover border-2 border-purple-200 dark:border-purple-900"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 font-bold text-2xl text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              {student?.name?.charAt(0) || "S"}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{student?.name}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Active Student
              </span>
            </div>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
              Admission Number: <strong>{student?.admissionNumber}</strong>
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
              {student?.className} ({student?.sectionName})
            </p>
          </div>
        </div>

        {/* Profile Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Login Email</span>
            <div className="flex items-center gap-2 mt-1 font-semibold text-gray-900 dark:text-white">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{student?.email}</span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Guardian Contact</span>
            <div className="flex items-center gap-2 mt-1 font-semibold text-gray-900 dark:text-white">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{student?.phone || "Not specified"}</span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Gender & DOB</span>
            <div className="flex items-center gap-2 mt-1 font-semibold text-gray-900 dark:text-white capitalize">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {student?.gender} • {student?.dob || "DOB Not Set"}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Admission Date</span>
            <div className="flex items-center gap-2 mt-1 font-semibold text-gray-900 dark:text-white">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{student?.admissionDate || "2026-04-01"}</span>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Residential Address</span>
            <div className="flex items-center gap-2 mt-1 font-semibold text-gray-900 dark:text-white">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{student?.address || "Address record on file with school administration."}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
