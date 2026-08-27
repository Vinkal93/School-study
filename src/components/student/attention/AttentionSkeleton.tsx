"use client";

import React from "react";

export function AttentionSkeleton() {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Section Title Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-44" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
      </div>

      {/* Item List Skeleton */}
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
