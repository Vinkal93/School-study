"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Checkbox20Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  badge?: string;
}

/**
 * @reui/c-checkbox-20: Modern card/tile checkbox with animated checkmark and micro-interactions
 */
export function Checkbox20({
  checked,
  onChange,
  label,
  description,
  badge,
  className,
  disabled,
  ...props
}: Checkbox20Props) {
  return (
    <label
      className={cn(
        "relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
        checked
          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
            checked
              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs scale-105"
              : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-transparent"
          )}
        >
          <Check className={cn("w-3.5 h-3.5 stroke-[3] transition-transform", checked ? "scale-100" : "scale-0")} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span
              className={cn(
                "text-xs font-bold leading-none",
                checked
                  ? "text-indigo-950 dark:text-indigo-200"
                  : "text-gray-900 dark:text-white"
              )}
            >
              {label}
            </span>
          )}
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

export default Checkbox20;
