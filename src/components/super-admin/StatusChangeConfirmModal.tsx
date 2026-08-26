"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Power,
  X,
  Loader2,
  Shield,
} from "lucide-react";
import type { AppUser, UserStatus } from "@/types";
import { toast } from "sonner";

interface StatusChangeConfirmModalProps {
  user: AppUser | null;
  targetStatus: UserStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: AppUser) => void;
  performerUid: string;
}

export function StatusChangeConfirmModal({
  user,
  targetStatus,
  isOpen,
  onClose,
  onSuccess,
  performerUid,
}: StatusChangeConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isDestructive =
    targetStatus === "suspended" || targetStatus === "inactive" || targetStatus === "disabled";

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (user.status === "restricted" && targetStatus === "active") {
        // Call unrestrict API
        const res = await fetch("/api/super-admin/users/restriction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UNRESTRICT",
            performerUid,
            targetUid: user.uid,
            reason: reason || "Restriction removed by Super Admin",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to remove restriction");

        const updated = { ...user, status: "active" as const };
        onSuccess(updated);
        toast.success("Restriction removed. Account restored to active.");
      } else {
        // Call status API
        const res = await fetch("/api/super-admin/users/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performerUid,
            targetUid: user.uid,
            status: targetStatus,
            reason: reason || `Status changed to ${targetStatus} by Super Admin`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update user status");

        const updated = { ...user, status: targetStatus };
        onSuccess(updated);
        toast.success(`Account status updated to ${targetStatus}.`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update account status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div
          className={`p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between ${
            isDestructive
              ? "bg-red-50/60 dark:bg-red-950/20"
              : "bg-green-50/60 dark:bg-green-950/20"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDestructive
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              }`}
            >
              {isDestructive ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                Confirm {targetStatus} Status
              </h3>
              <p className="text-xs text-gray-500">
                User: <strong>{user.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-sm">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isDestructive ? (
              <>
                ⚠️ Setting status to <strong className="uppercase text-red-600">{targetStatus}</strong> will immediately prevent the user from logging in and accessing any tenant resources.
              </>
            ) : (
              <>
                Restoring status to <strong className="uppercase text-green-600">{targetStatus}</strong> will re-enable normal login and operational access.
              </>
            )}
          </p>

          <div>
            <label htmlFor="status-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Reason / Administrative Notes
            </label>
            <textarea
              id="status-reason"
              name="reason"
              rows={2}
              placeholder="e.g. Cleared investigation, payment resolved, or misconduct policy..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${
                isDestructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50`}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
              Confirm {targetStatus}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
