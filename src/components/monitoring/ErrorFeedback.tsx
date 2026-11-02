"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw, Copy, Check, X } from "lucide-react";

export interface ErrorFeedbackProps {
  title?: string;
  message: string;
  referenceCode?: string;
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: "error" | "warning" | "info";
  className?: string;
}

export function ErrorFeedback({
  title,
  message,
  referenceCode,
  errorCode,
  onRetry,
  onDismiss,
  severity = "error",
  className = "",
}: ErrorFeedbackProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (referenceCode && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isWarning = severity === "warning";
  const isInfo = severity === "info";

  const containerClasses = isWarning
    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100"
    : isInfo
    ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-100"
    : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100";

  const iconClasses = isWarning
    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400"
    : isInfo
    ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
    : "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400";

  const btnClasses = isWarning
    ? "bg-amber-600 hover:bg-amber-700 text-white"
    : isInfo
    ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-rose-600 hover:bg-rose-700 text-white";

  return (
    <div
      role="alert"
      className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${containerClasses} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClasses}`}
        >
          <AlertCircle className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {title || (isWarning ? "Action Notice" : "Operation Failed")}
            </h4>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                title="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>

          <div className="pt-1.5 flex flex-wrap items-center gap-2">
            {errorCode && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
                {errorCode}
              </span>
            )}

            {referenceCode && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Click to copy error reference"
              >
                <span>Ref: {referenceCode}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-400" />
                )}
              </button>
            )}
          </div>

          {onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 ${btnClasses}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Operation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
