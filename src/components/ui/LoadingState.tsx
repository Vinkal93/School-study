"use client";

import React from "react";
import { Spinner } from "@/components/common/Spinner";
import { cn } from "@/lib/utils/cn";

export interface LoadingStateProps {
  label?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  label = "Loading data...",
  description,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 min-h-[220px]",
        className
      )}
    >
      <Spinner size="lg" className="mb-3 text-blue-600 dark:text-blue-400" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}
