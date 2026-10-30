"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cookie,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Lock,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  getStoredConsent,
  saveConsent,
  DEFAULT_PREFERENCES,
  type CookieConsentPreferences,
} from "@/lib/cookies/cookie-consent";
import { toast } from "sonner";

export default function CookiePolicyPage() {
  const [preferences, setPreferences] = useState<CookieConsentPreferences>({
    ...DEFAULT_PREFERENCES,
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (existing) {
      setPreferences(existing.categories);
    }
  }, []);

  const handleSave = () => {
    saveConsent(preferences);
    setIsSaved(true);
    toast.success("Cookie preferences saved successfully.");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAcceptAll = () => {
    saveConsent(DEFAULT_PREFERENCES);
    setPreferences(DEFAULT_PREFERENCES);
    setIsSaved(true);
    toast.success("All cookies and performance optimizations enabled.");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleEssentialOnly = () => {
    const minimal: CookieConsentPreferences = {
      essential: true,
      performance: false,
      analytics: false,
      preferences: false,
    };
    saveConsent(minimal);
    setPreferences(minimal);
    setIsSaved(true);
    toast.info("Restricted to essential authentication cookies only.");
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Homepage</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cookie className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Cookie & Privacy Policy</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Last updated: October 2026 • Compliant with DPDP Act & Global Privacy Standards
              </p>
            </div>
          </div>
        </div>

        {/* Informative Overview */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>How SchoolStudy Uses Cookies</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            SchoolStudy uses cookies and client-side storage technologies to deliver secure authentication, maintain active school sessions, and accelerate page loads. We do not sell your personal data or use third-party advertising trackers.
          </p>
        </div>

        {/* Interactive Preferences Panel */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold">Your Privacy Controls</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure your storage and telemetry preferences below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                Accept All
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Essential */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold">Strictly Essential Cookies</span>
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Required for user authentication, encrypted session management, CSRF protection, and multi-tenant school access. These cannot be disabled.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Always Active</span>
            </div>

            {/* Performance */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold">High-Speed Local Caching</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Uses browser IndexedDB and memory caches to store class rosters and timetables locally for instant, zero-latency dashboard navigation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.performance}
                onChange={(e) => setPreferences((p) => ({ ...p, performance: e.target.checked }))}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Preferences */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-bold">UI Personalization</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Remembers your preferred theme (Light/Dark mode), dashboard layout view (Classic vs Modern), and table column widths.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) => setPreferences((p) => ({ ...p, preferences: e.target.checked }))}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 shadow-sm transition"
            >
              {isSaved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <RefreshCw className="h-4 w-4" />}
              <span>{isSaved ? "Preferences Saved" : "Save Selected Preferences"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
