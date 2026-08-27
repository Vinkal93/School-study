"use client";

import React from "react";
import { CalendarOff, Sparkles } from "lucide-react";

interface ScheduleEmptyStateProps {
  isHoliday?: boolean;
  holidayName?: string;
}

export function ScheduleEmptyState({ isHoliday, holidayName }: ScheduleEmptyStateProps) {
  if (isHoliday) {
    return (
      <div className="w-full bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200 tracking-tight">
            {holidayName ? `School Holiday — ${holidayName}` : "School Holiday 🎉"}
          </h3>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
            No classes are scheduled today.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
        <CalendarOff className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
          No classes scheduled today
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          Enjoy your day! 🎉
        </p>
      </div>
    </div>
  );
}
