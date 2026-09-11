"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DateRange {
  from: Date;
  to?: Date;
}

export interface CalendarEventIndicator {
  date: string; // YYYY-MM-DD
  count?: number;
  color?: string; // Tailwind class e.g. "bg-blue-500", "bg-emerald-500"
}

export interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | DateRange;
  onSelect?: (date: any) => void;
  captionLayout?: "buttons" | "dropdown";
  defaultMonth?: Date;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  className?: string;
  disabled?: Array<{ after?: Date; before?: Date } | Date | ((date: Date) => boolean)>;
  events?: CalendarEventIndicator[];
  hideNavigation?: boolean;
  required?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isSameDay(d1?: Date, d2?: Date) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isDateInRange(date: Date, range?: DateRange) {
  if (!range || !range.from || !range.to) return false;
  const t = date.getTime();
  const start = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()).getTime();
  const end = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()).getTime();
  return t >= start && t <= end;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  captionLayout = "buttons",
  defaultMonth,
  month: controlledMonth,
  onMonthChange,
  className,
  disabled = [],
  events = [],
  hideNavigation = false,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState<Date>(
    controlledMonth || defaultMonth || (selected instanceof Date ? selected : (selected as DateRange)?.from || new Date())
  );

  const currentMonth = controlledMonth || internalMonth;

  const setMonth = (newMonth: Date) => {
    if (!controlledMonth) {
      setInternalMonth(newMonth);
    }
    onMonthChange?.(newMonth);
  };

  const handlePrevMonth = () => {
    setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleYearChange = (year: number) => {
    setMonth(new Date(year, currentMonth.getMonth(), 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
  };

  // Calendar grid calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = useMemo(() => {
    const calendarDays = [];

    // Prev month days (padding)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to make complete grid of 35 or 42
    const totalRendered = calendarDays.length;
    const remaining = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return calendarDays;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  // Event lookups map
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEventIndicator>();
    for (const evt of events) {
      map.set(evt.date, evt);
    }
    return map;
  }, [events]);

  const isDayDisabled = (date: Date) => {
    for (const rule of disabled) {
      if (typeof rule === "function") {
        if (rule(date)) return true;
      } else if (rule instanceof Date) {
        if (isSameDay(date, rule)) return true;
      } else if (rule && typeof rule === "object") {
        if (rule.after && date.getTime() > rule.after.getTime()) return true;
        if (rule.before && date.getTime() < rule.before.getTime()) return true;
      }
    }
    return false;
  };

  const handleDateClick = (dayDate: Date) => {
    if (isDayDisabled(dayDate)) return;

    if (mode === "single") {
      onSelect?.(dayDate);
    } else if (mode === "range") {
      const currentRange = selected as DateRange | undefined;
      if (!currentRange || !currentRange.from || (currentRange.from && currentRange.to)) {
        onSelect?.({ from: dayDate, to: undefined });
      } else {
        if (dayDate < currentRange.from) {
          onSelect?.({ from: dayDate, to: currentRange.from });
        } else {
          onSelect?.({ from: currentRange.from, to: dayDate });
        }
      }
    }
  };

  const today = new Date();

  return (
    <div className={cn("p-3 select-none", className)}>
      {/* Header with Navigation or Dropdowns */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        {captionLayout === "dropdown" ? (
          <div className="flex items-center gap-2 w-full">
            <select
              value={month}
              onChange={(e) => handleMonthSelect(Number(e.target.value))}
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {Array.from({ length: 40 }, (_, i) => year - 20 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {MONTH_NAMES[month]} {year}
          </div>
        )}

        {!hideNavigation && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS_SHORT.map((day) => (
          <div key={day} className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map(({ date: dayDate, isCurrentMonth }, idx) => {
          const dateKey = formatDateKey(dayDate);
          const eventInfo = eventsMap.get(dateKey);
          const isToday = isSameDay(dayDate, today);
          const disabled = isDayDisabled(dayDate);

          let isSelected = false;
          let isRangeStart = false;
          let isRangeEnd = false;
          let isInRange = false;

          if (mode === "single" && selected instanceof Date) {
            isSelected = isSameDay(dayDate, selected);
          } else if (mode === "range" && selected && typeof selected === "object" && "from" in selected) {
            const range = selected as DateRange;
            isRangeStart = isSameDay(dayDate, range.from);
            isRangeEnd = isSameDay(dayDate, range.to);
            isSelected = isRangeStart || isRangeEnd;
            isInRange = isDateInRange(dayDate, range);
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleDateClick(dayDate)}
              className={cn(
                "relative h-8 w-8 mx-auto flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer",
                !isCurrentMonth && "text-slate-300 dark:text-slate-600 opacity-60",
                isCurrentMonth && "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                isToday && !isSelected && "font-bold text-blue-600 dark:text-blue-400 border border-blue-400/50",
                isInRange && !isSelected && "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-none",
                isSelected && "bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs",
                isRangeStart && "rounded-l-lg",
                isRangeEnd && "rounded-r-lg",
                disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <span>{dayDate.getDate()}</span>

              {/* Event indicator dot */}
              {eventInfo && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-white" : eventInfo.color || "bg-emerald-500"
                  )}
                  title={eventInfo.count ? `${eventInfo.count} inquiries/events` : "Event"}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
