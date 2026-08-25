"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  variant?: "primary" | "emerald" | "indigo" | "dark";
  children: ReactNode;
}

export function AuthButton({
  isLoading,
  loadingText = "Signing in...",
  icon,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: AuthButtonProps) {
  const variantStyles = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 focus:ring-blue-500",
    emerald:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 focus:ring-emerald-500",
    indigo:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 focus:ring-indigo-500",
    dark:
      "bg-gray-900 hover:bg-black text-white shadow-gray-900/25 focus:ring-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700",
  };

  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-lg transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-950 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
