"use client";

import React, { useMemo } from "react";

interface GreetingProps {
  firstName: string;
}

export function Greeting({ firstName }: GreetingProps) {
  // Determine dynamic time-of-day greeting based on device local hour
  const timeOfDayGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  return (
    <div className="flex-1 min-w-0 px-1">
      <h1 className="text-lg sm:text-[20px] lg:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate leading-tight">
        <span>{timeOfDayGreeting}, {firstName}</span>
        <span className="inline-block text-lg sm:text-xl">👋</span>
      </h1>
      <p className="text-[14px] sm:text-[15px] text-slate-500 dark:text-slate-400 font-normal leading-normal truncate mt-0.5">
        Have a great day ahead!
      </p>
    </div>
  );
}
