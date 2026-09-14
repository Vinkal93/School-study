"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface PromptSuggestionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PromptSuggestion({
  children,
  className,
  ...props
}: PromptSuggestionProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-xs hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
