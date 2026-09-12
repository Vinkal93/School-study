"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "danger" | "warning" | "success";
  destructive?: boolean;
  className?: string;
  disabled?: boolean;
}

export interface ResponsiveActionMenuProps {
  primaryActions?: React.ReactNode | ActionMenuItem[];
  secondaryActions: ActionMenuItem[];
  menuPosition?: "left" | "right";
  className?: string;
}

export function ResponsiveActionMenu({
  primaryActions,
  secondaryActions,
  menuPosition = "right",
  className,
}: ResponsiveActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} ref={menuRef}>
      {/* Primary Visible Actions */}
      {Array.isArray(primaryActions)
        ? primaryActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={action.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick(e);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition cursor-pointer",
                action.className
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))
        : primaryActions}

      {/* Secondary Actions Trigger */}
      {secondaryActions && secondaryActions.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((prev) => !prev)}
            }
            aria-expanded={isOpen}
            title="More actions"
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer",
              isOpen && "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {/* Flyout Menu */}
          {isOpen && (
            <div
              className={cn(
                "absolute top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100",
                menuPosition === "right" ? "right-0" : "left-0"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {secondaryActions.map((action, idx) => {
                const isDanger = action.variant === "danger" || Boolean(action.destructive);
                const isWarning = action.variant === "warning";
                const isSuccess = action.variant === "success";

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={action.disabled}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      action.onClick(e);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition cursor-pointer text-left",
                      isDanger
                        ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        : isWarning
                        ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        : isSuccess
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      action.disabled && "opacity-50 pointer-events-none"
                    )}
                  >
                    {action.icon && <span className="shrink-0">{action.icon}</span>}
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
