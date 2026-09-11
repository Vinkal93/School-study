"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "danger-soft"
    | "default"
    | "warning"
    | "success";
  size?: "sm" | "md" | "lg";
  onPress?: (e: any) => void;
  slot?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      onPress,
      onClick,
      type = "button",
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onPress) onPress(e);
      if (onClick) onClick(e);
    };

    const variantClasses = {
      default:
        "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20",
      secondary:
        "bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs",
      tertiary:
        "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20",
      "danger-soft":
        "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80",
      warning:
        "bg-amber-600 hover:bg-amber-700 text-white shadow-sm",
      success:
        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    }[variant];

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5 font-semibold",
      md: "px-4 py-2 text-xs sm:text-sm rounded-xl gap-2 font-bold",
      lg: "px-5 py-2.5 text-sm sm:text-base rounded-2xl gap-2.5 font-bold",
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center select-none active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function CloseButton({
  onClick,
  onPress,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onPress?: (e: any) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onPress) onPress(e);
        if (onClick) onClick(e);
      }}
      className={cn(
        "p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
        className
      )}
      aria-label="Close"
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
