"use client";

import React from "react";
import { Zap, Sparkles, Calendar, ShieldCheck, CreditCard, RotateCcw, Clock, Layers } from "lucide-react";
import type { SchoolSubscription, Plan, PlanVersion } from "@/types";

export interface CurrentPlanHeroCardProps {
  subscription: SchoolSubscription | null;
  plan: Plan | null;
  planVersion: PlanVersion | null;
  daysRemaining: number;
  onRenew: () => void;
  onUpgrade: () => void;
  onChangePlan: () => void;
}

export function CurrentPlanHeroCard({
  subscription,
  plan,
  planVersion,
  daysRemaining,
  onRenew,
  onUpgrade,
  onChangePlan,
}: CurrentPlanHeroCardProps) {
  if (!subscription || !plan) return null;

  const isAnnual = subscription.billingCycle === "annual";
  const priceRupees = isAnnual
    ? planVersion?.annualPrice
      ? Math.round(planVersion.annualPrice / 100)
      : 1599
    : planVersion?.monthlyPrice
    ? Math.round(planVersion.monthlyPrice / 100)
    : 1999;

  const startDateFormatted = new Date(subscription.startsAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const expiryDateFormatted = new Date(subscription.expiresAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const isCancelPending = subscription.cancelAtPeriodEnd || subscription.status === "CANCELLED";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Background Subtle Glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Plan Title & Details */}
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
              CURRENT PLAN
            </span>
            {isCancelPending ? (
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                CANCELS AT PERIOD END
              </span>
            ) : subscription.status === "ACTIVE" ? (
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                ACTIVE
              </span>
            ) : (
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                {subscription.status}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {plan.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">₹{priceRupees.toLocaleString("en-IN")}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              / {isAnnual ? "month (billed annually)" : "month"}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Started Date</span>
              <span className="font-bold text-slate-900 dark:text-white">{startDateFormatted}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Renewal / Expiry</span>
              <span className="font-bold text-slate-900 dark:text-white">{expiryDateFormatted}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Days Remaining</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{daysRemaining} Days</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">{subscription.billingCycle}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>ID: {subscription.id}</span>
            <span>Auto-renew: <strong className={subscription.autoRenew ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}>{subscription.autoRenew ? "ON" : "OFF"}</strong></span>
          </div>
        </div>

        {/* Right Column: CTA Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 self-stretch justify-center">
          <button
            onClick={onRenew}
            disabled={subscription.status === "SUSPENDED"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Renew Plan</span>
          </button>
          <button
            onClick={onUpgrade}
            disabled={subscription.status === "SUSPENDED"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upgrade Plan</span>
          </button>
          <button
            onClick={onChangePlan}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            <Layers className="h-4 w-4" />
            <span>Change Plan Options</span>
          </button>
        </div>
      </div>
    </div>
  );
}
