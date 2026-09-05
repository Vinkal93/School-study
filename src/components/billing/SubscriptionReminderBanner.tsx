"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, AlertCircle, Sparkles, X, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSubscriptionReminder } from "@/lib/billing";
import type { SubscriptionReminderResult } from "@/types";
import { RechargeModal } from "./RechargeModal";

export function SubscriptionReminderBanner() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role || "school_admin";
  const userId = profile?.uid || "";

  const [reminder, setReminder] = useState<SubscriptionReminderResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!schoolId) return;

    getSubscriptionReminder(schoolId, role).then((res) => {
      if (isMounted && res.shouldRemind && res.showBanner) {
        setReminder(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [schoolId, role]);

  if (!reminder || dismissed || !reminder.shouldRemind) return null;

  const isExpired = reminder.severity === "expired" || reminder.daysRemaining <= 0;
  const isUrgent = reminder.severity === "critical" || reminder.severity === "urgent";

  const bannerBg = isExpired
    ? "bg-red-600 text-white"
    : isUrgent
    ? "bg-amber-600 text-white"
    : "bg-blue-600 text-white";

  return (
    <>
      <div className={`relative w-full px-3 sm:px-4 py-2.5 sm:py-2 shadow-md text-xs sm:text-sm font-semibold transition-all ${bannerBg}`}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 pr-7 sm:pr-8">
          <div className="flex items-start sm:items-center gap-2 text-left sm:text-center flex-1 min-w-0">
            {isExpired ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span className="break-words leading-relaxed">
              <strong className="font-bold">{reminder.title ? `${reminder.title}: ` : ""}</strong>
              {reminder.message}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pl-6 sm:pl-0">
            {reminder.canRecharge && (
              <button
                type="button"
                onClick={() => setShowRechargeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-900 font-bold text-xs shadow-xs hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              >
                <Zap className="h-3 w-3 text-amber-500 fill-current" />
                <span>Recharge Now</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 sm:top-1/2 sm:-translate-y-1/2 p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
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
