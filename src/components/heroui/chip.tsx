"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: "success" | "warning" | "danger" | "accent" | "default";
  variant?: "solid" | "soft" | "bordered";
}

export function Chip({
  children,
  color = "default",
  variant = "soft",
  className,
  ...props
}: ChipProps) {
  const colorClasses = {
    default:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    danger:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    accent:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  }[color];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs",
        colorClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

Chip.Label = function ChipLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("inline-block", className)}>{children}</span>;
};

export default Chip;
