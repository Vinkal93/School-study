"use client";

import React from "react";
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, AlertCircle } from "lucide-react";
import type { SchoolSubscription } from "@/types";

export interface SubscriptionAlertBannerProps {
  subscription: SchoolSubscription | null;
  daysRemaining: number;
  onRenew: () => void;
  onUpgrade: () => void;
}

export function SubscriptionAlertBanner({
  subscription,
  daysRemaining,
  onRenew,
  onUpgrade,
}: SubscriptionAlertBannerProps) {
  if (!subscription) return null;

  const status = subscription?.status;

  if (status === "HALTED" || (subscription as any)?.lastPaymentStatus === "FAILED") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/15 dark:bg-amber-950/80 border border-amber-400/80 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 shadow-md">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-amber-950 dark:text-amber-100 tracking-tight">
              Your recurring payment could not be completed.
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 font-medium">
              {(subscription as any).lastPaymentErrorReason || "Razorpay recurring mandate debit attempt was declined."} Your entitlement remains active during the grace period.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
          <button
            onClick={onRenew}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Retry / Resolve Payment
          </button>
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-xs rounded-xl cursor-pointer"
          >
            Update Payment Method
          </button>
        </div>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Subscription Suspended</h4>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              Your subscription has been suspended by platform administration. Please contact support to resolve billing issues.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "EXPIRED") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Your subscription has expired</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Access to protected features has been restricted. Renew now to restore full operational capabilities.
            </p>
          </div>
        </div>
        <button
          onClick={onRenew}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow shrink-0 self-start sm:self-center cursor-pointer"
        >
          Renew Subscription Now
        </button>
      </div>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Critical Warning: Your subscription expires in {daysRemaining} days</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Renew immediately to avoid service interruption or transition into grace period mode.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={onRenew}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Renew Now
          </button>
        </div>
      </div>
    );
  }

  if (daysRemaining <= 30) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Your plan expires soon</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Your Professional Plan expires in {daysRemaining} days ({new Date(subscription?.expiresAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={onRenew}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Renew Now
          </button>
          <button
            onClick={onUpgrade}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 font-bold text-xs rounded-xl cursor-pointer"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Your subscription is active and operating normally. No immediate action required. ({daysRemaining} days remaining)</span>
      </div>
    </div>
  );
}
