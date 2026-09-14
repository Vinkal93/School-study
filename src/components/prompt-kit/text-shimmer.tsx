"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
}

export function TextShimmer({ children, className }: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-flex bg-linear-to-r from-gray-400 via-indigo-600 to-gray-400 dark:from-gray-500 dark:via-indigo-300 dark:to-gray-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
