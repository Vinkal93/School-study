"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface HeroTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface HeroTabsProps {
  tabs: HeroTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "solid" | "bordered" | "underlined";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Modern HeroUI Tabs Component
 */
export function HeroTabs({
  tabs,
  activeTab,
  onChange,
  variant = "solid",
  size = "md",
  className,
}: HeroTabsProps) {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-xs sm:text-sm gap-2",
    lg: "px-4.5 py-2 text-sm sm:text-base gap-2.5",
  }[size];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar",
        variant === "bordered" && "bg-transparent border border-slate-200 dark:border-slate-700",
        variant === "underlined" && "bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 rounded-none p-0 gap-4",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              "inline-flex items-center justify-center font-bold rounded-xl transition-all select-none whitespace-nowrap cursor-pointer",
              sizeClasses,
              variant === "solid" && [
                isActive
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm shadow-slate-900/5"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50",
              ],
              variant === "underlined" && [
                "rounded-none pb-2.5 border-b-2",
                isActive
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              ],
              tab.disabled && "opacity-40 pointer-events-none"
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default HeroTabs;
