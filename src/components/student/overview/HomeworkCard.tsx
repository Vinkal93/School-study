"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { HomeworkOverviewData } from "./types";

interface HomeworkCardProps {
  data?: HomeworkOverviewData;
  onClick?: () => void;
}

export function HomeworkCard({ data, onClick }: HomeworkCardProps) {
  const pendingCount = data?.pendingCount ?? 3;
  const dueTodayCount = data?.dueTodayCount;

  const displayState = useMemo(() => {
    if (pendingCount <= 0) {
      return {
        metric: "All Done 🎉",
        subtitle: "No pending homework",
        isPositive: true,
      };
    }
    return {
      metric: `${pendingCount} Pending`,
      subtitle: dueTodayCount !== undefined && dueTodayCount > 0 ? `${dueTodayCount} due today` : "Due today",
      isPositive: false,
    };
  }, [pendingCount, dueTodayCount]);

  const cardContent = (
    <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group relative overflow-hidden">
      {/* Icon, Title & Action Chevron */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ClipboardList className="h-5 w-5 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
            Homework
          </span>
        </div>
        <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric & Subtitle */}
      <div>
        <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${displayState.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
          {displayState.metric}
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
          {displayState.subtitle}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl active:scale-[0.98] transition-transform"
        aria-label={`Homework metric: ${displayState.metric}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href="/student/homework"
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl active:scale-[0.98] transition-transform"
      aria-label={`Homework metric: ${displayState.metric}. Click to view homework assignments.`}
    >
      {cardContent}
    </Link>
  );
}
