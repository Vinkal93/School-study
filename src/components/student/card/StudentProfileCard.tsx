"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { StudentPhoto } from "./StudentPhoto";
import { StudentIdentity } from "./StudentIdentity";
import { TenantBranding } from "./TenantBranding";
import { StudentProfileCardSkeleton } from "./StudentProfileCardSkeleton";
import { StudentProfileCardProps } from "./types";

export function StudentProfileCard({
  student,
  tenant,
  loading = false,
  error = null,
  onRetry,
  onCardClick,
}: StudentProfileCardProps) {
  // 1. Loading Skeleton State (Section 23)
  if (loading) {
    return <StudentProfileCardSkeleton />;
  }

  // 2. Error Fallback State (Section 24)
  if (error) {
    return (
      <div className="w-full p-5 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300 font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error || "Unable to load student profile."}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  const cardContent = (
    <div className="relative w-full bg-gradient-to-br from-blue-50/50 via-white to-slate-50/80 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/80 transition-all duration-200 overflow-hidden group">
      {/* Decorative Subtle Background Vector Pattern Watermark */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none opacity-[0.04] dark:opacity-[0.06] flex items-center justify-end pr-2 overflow-hidden">
        <svg viewBox="0 0 24 24" className="w-48 h-48 fill-current text-blue-900 dark:text-blue-100">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4l7 3.82 7-3.82v-4L12 17l-7-3.82z" />
        </svg>
      </div>

      {/* Top Header Section: School Branding (Upper Right) */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-3 sm:mb-4 relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">
          Student ID Card
        </div>
        <TenantBranding tenant={tenant} />
      </div>

      {/* Main Body: Photo + Student Identity Details */}
      <div className="flex items-start gap-3 sm:gap-4.5 relative z-10">
        <StudentPhoto photoUrl={student.photoUrl} fullName={student.fullName} />
        <StudentIdentity student={student} />
      </div>
    </div>
  );

  if (onCardClick) {
    return (
      <button
        type="button"
        onClick={onCardClick}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
        aria-label={`Student profile card for ${student.fullName}. Click to view full profile.`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href="/student/profile"
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
      aria-label={`Student profile card for ${student.fullName}. Click to view full profile.`}
    >
      {cardContent}
    </Link>
  );
}
