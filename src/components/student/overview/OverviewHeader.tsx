"use client";

import React, { useMemo } from "react";

export function OverviewHeader() {
  // Format dynamic current date using local device timezone (e.g. "Tuesday, 27 Aug 2024")
  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3.5">
      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
        Today Overview
      </h2>
      <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
        {formattedDate}
      </span>
    </div>
  );
}
