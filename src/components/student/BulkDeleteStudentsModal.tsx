"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Loader2, X, ShieldAlert, Archive, Check } from "lucide-react";

export interface BulkDeleteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent: boolean) => Promise<void>;
  selectedCount: number;
  isAllFiltered: boolean;
  filterSummary?: {
    className?: string;
    sectionName?: string;
    status?: string;
    searchQuery?: string;
  };
  isDeleting: boolean;
}

export function BulkDeleteStudentsModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isAllFiltered,
  filterSummary,
  isDeleting,
}: BulkDeleteStudentsModalProps) {
  const isLargeBatch = selectedCount > 10 || isAllFiltered;
  const isArchivedView = filterSummary?.status === "deleted";

  // If already in archived view, default to permanent purge, otherwise safe soft delete
  const [isPermanent, setIsPermanent] = useState<boolean>(isArchivedView);
  const [confirmationInput, setConfirmationInput] = useState("");

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput("");
      setIsPermanent(isArchivedView);
    }
  }, [isOpen, isArchivedView]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || isDeleting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const isConfirmationSatisfied = !isLargeBatch || confirmationInput.trim().toUpperCase() === "DELETE";

  const handleExecute = async () => {
    if (!isConfirmationSatisfied || isDeleting) return;
    await onConfirm(isPermanent);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-xs">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Confirm Bulk Student Deletion
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authorized administrative action
              </p>
            </div>
          </div>
          {!isDeleting && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Count & Scope Banner */}
        <div className="rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              {isAllFiltered
                ? `You are about to delete all ${selectedCount} students matching the active filter!`
                : `You are about to delete ${selectedCount} selected student profile${selectedCount === 1 ? "" : "s"}.`}
            </span>
          </div>

          {filterSummary && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {filterSummary.className && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  Class: <strong className="text-slate-900 dark:text-white">{filterSummary.className}</strong>
                </span>
              )}
              {filterSummary.sectionName && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  Section: <strong className="text-slate-900 dark:text-white">{filterSummary.sectionName}</strong>
                </span>
              )}
              {filterSummary.status && filterSummary.status !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 capitalize">
                  Status: <strong className="text-slate-900 dark:text-white">{filterSummary.status}</strong>
                </span>
              )}
              {filterSummary.searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  Search: <strong className="text-slate-900 dark:text-white">"{filterSummary.searchQuery}"</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Deletion Mode Radio Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Choose Deletion Mode:
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Soft Delete / Archive */}
            <div
              onClick={() => !isDeleting && setIsPermanent(false)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !isPermanent
                  ? "border-blue-500 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-950/20 ring-1 ring-blue-500"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  !isPermanent
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {!isPermanent && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Archive className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Soft Delete / Archive (Recommended)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    Safe
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Marks status as archived, disables student login, and decrements your active plan usage count. Preserves financial ledgers and academic audit trail. Can be restored later.
                </p>
              </div>
            </div>

            {/* Permanent Purge */}
            <div
              onClick={() => !isDeleting && setIsPermanent(true)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                isPermanent
                  ? "border-rose-500 bg-rose-50/50 dark:border-rose-600 dark:bg-rose-950/20 ring-1 ring-rose-500"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  isPermanent
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {isPermanent && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Permanent Purge
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                    Irreversible
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Permanently deletes student records from the database. Free up plan quota. This operation cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Second-Tier Confirmation for Large Batches (> 10 or allFiltered) */}
        {isLargeBatch && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Second Confirmation Required</span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Because you are deleting a large volume of students (<strong>{selectedCount}</strong> records), please type <strong className="font-mono text-slate-900 dark:text-white uppercase tracking-wider">DELETE</strong> below to confirm.
            </p>
            <div>
              <input
                type="text"
                disabled={isDeleting}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isConfirmationSatisfied || isDeleting}
            onClick={handleExecute}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Deletion...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>
                  {isPermanent ? "Permanently Delete" : "Archive"} {selectedCount} Student{selectedCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
