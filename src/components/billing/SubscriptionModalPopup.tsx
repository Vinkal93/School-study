"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight, X } from "lucide-react";
import { SubscriptionReminderResult } from "@/types";
import { dismissNotificationTrack } from "@/lib/billing";

interface SubscriptionModalPopupProps {
  schoolId: string;
  reminder: SubscriptionReminderResult | null;
  onRecharge?: () => void;
  onDismiss?: () => void;
}

export function SubscriptionModalPopup({
  schoolId,
  reminder,
  onRecharge,
  onDismiss,
}: SubscriptionModalPopupProps) {
  const [open, setOpen] = useState(true);

  if (!reminder || !reminder.shouldRemind || !reminder.showPopup || !open) {
    return null;
  }

  const isUrgent = reminder.severity === "urgent" || reminder.severity === "critical" || reminder.severity === "expired";

  const handleDismiss = async () => {
    setOpen(false);
    if (reminder.reminderId) {
      await dismissNotificationTrack(schoolId, reminder.reminderId);
    }
    if (onDismiss) onDismiss();
  };

  const handleRechargeClick = () => {
    if (onRecharge) onRecharge();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isUrgent ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"}`}>
              <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="subscription-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                {reminder.title || "Subscription Warning"}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {reminder.daysRemaining > 0 ? `${reminder.daysRemaining} Days Remaining` : "Subscription Expired"}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
          {reminder.message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {reminder.showRechargeButton && (
            <Link
              href="/pricing"
              onClick={handleRechargeClick}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-colors shadow-sm"
            >
              Recharge Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <button
            onClick={handleDismiss}
            className="w-full sm:flex-1 inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
