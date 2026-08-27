"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { StudentCardData } from "./types";

interface StudentIdentityProps {
  student: StudentCardData;
}

export function StudentIdentity({ student }: StudentIdentityProps) {
  const isVerified = student.verificationStatus === "verified";

  // Build academic class & section string
  const academicDisplay = student.className
    ? `${student.className}${student.section ? ` • Section ${student.section}` : ""}`
    : student.academicGroup || "Class & Section";

  // Status configuration
  const statusConfig = {
    active: {
      label: "Active Student",
      dotClass: "bg-emerald-500",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60",
    },
    inactive: {
      label: "Inactive Student",
      dotClass: "bg-slate-400",
      badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    },
    suspended: {
      label: "Suspended",
      dotClass: "bg-red-500",
      badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900/60",
    },
  };

  const currentStatus = statusConfig[student.status] || statusConfig.active;

  return (
    <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
      {/* Student Full Name & Verification Badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
          {student.fullName}
        </h2>
        {isVerified && (
          <CheckCircle2
            className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/60 shrink-0"
            aria-label="Verified Student"
          />
        )}
      </div>

      {/* Class & Section */}
      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
        {academicDisplay}
      </p>

      {/* Roll Number & Admission Number */}
      {(student.rollNumber || student.admissionNumber) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono">
          {student.rollNumber && (
            <span>
              Roll No. <strong className="font-semibold text-slate-700 dark:text-slate-300">{student.rollNumber}</strong>
            </span>
          )}
          {student.rollNumber && student.admissionNumber && (
            <span className="text-slate-300 dark:text-slate-700 font-normal">•</span>
          )}
          {student.admissionNumber && (
            <span>
              Admission No. <strong className="font-semibold text-slate-700 dark:text-slate-300">{student.admissionNumber}</strong>
            </span>
          )}
        </div>
      )}

      {/* Status Badge Pill */}
      <div className="pt-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentStatus.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dotClass}`} />
          <span>{currentStatus.label}</span>
        </span>
      </div>
    </div>
  );
}
