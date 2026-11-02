"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-4 shadow-2xs">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-rose-950 dark:text-rose-200">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs sm:text-sm text-rose-800/80 dark:text-rose-300/80">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
