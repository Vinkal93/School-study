"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Bell,
  Download,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export function PlayStoreComingSoonContent() {
  const [notified, setNotified] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setNotified(true);
    toast.success("Thank you! We will notify you the moment our Google Play listing goes live.");
  };

  return (
    <div className="w-full py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Back Link */}
        <Link
          href="/download"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Downloads</span>
        </Link>

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-lg text-center space-y-6 dark:border-slate-800">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner relative">
              <Play className="h-10 w-10 fill-current" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Play Review in Progress • Coming Soon</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Google Play Store Listing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We are currently undergoing standard Google Play Store verification and policy onboarding. The native Play Store release will be available for direct installation shortly.
            </p>
          </div>

          {/* Alternative Instant Download Options */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5 text-left space-y-3 max-w-lg mx-auto">
            <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Available Right Now on Android:</span>
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>1. Instant 0 MB Progressive Web App (PWA)</span>
                <Link
                  href="/download"
                  className="font-bold text-blue-600 hover:underline shrink-0"
                >
                  Install PWA →
                </Link>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>2. Direct Android APK package (~12 MB)</span>
                <a
                  href="/SchoolStudy.apk"
                  download="SchoolStudy.apk"
                  className="font-bold text-emerald-600 hover:underline shrink-0"
                >
                  Get APK →
                </a>
              </div>
            </div>
          </div>

          {/* Email Notification Subscription Form */}
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-3 pt-2">
            <label htmlFor="play-store-notify-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Get notified the moment our Google Play app goes live
            </label>
            <div className="flex gap-2">
              <input
                id="play-store-notify-email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={notified}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={notified}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:bg-emerald-600 transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>{notified ? "Subscribed!" : "Notify Me"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
