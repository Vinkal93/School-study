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
      <div className={`w-full px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold transition-all ${bannerBg}`}>
        <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 justify-center text-center">
          {isExpired ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>
            {reminder.title ? `${reminder.title}: ` : ""}
            {reminder.message}
          </span>

          {reminder.canRecharge && (
            <button
              onClick={() => setShowRechargeModal(true)}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-900 font-bold text-xs shadow-xs hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Zap className="h-3 w-3 text-amber-500 fill-current" />
              <span>Recharge Now</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer shrink-0"
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
