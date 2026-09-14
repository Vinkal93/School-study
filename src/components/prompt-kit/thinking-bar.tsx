"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { Sparkles, X } from "lucide-react";
import { TextShimmer } from "./text-shimmer";

export interface ThinkingBarProps {
  text?: string;
  stopLabel?: string;
  onStop?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ThinkingBar({
  text = "Deep reasoning in progress",
  stopLabel = "Skip thinking",
  onStop,
  onClick,
  className,
}: ThinkingBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 shadow-xs",
        className
      )}
    >
      <div
        onClick={onClick}
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
      >
        <Sparkles className="h-4 w-4 text-indigo-500 animate-spin" />
        <TextShimmer className="text-xs">{text}</TextShimmer>
      </div>

      {onStop && (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
        >
          <X className="h-3 w-3" />
          <span>{stopLabel}</span>
        </button>
      )}
    </div>
  );
}
