"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ScheduleHeaderProps {
  onViewFullTimetable?: () => void;
}

export function ScheduleHeader({ onViewFullTimetable }: ScheduleHeaderProps) {
  // Format dynamic current day/date (e.g. "Thursday, 27 August")
  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
      <div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Today&apos;s Schedule
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          {formattedDate}
        </p>
      </div>

      {onViewFullTimetable ? (
        <button
          type="button"
          onClick={onViewFullTimetable}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 active:scale-95 transition-all shrink-0"
        >
          <span>View Full Timetable</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Link
          href="/student/timetable"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 active:scale-95 transition-all shrink-0"
        >
          <span>View Full Timetable</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
