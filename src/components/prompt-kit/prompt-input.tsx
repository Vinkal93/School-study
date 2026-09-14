"use client";

import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils/cn";

interface PromptInputContextType {
  value: string;
  onValueChange: (val: string) => void;
  isLoading?: boolean;
  onSubmit: () => void;
}

const PromptInputContext = createContext<PromptInputContextType | null>(null);

export interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  onSubmit: () => void;
  className?: string;
  children: React.ReactNode;
}

export function PromptInput({
  value,
  onValueChange,
  isLoading,
  onSubmit,
  className,
  children,
}: PromptInputProps) {
  return (
    <PromptInputContext.Provider value={{ value, onValueChange, isLoading, onSubmit }}>
      <div
        className={cn(
          "relative flex flex-col w-full rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20",
          className
        )}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  );
}

export interface PromptInputTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  placeholder?: string;
}

export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, placeholder = "Type a message...", onKeyDown, ...props }, ref) => {
    const ctx = useContext(PromptInputContext);
    if (!ctx) throw new Error("PromptInputTextarea must be used within PromptInput");

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      ctx.onValueChange(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ctx.onSubmit();
      }
      onKeyDown?.(e);
    };

    return (
      <textarea
        ref={ref}
        rows={1}
        value={ctx.value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={ctx.isLoading}
        className={cn(
          "w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-0 leading-relaxed disabled:opacity-60",
          className
        )}
        {...props}
      />
    );
  }
);
PromptInputTextarea.displayName = "PromptInputTextarea";

export function PromptInputActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 pb-3", className)}>
      {children}
    </div>
  );
}

export function PromptInputAction({
  tooltip,
  children,
  className,
}: {
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex items-center", className)} title={tooltip}>
      {children}
    </div>
  );
}
