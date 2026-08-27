"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { AttendanceOverviewData } from "./types";

interface AttendanceCardProps {
  data?: AttendanceOverviewData;
  onClick?: () => void;
}

export function AttendanceCard({ data, onClick }: AttendanceCardProps) {
  // Safe calculation of percentage to prevent NaN% or division by zero errors
  const percentage = useMemo(() => {
    if (!data) return 92; // Default mock fallback for preview
    if (typeof data.percentage === "number" && !isNaN(data.percentage)) {
      return Math.min(100, Math.max(0, Math.round(data.percentage)));
    }
    if (data.totalDays > 0) {
      return Math.min(100, Math.max(0, Math.round((data.presentDays / data.totalDays) * 100)));
    }
    return 100;
  }, [data]);

  const presentDays = data?.presentDays ?? 23;
  const totalDays = data?.totalDays ?? 25;

  const cardContent = (
    <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group">
      {/* Icon & Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Users className="h-5 w-5 stroke-[2.2]" />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
          Attendance
        </span>
      </div>

      {/* Main Metric & Subtitle */}
      <div>
        <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
          {percentage}%
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
          {totalDays > 0 ? `Present: ${presentDays}/${totalDays}` : "No records yet"}
        </p>
      </div>

      {/* Subtle Horizontal Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl active:scale-[0.98] transition-transform"
        aria-label={`Attendance metric ${percentage} percent`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href="/student/attendance"
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl active:scale-[0.98] transition-transform"
      aria-label={`Attendance metric ${percentage} percent. Click to view attendance details.`}
    >
      {cardContent}
    </Link>
  );
}
