"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
  X,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSubscriptionReminder, dismissNotificationTrack } from "@/lib/billing";
import type { SubscriptionReminderResult } from "@/types";
import { RechargeModal } from "./RechargeModal";

export function SubscriptionReminderModal() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role || "school_admin";
  const userId = profile?.uid || "";

  const [reminder, setReminder] = useState<SubscriptionReminderResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!schoolId) return;

    getSubscriptionReminder(schoolId, role).then((res) => {
      if (isMounted && res.shouldRemind && res.showPopup) {
        setReminder(res);
        setIsOpen(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [schoolId, role]);

  if (!reminder || !isOpen) return null;

  const isExpired = reminder.severity === "expired" || reminder.daysRemaining <= 0;

  const handleDismiss = () => {
    if (reminder.reminderId) {
      dismissNotificationTrack(schoolId, reminder.reminderId);
    }
    setIsOpen(false);
  };

  const handleOpenRecharge = () => {
    setIsOpen(false);
    setShowRechargeModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center space-y-5">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div
            className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center ${
              isExpired
                ? "bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400"
                : "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isExpired ? <ShieldAlert className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {reminder.title || "Subscription Expiry Notice"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {reminder.message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={handleOpenRecharge}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Recharge Now</span>
            </button>
            <button
              onClick={handleDismiss}
              className="w-full sm:flex-1 inline-flex items-center justify-center py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>

      {schoolId && userId && (
        <RechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          schoolId={schoolId}
          userId={userId}
        />
      )}
    </>
  );
}
