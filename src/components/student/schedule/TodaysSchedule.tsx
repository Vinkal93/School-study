"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ScheduleHeader } from "./ScheduleHeader";
import { ScheduleItemCard } from "./ScheduleItemCard";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { ScheduleEmptyState } from "./ScheduleEmptyState";
import { TodaysScheduleProps, ScheduleItemData, ClassScheduleStatus } from "./types";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Converts time strings like "09:00", "09:00 AM", or "14:30" into minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  
  // Handle AM/PM
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");
  const digits = clean.replace(/(AM|PM)/g, "").trim();
  const parts = digits.split(":");
  
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function TodaysSchedule({
  schedule,
  isHoliday = false,
  holidayName,
  loading = false,
  error = null,
  onRetry,
  onViewFullTimetable,
}: TodaysScheduleProps) {
  // Current device time in minutes from midnight for real-time status updates (Section 31)
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Compute real-time status & NEXT class flags dynamically (Sections 6-10, 25-27)
  const processedSchedule = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];

    let nextFound = false;

    return schedule.map((item) => {
      if (item.status === "cancelled") {
        return { ...item, status: "cancelled" as ClassScheduleStatus, isNext: false };
      }

      const startMin = parseTimeToMinutes(item.startTime);
      const endMin = parseTimeToMinutes(item.endTime);

      let computedStatus: ClassScheduleStatus = "upcoming";
      let isNext = false;

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        computedStatus = "current";
      } else if (currentMinutes >= endMin) {
        computedStatus = "completed";
      } else if (currentMinutes < startMin) {
        computedStatus = "upcoming";
        if (!nextFound) {
          isNext = true;
          nextFound = true;
        }
      }

      return {
        ...item,
        status: computedStatus,
        isNext,
      };
    });
  }, [schedule, currentMinutes]);

  const allCompleted = useMemo(() => {
    if (!processedSchedule || processedSchedule.length === 0) return false;
    return processedSchedule.every(
      (item) => item.status === "completed" || item.status === "cancelled"
    );
  }, [processedSchedule]);

  // 1. Loading Skeleton State (Section 21)
  if (loading) {
    return <ScheduleSkeleton />;
  }

  // 2. Error Fallback State (Section 22)
  if (error) {
    return (
      <div className="w-full space-y-3">
        <ScheduleHeader onViewFullTimetable={onViewFullTimetable} />
        <div className="w-full p-4 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error || "Unable to load today's schedule."}</span>
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
    <section className="w-full space-y-3.5" aria-label="Today's Schedule">
      <ScheduleHeader onViewFullTimetable={onViewFullTimetable} />

      {/* Holiday / Empty Schedule State (Sections 18-20) */}
      {isHoliday || !processedSchedule || processedSchedule.length === 0 ? (
        <ScheduleEmptyState isHoliday={isHoliday} holidayName={holidayName} />
      ) : (
        <div className="space-y-2.5">
          {processedSchedule.map((item) => (
            <ScheduleItemCard key={item.id} item={item} />
          ))}

          {/* All Classes Completed Banner (Section 26) */}
          {allCompleted && (
            <div className="w-full bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-center flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>All classes completed for today 🎉</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
