"use client";

import React from "react";

export function StudentProfileCardSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm animate-pulse flex flex-col gap-4">
      {/* Top Header Row (Tenant Branding Skeleton) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
        <div className="flex items-center gap-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" />
          <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Main Body Row (Photo + Details Skeleton) */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Photo Skeleton */}
        <div className="w-24 sm:w-28 md:w-32 h-28 sm:h-32 md:h-36 shrink-0 rounded-2xl bg-slate-200 dark:bg-slate-800" />

        {/* Identity Info Skeleton */}
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-28 mt-2" />
        </div>
      </div>
    </div>
  );
}
