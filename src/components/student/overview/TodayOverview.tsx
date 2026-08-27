"use client";

import React from "react";
import { OverviewHeader } from "./OverviewHeader";
import { AttendanceCard } from "./AttendanceCard";
import { FeesCard } from "./FeesCard";
import { HomeworkCard } from "./HomeworkCard";
import { ExamsCard } from "./ExamsCard";
import { OverviewSkeleton } from "./OverviewSkeleton";
import { TodayOverviewProps } from "./types";
import { AlertCircle, RefreshCw } from "lucide-react";

export function TodayOverview({
  data,
  loading = false,
  error = null,
  onRetry,
  onAttendanceClick,
  onFeesClick,
  onHomeworkClick,
  onExamsClick,
}: TodayOverviewProps) {
  // 1. Loading Skeleton State (Section 19)
  if (loading) {
    return <OverviewSkeleton />;
  }

  // 2. Error Fallback State (Section 20)
  if (error) {
    return (
      <div className="w-full space-y-3">
        <OverviewHeader />
        <div className="w-full p-4 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error || "Unable to load overview statistics."}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 active:scale-95 transition-all text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-3.5" aria-label="Today Overview metrics">
      {/* Section Title & Dynamic Localized Date */}
      <OverviewHeader />

      {/* 2 × 2 Card Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <AttendanceCard data={data?.attendance} onClick={onAttendanceClick} />
        <FeesCard data={data?.fees} onClick={onFeesClick} />
        <HomeworkCard data={data?.homework} onClick={onHomeworkClick} />
        <ExamsCard data={data?.exams} onClick={onExamsClick} />
      </div>
    </section>
  );
}
