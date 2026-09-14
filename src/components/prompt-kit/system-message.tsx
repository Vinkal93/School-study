"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Sparkles } from "lucide-react";

export interface SystemMessageProps {
  variant?: "action" | "warning" | "error" | "info";
  fill?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SystemMessage({
  variant = "info",
  fill = false,
  className,
  children,
}: SystemMessageProps) {
  const variantStyles = {
    action: "border-indigo-200 text-indigo-800 dark:border-indigo-900/60 dark:text-indigo-300",
    warning: "border-amber-200 text-amber-800 dark:border-amber-900/60 dark:text-amber-300",
    error: "border-rose-200 text-rose-800 dark:border-rose-900/60 dark:text-rose-300",
    info: "border-slate-200 text-slate-800 dark:border-slate-800 dark:text-slate-300",
  }[variant];

  const fillStyles = {
    action: "bg-indigo-50 dark:bg-indigo-950/40",
    warning: "bg-amber-50 dark:bg-amber-950/40",
    error: "bg-rose-50 dark:bg-rose-950/40",
    info: "bg-slate-50 dark:bg-slate-900/40",
  }[variant];

  const icon = {
    action: <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
    error: <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />,
    info: <Info className="h-4 w-4 shrink-0 text-slate-500" />,
  }[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-all shadow-xs",
        variantStyles,
        fill && fillStyles,
        className
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
