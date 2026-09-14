"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2, AlertCircle, RefreshCw, ShieldCheck, Database } from "lucide-react";
import { toast } from "sonner";

interface BackupNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  onComplete?: () => void;
}

const BACKUP_MODULES = [
  { id: "Students", label: "Student Profiles & Enrollments" },
  { id: "Teachers", label: "Faculty Directory & Qualifications" },
  { id: "Classes", label: "Grade Levels, Divisions & Class Teachers" },
  { id: "Attendance", label: "Daily Roll Call & Student Attendance" },
  { id: "Fees", label: "Fee Collections & Payment Transactions" },
  { id: "Subscriptions", label: "School SaaS Plan & Billing Status" },
  { id: "Notices", label: "Broadcast Announcements & Circulars" },
  { id: "Admins", label: "School Administrator Profiles" },
  { id: "Audit_Logs", label: "Security & Operational Audit Trails" },
];

export function BackupNowModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  onComplete,
}: BackupNowModalProps) {
  const [inProgress, setInProgress] = useState(false);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const startBackup = async () => {
    setInProgress(true);
    setResult(null);
    setError(null);
    setCompletedModules([]);

    // Animate module steps sequentially while server executes
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < BACKUP_MODULES.length) {
        const mod = BACKUP_MODULES[currentIdx];
        setActiveModule(mod.id);
        setCompletedModules((prev) => [...prev, mod.id]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    try {
      const res = await fetch("/api/super-admin/backup/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          syncType: "manual",
          isFullSnapshot: true,
        }),
      });

      clearInterval(interval);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setResult(data);
        setCompletedModules(BACKUP_MODULES.map((m) => m.id));
        setActiveModule("");
        toast.success("Full backup snapshot created and mirrored to Google Sheets!");
        if (onComplete) onComplete();
      } else {
        setError(data.error || "Backup failed to complete.");
        toast.error(data.error || "Backup encountered an error.");
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Network request timed out.");
      toast.error(err.message || "Failed to trigger backup.");
    } finally {
      setInProgress(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startBackup();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Full Production Backup in Progress
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Target: {schoolName} ({schoolId})
              </p>
            </div>
          </div>
          {!inProgress && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body Checklist */}
        <div className="p-5 space-y-3">
          <div className="space-y-2">
            {BACKUP_MODULES.map((mod) => {
              const isDone = completedModules.includes(mod.id);
              const isActive = activeModule === mod.id && inProgress;
              const count = result?.counts?.[mod.id];

              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                      : isActive
                      ? "border-blue-300 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 animate-pulse"
                      : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                    )}
                    <span className="font-semibold">{mod.label}</span>
                  </div>

                  {count !== undefined && (
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      {count.toLocaleString()} rows
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Success summary banner */}
          {result && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Backup Complete &amp; Integrity Verified</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {result.message} {result.snapshotId ? `(Snapshot ID: ${result.snapshotId.slice(0, 16)}...)` : ""}
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>Backup Failed</span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {inProgress ? "Processing Firestore batches..." : "Backup operation finished"}
          </span>
          <div className="flex items-center gap-2">
            {error && (
              <button
                type="button"
                onClick={startBackup}
                disabled={inProgress}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Backup</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={inProgress}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
