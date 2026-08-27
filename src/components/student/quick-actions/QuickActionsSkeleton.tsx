"use client";

import React from "react";

export function QuickActionsSkeleton() {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Title Skeleton */}
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center gap-2 aspect-[1/1] sm:aspect-auto sm:h-24"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
