"use client";

import React, { useMemo } from "react";
import { ScheduleItemData } from "./types";
import { Clock, User, MapPin, CheckCircle } from "lucide-react";

interface ScheduleItemCardProps {
  item: ScheduleItemData;
}

export function ScheduleItemCard({ item }: ScheduleItemCardProps) {
  const isCurrent = item.status === "current";
  const isCompleted = item.status === "completed";
  const isCancelled = item.status === "cancelled";
  const isNext = item.isNext && !isCurrent && !isCompleted && !isCancelled;

  // Accessible ARIA Description
  const ariaLabel = useMemo(() => {
    let statusText = "upcoming";
    if (isCurrent) statusText = "currently in progress";
    if (isCompleted) statusText = "completed";
    if (isCancelled) statusText = "cancelled";
    if (isNext) statusText = "next class up";

    return `${item.subjectName || "Subject"}, ${item.startTime || "--:--"} to ${item.endTime || "--:--"}${
      item.teacherName ? `, with ${item.teacherName}` : ""
    }${item.roomName ? `, in ${item.roomName}` : ""}, ${statusText}.`;
  }, [item, isCurrent, isCompleted, isCancelled, isNext]);

  // Card Visual Container Styling based on Status
  const containerClasses = useMemo(() => {
    if (isCurrent) {
      return "bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-800 shadow-md ring-1 ring-emerald-500/20";
    }
    if (isNext) {
      return "bg-gradient-to-r from-blue-50/80 via-white to-slate-50 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900 border-blue-200 dark:border-blue-800/80 shadow-sm";
    }
    if (isCompleted) {
      return "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80";
    }
    if (isCancelled) {
      return "bg-red-50/40 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 opacity-75";
    }
    return "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm";
  }, [isCurrent, isNext, isCompleted, isCancelled]);

  return (
    <div
      className={`w-full rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 flex items-start gap-3 sm:gap-4 relative overflow-hidden group`}
      aria-label={ariaLabel}
    >
      {/* LEFT: Time Column */}
      <div className="w-24 sm:w-28 shrink-0 flex flex-col justify-center border-r border-slate-100 dark:border-slate-800/80 pr-3 my-auto">
        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
          {item.startTime || "--:--"}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
          {item.endTime || "--:--"}
        </span>
      </div>

      {/* RIGHT: Subject & Teacher/Room Info */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Top Header Row: Subject Name & Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-snug">
            {item.subjectName}
          </h3>

          {/* Status Pills */}
          {isCurrent && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow-sm shrink-0 uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              NOW
            </span>
          )}
          {isNext && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0 uppercase tracking-wider border border-blue-200 dark:border-blue-900">
              NEXT
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Completed
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 shrink-0 uppercase tracking-wider">
              Cancelled
            </span>
          )}
        </div>

        {/* Teacher Name & Room Name Details */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
          {item.teacherName && (
            <div className="flex items-center gap-1 truncate">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.teacherName}</span>
            </div>
          )}
          {item.teacherName && item.roomName && (
            <span className="text-slate-300 dark:text-slate-700">•</span>
          )}
          {item.roomName && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.roomName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
