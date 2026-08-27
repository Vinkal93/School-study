"use client";

import React from "react";
import Link from "next/link";
import { Lock, ShieldAlert, ArrowRight, LifeBuoy, CreditCard } from "lucide-react";

interface SubscriptionLockScreenProps {
  title?: string;
  message?: string;
  allowedPages?: { name: string; href: string }[];
}

export function SubscriptionLockScreen({
  title = "Your Subscription Has Expired",
  message = "Recharge your plan to continue using School Study and restore full platform access.",
  allowedPages = [
    { name: "Dashboard", href: "/admin/dashboard" },
    { name: "Pricing Plans", href: "/pricing" },
    { name: "Support", href: "/contact" },
  ],
}: SubscriptionLockScreenProps) {
  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl text-center space-y-6">
        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center border-4 border-red-50 dark:border-red-900/50">
          <Lock className="h-8 w-8 stroke-[2.2]" />
        </div>

        {/* Header & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95"
          >
            <CreditCard className="h-4 w-4" />
            Recharge Now
          </Link>

          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold px-5 py-3 rounded-2xl text-sm transition-all"
          >
            View Plans
          </Link>
        </div>

        {/* Secondary Links / Allowed Features */}
        {allowedPages.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Allowed Restricted Destinations
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {allowedPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-900/60"
                >
                  {page.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
