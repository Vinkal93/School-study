"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Award,
  HeartHandshake,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { StudentProfile, School } from "@/types";

export default function StudentProfilePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();

        // 1. Fetch Student Profile by userId, fallback to email
        let studentDoc: any = null;
        const qByUid = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snapUid = await getDocs(qByUid);
        if (!snapUid.empty) {
          studentDoc = { id: snapUid.docs[0].id, ...snapUid.docs[0].data() };
        } else if (profile.email) {
          const qByEmail = query(
            collection(db, "schools", schoolId, "students"),
            where("email", "==", profile.email.toLowerCase())
          );
          const snapEmail = await getDocs(qByEmail);
          if (!snapEmail.empty) {
            studentDoc = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
          }
        }

        if (studentDoc) {
          setStudent(studentDoc as StudentProfile);
        }

        // 2. Fetch School info
        const schoolSnap = await getDoc(doc(db, "schools", schoolId));
        if (schoolSnap.exists()) {
          setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
        }
      } catch (err) {
        console.error("Failed to load student profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [schoolId, profile?.uid, profile?.email]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Sanitized Admission Number & Student ID
  const displayStudentId =
    student?.studentId ||
    (student?.admissionNumber && student.admissionNumber !== "ALL" ? student.admissionNumber : "SBCI1");

  const displayAdmissionNo =
    student?.admissionNumber && student.admissionNumber !== "ALL"
      ? student.admissionNumber
      : displayStudentId;

  const displayRollNo =
    student?.rollNumber !== undefined && student?.rollNumber !== null
      ? `#${student.rollNumber}`
      : "Not Assigned";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          My Student Profile
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Official enrollment records and demographic details.
        </p>
      </div>

      {/* Main Profile Card Container */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-8">
        {/* Header Avatar & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            {student?.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-purple-100 dark:border-purple-950 shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 font-extrabold text-3xl text-white shadow-md">
                {student?.name?.charAt(0) || "S"}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[10px]">
              ✓
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {student?.name || profile?.name || "Student"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active Student
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <p>
                Student ID: <strong className="font-mono text-slate-900 dark:text-white">{displayStudentId}</strong>
              </p>
              <span>•</span>
              <p>
                Admission No: <strong className="font-mono text-slate-900 dark:text-white">{displayAdmissionNo}</strong>
              </p>
              <span>•</span>
              <p>
                Roll No: <strong className="font-mono text-slate-900 dark:text-white">{displayRollNo}</strong>
              </p>
            </div>

            <p className="text-sm text-purple-700 dark:text-purple-400 font-extrabold">
              {student?.className || "Class"} {student?.sectionName ? `(Section ${student.sectionName})` : ""}
              {school?.name ? ` • ${school.name}` : ""}
            </p>
          </div>
        </div>

        {/* Section 1: Personal & Contact Information */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Personal & Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Login Email */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Login Email</span>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Mail className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="truncate">{student?.email || profile?.email || "—"}</span>
              </div>
            </div>

            {/* Guardian Contact */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Guardian Contact</span>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Phone className="h-4 w-4 text-purple-600 shrink-0" />
                <span>{student?.guardianPhone || student?.phone || "+91 9118245636"}</span>
              </div>
            </div>

            {/* Gender & DOB */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Gender & DOB</span>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm capitalize">
                <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
                <span>
                  {student?.gender || "Male"} • {student?.dob || "2012-05-15"}
                  {student?.bloodGroup ? ` (${student.bloodGroup})` : ""}
                </span>
              </div>
            </div>

            {/* Admission Date */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Admission Date</span>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
                <span>{student?.admissionDate || "2026-09-04"}</span>
              </div>
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Residential Address</span>
              <div className="flex items-start gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <MapPin className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  {student?.address ||
                    "Utrethoo ambedkar nagar uttar pradesh india 224234"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academic & Institutional Records */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Academic & Institution Records
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Enrolled Class</span>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                {student?.className || "Class UKG"}
              </p>
              <p className="text-[10px] text-slate-500">Section {student?.sectionName || "A"}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Class Roll Number</span>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">
                {displayRollNo}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold">Class sequential</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Institution Code</span>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">
                {school?.code || "SBCI"}
              </p>
              <p className="text-[10px] text-slate-500">{school?.name || "School Portal"}</p>
            </div>
          </div>
        </div>

        {/* Section 3: Guardian Details */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Parent / Guardian Details
          </h3>
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {student?.guardianName || "Parent / Guardian on Record"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Relationship: {student?.guardianRelation || "Father / Legal Guardian"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <a
                href={`tel:${student?.guardianPhone || student?.phone || ""}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-100 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{student?.guardianPhone || student?.phone || "+91 9118245636"}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
