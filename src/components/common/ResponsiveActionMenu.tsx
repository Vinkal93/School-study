"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 180; // w-44 is ~176px + padding
    const approxItemHeight = 38;
    const estimatedHeight = Math.max(120, secondaryActions.length * approxItemHeight + 16);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldFlipUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number | undefined;
    let bottom: number | undefined;

    if (shouldFlipUp) {
      bottom = Math.max(8, window.innerHeight - rect.top + 6);
    } else {
      top = Math.max(8, rect.bottom + 6);
    }

    let left: number;
    if (menuPosition === "right") {
      left = rect.right - menuWidth;
    } else {
      left = rect.left;
    }

    // Clamp horizontally so menu never overflows screen viewport
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setCoords({ top, bottom, left });
  }, [menuPosition, secondaryActions.length]);

  // Handle outside click, scroll, resize, escape
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      if (!triggerRef.current) {
        setIsOpen(false);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      // If button scrolled off-screen, dismiss
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
      } else {
        updatePosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
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
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            aria-expanded={isOpen}
            title="More actions"
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer",
              isOpen && "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {/* Flyout Menu in Portal */}
          {mounted &&
            isOpen &&
            coords &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: coords.top !== undefined ? `${coords.top}px` : undefined,
                  bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                  left: `${coords.left}px`,
                  zIndex: 99999,
                }}
                className="w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5 dark:ring-white/10"
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
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}
