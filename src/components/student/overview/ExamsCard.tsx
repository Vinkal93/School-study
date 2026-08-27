"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { ExamOverviewData } from "./types";

interface ExamsCardProps {
  data?: ExamOverviewData;
  onClick?: () => void;
}

export function ExamsCard({ data, onClick }: ExamsCardProps) {
  const nextExam = data?.nextExam;

  const displayState = useMemo(() => {
    if (!nextExam || !nextExam.date) {
      return {
        metric: "12 Days",
        subtitle: "Unit Test - Science",
        isSpecial: false,
      };
    }

    const todayMs = new Date().setHours(0, 0, 0, 0);
    const examMs = new Date(nextExam.date).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24));

    const examSubjectTitle = `${nextExam.name || "Exam"}${nextExam.subject ? ` - ${nextExam.subject}` : ""}`;

    if (diffDays < 0) {
      return {
        metric: "No Exams",
        subtitle: "No upcoming exams",
        isSpecial: false,
      };
    }
    if (diffDays === 0) {
      return {
        metric: "Today",
        subtitle: examSubjectTitle,
        isSpecial: true,
      };
    }
    if (diffDays === 1) {
      return {
        metric: "Tomorrow",
        subtitle: examSubjectTitle,
        isSpecial: true,
      };
    }

    return {
      metric: `${diffDays} Days`,
      subtitle: examSubjectTitle,
      isSpecial: false,
    };
  }, [nextExam]);

  const cardContent = (
    <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group relative overflow-hidden">
      {/* Icon, Title & Action Chevron */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Calendar className="h-5 w-5 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
            Exams
          </span>
        </div>
        <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric & Subtitle */}
      <div>
        <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${displayState.isSpecial ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
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
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl active:scale-[0.98] transition-transform"
        aria-label={`Exams metric: ${displayState.metric}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href="/student/exams"
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl active:scale-[0.98] transition-transform"
      aria-label={`Exams metric: ${displayState.metric}. Click to view exam schedule.`}
    >
      {cardContent}
    </Link>
  );
}
