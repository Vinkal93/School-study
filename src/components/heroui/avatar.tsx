"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Avatar({
  children,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 select-none shadow-2xs border border-slate-200/80 dark:border-slate-700",
        sizeClasses,
        className
      )}
    >
      {children}
    </div>
  );
}

Avatar.Image = function AvatarImage({
  src,
  alt = "Avatar",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
};

Avatar.Fallback = function AvatarFallback({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      {children}
    </span>
  );
};

export default Avatar;
