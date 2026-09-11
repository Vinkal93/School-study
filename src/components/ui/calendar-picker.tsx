"use client";

import React, { useState } from "react";
import { Calendar, DateRange, CalendarEventIndicator } from "./calendar";
import { Button } from "./button";
import { Card, CardContent, CardFooter } from "./card";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ReportDateRangePickerProps {
  dateRange?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

export function ReportDateRangePicker({
  dateRange,
  onChange,
  className,
}: ReportDateRangePickerProps) {
  const today = new Date();

  const getSubDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };

  const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const getEndOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const getStartOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
  const getEndOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31);

  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYearDate = new Date(today.getFullYear() - 1, 0, 1);

  const presets = [
    {
      label: "Today",
      range: { from: today, to: today },
    },
    {
      label: "Yesterday",
      range: { from: getSubDays(1), to: getSubDays(1) },
    },
    {
      label: "Last 7 days",
      range: { from: getSubDays(6), to: today },
    },
    {
      label: "Last 30 days",
      range: { from: getSubDays(29), to: today },
    },
    {
      label: "Month to date",
      range: { from: getStartOfMonth(today), to: today },
    },
    {
      label: "Last month",
      range: { from: getStartOfMonth(prevMonthDate), to: getEndOfMonth(prevMonthDate) },
    },
    {
      label: "Year to date",
      range: { from: getStartOfYear(today), to: today },
    },
    {
      label: "Last year",
      range: { from: getStartOfYear(prevYearDate), to: getEndOfYear(prevYearDate) },
    },
  ];

  const [month, setMonth] = useState(today);
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(
    dateRange || { from: getSubDays(29), to: today }
  );

  const currentRange = dateRange || internalRange;

  const handleSelect = (range: DateRange) => {
    setInternalRange(range);
    if (range.from && range.to) {
      onChange?.(range);
    }
  };

  return (
    <Card className={cn("p-0 overflow-hidden shadow-md border-slate-200 dark:border-slate-800", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Preset Buttons Sidebar */}
          <div className="relative py-3 px-2 sm:w-36 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Quick Presets
            </div>
            <div className="flex flex-col gap-1">
              {presets.map((p) => {
                const isActive =
                  currentRange?.from &&
                  currentRange?.to &&
                  p.range.from.toDateString() === currentRange.from.toDateString() &&
                  p.range.to.toDateString() === currentRange.to.toDateString();

                return (
                  <Button
                    key={p.label}
                    size="sm"
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-xs font-semibold px-2.5 h-7",
                      isActive ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"
                    )}
                    onClick={() => {
                      setMonth(p.range.from);
                      handleSelect(p.range);
                    }}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Calendar Picker */}
          <div className="p-2 sm:p-3">
            <Calendar
              mode="range"
              month={month}
              onMonthChange={setMonth}
              selected={currentRange}
              onSelect={handleSelect}
              disabled={[{ after: today }]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface InquiryEventCalendarProps {
  events?: CalendarEventIndicator[];
  selectedDate?: Date;
  onSelectDate?: (date?: Date) => void;
  inquiryCountMap?: Record<string, number>;
  className?: string;
}

export function InquiryEventCalendar({
  events = [],
  selectedDate,
  onSelectDate,
  inquiryCountMap = {},
  className,
}: InquiryEventCalendarProps) {
  // Build event indicators from inquiry counts
  const computedEvents: CalendarEventIndicator[] = React.useMemo(() => {
    if (events.length > 0) return events;
    return Object.entries(inquiryCountMap).map(([dateStr, count]) => ({
      date: dateStr,
      count,
      color: count > 3 ? "bg-rose-500" : count > 1 ? "bg-amber-500" : "bg-emerald-500",
    }));
  }, [events, inquiryCountMap]);

  return (
    <Card className={cn("p-0 overflow-hidden shadow-sm border-slate-200 dark:border-slate-800", className)}>
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Inquiry Date Filter
          </span>
        </div>

        {selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate?.(undefined)}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <CardContent className="p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (selectedDate && d && selectedDate.toDateString() === d.toDateString()) {
              onSelectDate?.(undefined); // Toggle off if clicked again
            } else {
              onSelectDate?.(d);
            }
          }}
          events={computedEvents}
        />
      </CardContent>

      <CardFooter className="p-3 bg-slate-50/40 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 1 inquiry
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> 2-3 inquiries
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> 4+ inquiries
          </span>
        </div>
        {selectedDate && (
          <div className="text-blue-600 dark:text-blue-400 font-semibold pt-1">
            Filtering for: {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
