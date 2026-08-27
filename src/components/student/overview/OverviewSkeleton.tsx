"use client";

import React from "react";

export function OverviewSkeleton() {
  return (
    <div className="w-full space-y-3.5 animate-pulse">
      {/* Section Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
      </div>

      {/* 2x2 Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 sm:h-36 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            </div>
            <div className="space-y-1.5">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-20" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
