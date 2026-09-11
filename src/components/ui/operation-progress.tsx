"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface OperationProgressProps {
  open: boolean;
  title: string;
  description?: string;
  progress?: number; // 0 to 100
  status?: "pending" | "in_progress" | "completed" | "error";
  onClose?: () => void;
  className?: string;
}

export function OperationProgressModal({
  open,
  title,
  description,
  progress = 0,
  status = "in_progress",
  onClose,
  className,
}: OperationProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(progress);

  useEffect(() => {
    setDisplayProgress(progress);
  }, [progress]);

  if (!open) return null;

  const isComplete = status === "completed" || displayProgress >= 100;
  const isError = status === "error";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in" />

      <div
        className={cn(
          "relative z-50 w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center animate-in zoom-in-95",
          className
        )}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner">
          {isComplete ? (
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-in zoom-in">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : isError ? (
            <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isComplete
                  ? "bg-emerald-500"
                  : isError
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600"
              )}
              style={{ width: `${Math.min(Math.max(displayProgress, 5), 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>{isComplete ? "Completed" : isError ? "Failed" : "Processing..."}</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {Math.round(displayProgress)}%
            </span>
          </div>
        </div>

        {isComplete && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
