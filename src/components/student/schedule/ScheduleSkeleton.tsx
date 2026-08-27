"use client";

import React from "react";

export function ScheduleSkeleton() {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Section Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-36" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-28" />
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" />
      </div>

      {/* Schedule Items Skeleton */}
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full h-20 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center gap-4"
          >
            <div className="w-24 shrink-0 space-y-1 border-r border-slate-100 dark:border-slate-800 pr-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-12" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-12" />
              </div>
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
