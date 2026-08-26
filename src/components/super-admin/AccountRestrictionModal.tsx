"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Calendar,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { AppUser } from "@/types";
import { toast } from "sonner";

interface AccountRestrictionModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onRestricted: (updatedUser: AppUser) => void;
  performerUid: string;
}

export function AccountRestrictionModal({
  user,
  isOpen,
  onClose,
  onRestricted,
  performerUid,
}: AccountRestrictionModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"permanent" | "temporary">("permanent");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a restriction reason.");
      return;
    }

    if (duration === "temporary" && !expiresAt) {
      toast.error("Please select an expiry date for temporary restriction.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/users/restriction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTRICT",
          performerUid,
          targetUid: user.uid,
          reason,
          duration,
          expiresAt: duration === "temporary" ? expiresAt : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restrict user account");

      const updated = { ...user, status: "restricted" as const };
      onRestricted(updated);
      toast.success(`Account restricted: "${reason}"`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to restrict user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Restrict User Account
              </h3>
              <p className="text-xs text-gray-500">
                Target: <strong>{user.name}</strong> ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-6 pt-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Restricting this user maintains their records but limits platform operations according to security policy.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label htmlFor="restriction-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Restriction Reason *
            </label>
            <textarea
              id="restriction-reason"
              name="reason"
              rows={3}
              required
              placeholder="e.g. Under investigation for honor code violation, pending verification..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Duration
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDuration("permanent")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors ${
                  duration === "permanent"
                    ? "border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-bold"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                }`}
              >
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setDuration("temporary")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors ${
                  duration === "temporary"
                    ? "border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-bold"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                }`}
              >
                Until Date
              </button>
            </div>
          </div>

          {duration === "temporary" && (
            <div>
              <label htmlFor="restriction-expiry" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Restriction Expiry Date *
              </label>
              <input
                id="restriction-expiry"
                name="expiryDate"
                type="date"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              Confirm Restriction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
