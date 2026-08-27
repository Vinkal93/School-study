"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, ArrowRight } from "lucide-react";
import { SubscriptionReminderResult } from "@/types";

interface SubscriptionBannerProps {
  reminder: SubscriptionReminderResult | null;
  onRecharge?: () => void;
}

export function SubscriptionBanner({ reminder, onRecharge }: SubscriptionBannerProps) {
  if (!reminder || !reminder.shouldRemind || !reminder.showBanner) {
    return null;
  }

  const isUrgent = reminder.severity === "urgent" || reminder.severity === "critical" || reminder.severity === "expired";

  const handleRechargeClick = () => {
    if (onRecharge) onRecharge();
  };

  return (
    <div
      role="region"
      aria-label="Subscription Expiry Banner"
      className={`w-full py-2 px-4 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-sm ${
        isUrgent
          ? "bg-red-600 text-white dark:bg-red-950 dark:text-red-200 dark:border-b dark:border-red-800"
          : "bg-amber-500 text-slate-950 dark:bg-amber-950 dark:text-amber-200 dark:border-b dark:border-amber-800"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <BellRing className="h-4 w-4 shrink-0 stroke-[2.2]" />
        <span className="truncate">{reminder.message}</span>
      </div>

      {reminder.showRechargeButton && (
        <Link
          href="/pricing"
          onClick={handleRechargeClick}
          className="inline-flex items-center gap-1 bg-white text-slate-900 font-extrabold px-3 py-1 rounded-lg text-xs hover:bg-slate-100 transition-colors shrink-0"
        >
          Recharge Now
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
