"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, AlertCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ConfirmDialogSeverity = "danger" | "warning" | "info" | "neutral";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  severity?: ConfirmDialogSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  entityName?: string;
  entityId?: string;
  entityType?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  severity = "danger",
  confirmLabel,
  cancelLabel = "Cancel",
  isLoading = false,
  entityName,
  entityId,
  entityType,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
  className,
  contentClassName,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const isBusy = isLoading || internalLoading;

  // Track hydration for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Save previously focused element and lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    // Capture currently focused element before opening
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Lock body scrolling
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    // Auto-focus cancel button on open for safety
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore focus to original trigger element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        try {
          previousActiveElement.current.focus();
        } catch {}
      }
    };
  }, [isOpen]);

  // Keyboard trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape && !isBusy) {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, isBusy, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick && !isBusy) {
      onClose();
    }
  };

  const handleConfirmAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBusy) return;

    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("[ConfirmDialog] Confirmation action error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  // Severity styles
  const severityConfigs = {
    danger: {
      badgeBg: "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-xs",
      defaultIcon: <AlertTriangle className="h-6 w-6 stroke-[2.2]" />,
      confirmBtn: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-600/20",
      defaultConfirmLabel: "Delete",
    },
    warning: {
      badgeBg: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shadow-xs",
      defaultIcon: <AlertCircle className="h-6 w-6 stroke-[2.2]" />,
      confirmBtn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-md shadow-amber-600/20",
      defaultConfirmLabel: "Proceed",
    },
    info: {
      badgeBg: "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-xs",
      defaultIcon: <Info className="h-6 w-6 stroke-[2.2]" />,
      confirmBtn: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/20",
      defaultConfirmLabel: "Confirm",
    },
    neutral: {
      badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs",
      defaultIcon: <Info className="h-6 w-6 stroke-[2.2]" />,
      confirmBtn: "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 shadow-md",
      defaultConfirmLabel: "Continue",
    },
  };

  const currentConfig = severityConfigs[severity] || severityConfigs.danger;
  const resolvedConfirmLabel = confirmLabel || currentConfig.defaultConfirmLabel;
  const resolvedIcon = icon || currentConfig.defaultIcon;

  const modalNode = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150",
        className
      )}
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
    >
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-auto",
          contentClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Severity Icon Badge and Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", currentConfig.badgeBg)}>
              {resolvedIcon}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate"
              >
                {title}
              </h3>
              {entityType && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {entityType}
                </p>
              )}
            </div>
          </div>

          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Entity Card if Entity details provided */}
        {(entityName || entityId) && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-1.5 text-xs">
            {entityName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {entityType ? `${entityType} Name:` : "Target:"}
                </span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {entityName}
                </span>
              </div>
            )}
            {entityId && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  ID:
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {entityId}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <div
            id="confirm-dialog-desc"
            className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal"
          >
            {description}
          </div>
        )}

        {/* Optional custom content / inputs */}
        {children}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-semibold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleConfirmAction}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
              currentConfig.confirmBtn
            )}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{resolvedConfirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : null;
}
