"use client";

import React, { createContext, useContext } from "react";
import { Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type AlertStatus = "default" | "accent" | "danger" | "success" | "warning";

interface AlertContextType {
  status: AlertStatus;
}

const AlertContext = createContext<AlertContextType>({ status: "default" });

export function Alert({
  children,
  status = "default",
  className,
}: {
  children: React.ReactNode;
  status?: AlertStatus;
  className?: string;
}) {
  const statusClasses = {
    default: "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200",
    accent: "bg-blue-50/80 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/80 dark:text-blue-200",
    danger: "bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-200",
    success: "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-200",
    warning: "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-200",
  }[status];

  return (
    <AlertContext.Provider value={{ status }}>
      <div
        role="alert"
        className={cn(
          "flex items-start gap-3.5 p-4 rounded-2xl border shadow-2xs transition-colors",
          statusClasses,
          className
        )}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
}

Alert.Indicator = function AlertIndicator({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { status } = useContext(AlertContext);

  if (children) {
    return <div className={cn("flex-shrink-0 mt-0.5", className)}>{children}</div>;
  }

  const defaultIcon = {
    default: <Info className="h-4.5 w-4.5 text-slate-500" />,
    accent: <Info className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />,
    danger: <AlertCircle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />,
    success: <CheckCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />,
  }[status];

  return <div className={cn("flex-shrink-0 mt-0.5", className)}>{defaultIcon}</div>;
};

Alert.Content = function AlertContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 space-y-1", className)}>{children}</div>;
};

Alert.Title = function AlertTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h4 className={cn("text-xs sm:text-sm font-bold leading-tight", className)}>
      {children}
    </h4>
  );
};

Alert.Description = function AlertDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-xs leading-relaxed opacity-90 font-normal", className)}>
      {children}
    </div>
  );
};

export default Alert;
