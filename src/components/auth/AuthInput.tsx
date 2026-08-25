"use client";

import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, id, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 text-left">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        <div className="relative rounded-xl shadow-sm">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={`w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-75 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 ${
              icon ? "pl-10" : "pl-3.5"
            } pr-3.5 ${
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
