"use client";

import React, { useState, createContext, useContext } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CalendarContextType {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  viewMode: "calendar" | "yearPicker";
  setViewMode: React.Dispatch<React.SetStateAction<"calendar" | "yearPicker">>;
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
}

const CalendarContext = createContext<CalendarContextType>({
  currentDate: new Date(),
  setCurrentDate: () => {},
  viewMode: "calendar",
  setViewMode: () => {},
  selectedDate: null,
  setSelectedDate: () => {},
});

export function Calendar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "yearPicker">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        setCurrentDate,
        viewMode,
        setViewMode,
        selectedDate,
        setSelectedDate,
      }}
    >
      <div
        className={cn(
          "w-72 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl select-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CalendarContext.Provider>
  );
}

Calendar.Header = function CalendarHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3",
        className
      )}
    >
      {children}
    </div>
  );
};

Calendar.YearPickerTrigger = function CalendarYearPickerTrigger({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { viewMode, setViewMode } = useContext(CalendarContext);

  return (
    <button
      type="button"
      onClick={() =>
        setViewMode((m) => (m === "yearPicker" ? "calendar" : "yearPicker"))
      }
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
};

Calendar.YearPickerTriggerHeading = function CalendarYearPickerTriggerHeading() {
  const { currentDate } = useContext(CalendarContext);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return (
    <span>
      {months[currentDate.getMonth()]} {currentDate.getFullYear()}
    </span>
  );
};

Calendar.YearPickerTriggerIndicator = function CalendarYearPickerTriggerIndicator() {
  const { viewMode } = useContext(CalendarContext);
  return (
    <ChevronDown
      className={cn(
        "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
        viewMode === "yearPicker" && "rotate-180"
      )}
    />
  );
};

Calendar.NavButton = function CalendarNavButton({
  slot,
  className,
}: {
  slot: "previous" | "next";
  className?: string;
}) {
  const { setCurrentDate, viewMode } = useContext(CalendarContext);

  const handleClick = () => {
    if (viewMode === "yearPicker") {
      setCurrentDate((prev) => {
        const nextYear = slot === "previous" ? prev.getFullYear() - 12 : prev.getFullYear() + 12;
        return new Date(nextYear, prev.getMonth(), 1);
      });
    } else {
      setCurrentDate((prev) => {
        const nextMonth = slot === "previous" ? prev.getMonth() - 1 : prev.getMonth() + 1;
        return new Date(prev.getFullYear(), nextMonth, 1);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
        className
      )}
      aria-label={slot === "previous" ? "Previous" : "Next"}
    >
      {slot === "previous" ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
};

Calendar.Grid = function CalendarGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { viewMode } = useContext(CalendarContext);
  if (viewMode === "yearPicker") return null;

  return <div className={cn("space-y-2", className)}>{children}</div>;
};

Calendar.GridHeader = function CalendarGridHeader({
  children,
}: {
  children: (day: string) => React.ReactNode;
}) {
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return (
    <div className="grid grid-cols-7 gap-1 text-center mb-1">
      {days.map((d) => children(d))}
    </div>
  );
};

Calendar.HeaderCell = function CalendarHeaderCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
      {children}
    </span>
  );
};

Calendar.GridBody = function CalendarGridBody({
  children,
}: {
  children: (date: Date) => React.ReactNode;
}) {
  const { currentDate } = useContext(CalendarContext);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates: Date[] = [];
  // previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push(new Date(year, month, -i));
  }
  // current month days
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  // next month padding
  const remaining = 35 - dates.length;
  for (let i = 1; i <= remaining; i++) {
    dates.push(new Date(year, month + 1, i));
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {dates.map((date, idx) => (
        <React.Fragment key={idx}>{children(date)}</React.Fragment>
      ))}
    </div>
  );
};

Calendar.Cell = function CalendarCell({ date }: { date: Date }) {
  const { currentDate, selectedDate, setSelectedDate } = useContext(CalendarContext);
  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
  const isSelected =
    selectedDate &&
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getDate() === selectedDate.getDate();

  return (
    <button
      type="button"
      onClick={() => setSelectedDate(date)}
      className={cn(
        "h-8 w-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer",
        !isCurrentMonth && "text-slate-300 dark:text-slate-700",
        isCurrentMonth && !isSelected && "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
        isSelected && "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20"
      )}
    >
      {date.getDate()}
    </button>
  );
};

Calendar.YearPickerGrid = function CalendarYearPickerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { viewMode } = useContext(CalendarContext);
  if (viewMode !== "yearPicker") return null;

  return <div className={cn("space-y-2 py-2", className)}>{children}</div>;
};

Calendar.YearPickerGridBody = function CalendarYearPickerGridBody({
  children,
}: {
  children: (item: { year: number }) => React.ReactNode;
}) {
  const { currentDate } = useContext(CalendarContext);
  const startYear = Math.floor(currentDate.getFullYear() / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className="grid grid-cols-3 gap-2">
      {years.map((year) => (
        <React.Fragment key={year}>{children({ year })}</React.Fragment>
      ))}
    </div>
  );
};

Calendar.YearPickerCell = function CalendarYearPickerCell({
  year,
}: {
  year: number;
}) {
  const { currentDate, setCurrentDate, setViewMode } = useContext(CalendarContext);
  const isCurrentYear = currentDate.getFullYear() === year;

  const handleSelectYear = () => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setViewMode("calendar");
  };

  return (
    <button
      type="button"
      onClick={handleSelectYear}
      className={cn(
        "py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer",
        isCurrentYear
          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      {year}
    </button>
  );
};

export default Calendar;
