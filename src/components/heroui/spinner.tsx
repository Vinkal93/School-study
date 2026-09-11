"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-3",
  }[size];

  return (
    <div
      role="status"
      className={cn(
        "rounded-full border-blue-600 border-t-transparent animate-spin inline-block",
        sizeClasses,
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
