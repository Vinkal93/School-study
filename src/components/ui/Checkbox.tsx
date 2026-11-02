"use client";

import React, { forwardRef, useId } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  error?: boolean;
  containerClassName?: string;
  labelClassName?: string;
}

/**
 * Material 3 Inspired Accessible Checkbox Component
 * Part of Phase 5: Global UI Component System
 *
 * Fully supports:
 * - Checked, Unchecked, and Indeterminate states
 * - Keyboard navigation (Space to toggle, Tab to focus)
 * - Accessible ARIA attributes and native form submission
 * - High-contrast focus rings and dark mode
 * - Adequate touch targets for mobile accessibility
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id: customId,
      checked,
      indeterminate,
      disabled,
      onChange,
      label,
      description,
      size = "md",
      error = false,
      className,
      containerClassName,
      labelClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;

    const sizeClasses = {
      sm: "h-4 w-4 rounded-sm",
      md: "h-5 w-5 rounded-[5px]",
      lg: "h-6 w-6 rounded-md",
    };

    const iconSizes = {
      sm: "h-3 w-3 stroke-[2.5]",
      md: "h-3.5 w-3.5 stroke-[2.5]",
      lg: "h-4 w-4 stroke-[3]",
    };

    const isChecked = Boolean(checked && !indeterminate);
    const isIndeterminate = Boolean(indeterminate);

    return (
      <div
        className={cn(
          "inline-flex items-start gap-2.5 relative select-none",
          disabled && "opacity-60 cursor-not-allowed",
          containerClassName
        )}
      >
        <div className="relative flex items-center justify-center pt-0.5">
          {/* Native Hidden Checkbox for full Accessibility & Forms */}
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            aria-checked={isIndeterminate ? "mixed" : isChecked}
            {...props}
          />

          {/* Styled Material 3 Visual Checkbox */}
          <label
            htmlFor={id}
            className={cn(
              "flex items-center justify-center border transition-all duration-200 cursor-pointer shadow-xs",
              sizeClasses[size],
              // Border & Background states
              isChecked || isIndeterminate
                ? error
                  ? "bg-rose-600 border-rose-600 text-white"
                  : "bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500"
                : error
                ? "bg-rose-50/50 border-rose-400 hover:border-rose-600 dark:bg-rose-950/20 dark:border-rose-800"
                : "bg-white border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600",
              // Focus ring through peer
              "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-950",
              // Disabled state
              disabled && "cursor-not-allowed border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
              className
            )}
          >
            {isChecked && (
              <Check className={cn(iconSizes[size], "animate-in zoom-in-75 duration-150")} />
            )}
            {isIndeterminate && (
              <Minus className={cn(iconSizes[size], "animate-in zoom-in-75 duration-150")} />
            )}
          </label>
        </div>

        {/* Optional Label and Description */}
        {(label || description) && (
          <div className="flex flex-col text-sm">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  "font-medium text-slate-800 dark:text-slate-200 cursor-pointer leading-tight",
                  disabled && "cursor-not-allowed",
                  labelClassName
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
