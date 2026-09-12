"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string; // e.g. "Delete Student?"
  entityType?: string; // e.g. "Student", "Teacher", "Notice", "Class", "Fee Structure"
  entityName?: string; // e.g. "Rahul Kumar"
  itemName?: string;
  entityId?: string; // e.g. "STU564534"
  itemId?: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityType = "Record",
  entityName,
  itemName,
  entityId,
  itemId,
  description,
  message,
  confirmLabel = "Delete",
  isDeleting: externalIsDeleting,
}: ConfirmDeleteModalProps) {
  const resolvedEntityName = entityName || itemName || "Record";
  const resolvedEntityId = entityId || itemId;
  const resolvedDescription = message || description || "This action cannot be undone. Associated data will be archived or removed according to platform policy.";

  const [internalIsDeleting, setInternalIsDeleting] = useState(false);
  const isPending = externalIsDeleting ?? internalIsDeleting;

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const resolvedTitle = title || `Delete ${entityType}?`;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    try {
      setInternalIsDeleting(true);
      await onConfirm();
    } finally {
      setInternalIsDeleting(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="confirm-delete-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-tight"
              >
                {resolvedTitle}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Entity Details Card */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {entityType}:
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
              {resolvedEntityName}
            </span>
          </div>

          {resolvedEntityId && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {entityType} ID:
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {resolvedEntityId}
              </span>
            </div>
          )}
        </div>

        {/* Description / Policy */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {resolvedDescription}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition active:scale-95 cursor-pointer",
              "bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none shadow-rose-600/20"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
