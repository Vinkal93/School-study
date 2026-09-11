"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "default" | "lg" | "xl";
}

export function Avatar({ className, size = "default", children, ...props }: AvatarProps) {
  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    default: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  }[size];

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 rounded-full overflow-visible select-none items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold shadow-xs",
        sizeClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function AvatarImage({ className, alt = "", src, ...props }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn("h-full w-full rounded-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold", className)}>
      {children}
    </span>
  );
}

export interface AvatarBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: "online" | "away_1d" | "away_1w" | "away_1m" | "offline";
}

export function AvatarBadge({ className, status, ...props }: AvatarBadgeProps) {
  // Color mapping based on user requirement:
  // - Online: green
  // - 1 day before: yellow
  // - 1 week before: yellow-amber
  // - 1 month before: blue
  // - Offline / Suspended: red/destructive
  const statusColor = status
    ? {
        online: "bg-emerald-500",
        away_1d: "bg-amber-400",
        away_1w: "bg-yellow-500",
        away_1m: "bg-blue-500",
        offline: "bg-slate-400 dark:bg-slate-600",
      }[status]
    : "bg-emerald-500";

  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-950",
        statusColor,
        className
      )}
      {...props}
    />
  );
}

/**
 * Utility helper to compute badge color and label from last active timestamp
 */
export function computeUserActivityStatus(lastActiveAt?: string | number | Date | null): {
  status: "online" | "away_1d" | "away_1w" | "away_1m" | "offline";
  label: string;
  badgeClass: string;
} {
  if (!lastActiveAt) {
    return { status: "offline", label: "Offline", badgeClass: "bg-slate-400" };
  }

  const date = new Date(lastActiveAt).getTime();
  if (isNaN(date)) {
    return { status: "offline", label: "Offline", badgeClass: "bg-slate-400" };
  }

  const diffMs = Date.now() - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours <= 1) {
    return { status: "online", label: "Online now", badgeClass: "bg-emerald-500 animate-pulse" };
  }
  if (diffDays <= 1) {
    return { status: "away_1d", label: "Active today", badgeClass: "bg-amber-400" };
  }
  if (diffDays <= 7) {
    return { status: "away_1w", label: "Active this week", badgeClass: "bg-yellow-500" };
  }
  if (diffDays <= 30) {
    return { status: "away_1m", label: "Active this month", badgeClass: "bg-blue-500" };
  }

  return { status: "offline", label: "Inactive (>1 month)", badgeClass: "bg-slate-400" };
}
