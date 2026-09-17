"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, GraduationCap, Phone, MapPin } from "lucide-react";
import type { StudentProfile } from "@/types";

interface StudentMobileCardProps {
  student: StudentProfile;
  onOpenActions: (student: StudentProfile) => void;
}

export function StudentMobileCard({
  student,
  onOpenActions,
}: StudentMobileCardProps) {
  const router = useRouter();

  const displayName = student.name || (student as any).fullName || "Student";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "S";
  const admissionNo = student.admissionNumber || student.studentId || "—";
  const classLabel = student.className ? `Class ${student.className}` : "Class —";
  const sectionLabel = student.sectionName ? `${student.sectionName}` : "A";

  // Compute status badge
  const rawStatus = (student.status || "active").toLowerCase();
  let badgeText = "Active";
  let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";

  if (rawStatus === "tc_issued" || rawStatus === "transferred") {
    badgeText = "TC Issued";
    badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
  } else if (rawStatus === "inactive" || rawStatus === "suspended" || rawStatus === "disabled") {
    badgeText = "Inactive";
    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  } else if ((student as any).feeStatus === "due" || (student as any).hasPendingFees) {
    badgeText = "Fee Due";
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }

  return (
    <div
      onClick={() => router.push(`/admin/students/${student.id}`)}
      className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Avatar */}
        <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-xs">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-indigo-600 text-white font-black text-base">
              {userInitial}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {displayName}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="truncate">{admissionNo}</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            {classLabel} • Sec {sectionLabel}
            {student.rollNumber !== undefined && student.rollNumber !== null && (
              <span className="ml-1 text-slate-400">#{student.rollNumber}</span>
            )}
          </p>
        </div>
      </div>

      {/* Right Side: Status Badge + 3-dots */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeStyle}`}
        >
          {badgeText}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenActions(student);
          }}
          aria-label="Student Actions"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
