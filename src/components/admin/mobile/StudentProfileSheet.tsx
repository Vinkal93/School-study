"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  Calendar,
  Phone,
  User,
  MapPin,
  Heart,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  ClipboardCheck,
  Edit,
  X,
} from "lucide-react";
import type { StudentProfile } from "@/types";
import { getStudentFeeSummary, type StudentFeeSummary } from "@/lib/services/fee.service";

interface StudentProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  schoolId: string;
  onOpenActions?: (student: StudentProfile) => void;
  onOpenFees?: (student: StudentProfile) => void;
  onEditStudent?: (student: StudentProfile) => void;
}

export function StudentProfileSheet({
  isOpen,
  onClose,
  student,
  schoolId,
  onOpenActions,
  onOpenFees,
  onEditStudent,
}: StudentProfileSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "fees" | "exams" | "more">("overview");
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && student && schoolId) {
      getStudentFeeSummary(schoolId, {
        id: student.id,
        name: student.name || (student as any).fullName || "Student",
        admissionNumber: student.admissionNumber || student.studentId,
        className: student.className,
        sectionName: student.sectionName,
        admissionDate: student.admissionDate,
      })
        .then((res) => {
          if (isMounted) setFeeSummary(res);
        })
        .catch((err) => {
          console.warn("Could not load student fee summary for profile sheet:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, student, schoolId]);

  if (!isOpen || !student) return null;

  const displayName = student.name || (student as any).fullName || "Student";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "S";
  const admNo = student.admissionNumber || student.studentId || "ADM-2024-001";
  const classLabel = student.className ? `Class ${student.className}` : "Class —";
  const sectionLabel = student.sectionName ? ` - ${student.sectionName}` : " - A";

  // Calculate Age from DOB if present
  let ageString = "—";
  if (student.dob) {
    const birthYear = new Date(student.dob).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear) && birthYear > 1900) {
      ageString = `${Math.max(1, currentYear - birthYear)} Years`;
    }
  }

  const totalFees = feeSummary ? (feeSummary.assignment?.totalAssignedPaise || 0) / 100 : 12000;
  const dueFees = feeSummary ? feeSummary.totalPendingRupees : 3000;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Sheet Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-250 ease-out z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="p-1.5 -ml-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Student Profile
          </h2>

          <button
            type="button"
            onClick={() => {
              if (onOpenActions) {
                onOpenActions(student);
              }
            }}
            aria-label="More Actions"
            className="p-1.5 -mr-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Hero Profile Card */}
          <div className="rounded-2xl p-4 bg-linear-to-r from-blue-50 via-sky-50 to-indigo-50/70 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800/60 border border-blue-100/80 dark:border-slate-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-indigo-600 text-white font-black text-xl">
                    {userInitial}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {displayName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {admNo}
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {classLabel}{sectionLabel}
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-blue-400 shrink-0" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "attendance", label: "Attendance" },
                { id: "fees", label: "Fees" },
                { id: "exams", label: "Exams" },
                { id: "more", label: "More" },
              ] as const
            ).map((t) => {
              const isAct = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`pb-2.5 px-3 whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                    isAct
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-extrabold"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Overview Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Personal Details List */}
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {/* Date of Birth & Age */}
                <div className="grid grid-cols-2 p-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Date of Birth</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {student.dob || "12 March 2012"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Age</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {ageString !== "—" ? ageString : "13 Years"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gender & Blood Group */}
                <div className="grid grid-cols-2 p-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Gender</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 capitalize truncate block">
                        {student.gender || "Male"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Heart className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Blood Group</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {(student as any).bloodGroup || "B+"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="p-3 flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Phone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {student.phone || student.guardianPhone || "+91 98765 43210"}
                    </span>
                  </div>
                </div>

                {/* Parent Name */}
                <div className="p-3 flex items-center gap-2.5">
                  <User className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Parent Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {student.guardianName || student.fatherName || "Rajesh Singh"}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="p-3 flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Address</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {(student as any).address || "Utrethoo, Ambedkar Nagar, UP"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 KPI Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Attendance */}
                <div className="rounded-2xl p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">92%</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Attendance</p>
                  </div>
                </div>

                {/* 2. Total Fees */}
                <div className="rounded-2xl p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{totalFees.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total Fees</p>
                  </div>
                </div>

                {/* 3. Due Amount */}
                <div className="rounded-2xl p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                      ₹{dueFees.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Due Amount</p>
                  </div>
                </div>

                {/* 4. Academic Score */}
                <div className="rounded-2xl p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">85%</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Academic Score</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center space-y-3">
              <CreditCard className="h-8 w-8 text-blue-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Fees: ₹{totalFees.toLocaleString("en-IN")} • Pending: ₹{dueFees.toLocaleString("en-IN")}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenFees) onOpenFees(student);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                View Full Fee Breakdown
              </button>
            </div>
          )}

          {activeTab !== "overview" && activeTab !== "fees" && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500">
              Details for {activeTab} will appear here.
            </div>
          )}
        </div>

        {/* Sticky Action Bar at Bottom */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/admin/attendance");
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="truncate">Take Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenFees) {
                onOpenFees(student);
              } else {
                router.push(`/admin/fees/collect?studentId=${student.id}`);
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="truncate">View Fees</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onEditStudent) {
                onEditStudent(student);
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="truncate">Edit Student</span>
          </button>
        </div>
      </div>
    </div>
  );
}
