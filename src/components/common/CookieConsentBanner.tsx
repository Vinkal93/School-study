"use client";

import React, { useState, useEffect } from "react";
import {
  Cookie,
  Zap,
  ShieldCheck,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  getStoredConsent,
  saveConsent,
  CONSENT_EVENT_NAME,
  DEFAULT_PREFERENCES,
  type CookieConsentPreferences,
} from "@/lib/cookies/cookie-consent";

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<CookieConsentPreferences>({
    ...DEFAULT_PREFERENCES,
  });

  useEffect(() => {
    setMounted(true);

    // Check if consent has already been given
    const existing = getStoredConsent();
    if (!existing || !existing.consented) {
      // Delay entrance slightly to avoid competing with initial page paint (LCP)
      const timer = setTimeout(() => {
        setVisible(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setPreferences(existing.categories);
    }

    // Listen for manual trigger to reopen settings (e.g. from footer link)
    const handleConsentEvent = (e: any) => {
      if (e.detail && !e.detail.consented) {
        setVisible(true);
      }
    };

    window.addEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
    return () => {
      window.removeEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
    };
  }, []);

  if (!mounted || !visible) return null;

  const handleAcceptAll = () => {
    saveConsent(DEFAULT_PREFERENCES);
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    saveConsent({
      essential: true,
      performance: false,
      analytics: false,
      preferences: false,
    });
    setVisible(false);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie and Performance Preferences"
      className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] rounded-2xl p-5 sm:p-6 text-foreground">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">
                High-Speed Experience & Cookies
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Sparkles className="w-3 h-3" /> Ultra Fast
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We use essential cookies and high-speed local data caching (IndexedDB) so school dashboards, student profiles, and fee receipts load{" "}
              <strong className="text-foreground font-semibold">instantly at light speed with zero flicker</strong>.
            </p>
          </div>
        </div>

        {/* Customization Accordion */}
        {showCustomize && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
            {/* Essential */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-muted/40">
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Essential & Secure Auth
                </div>
                <p className="text-muted-foreground mt-0.5">
                  Maintains your active session, multi-school isolation, and CSRF protection.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                Required
              </span>
            </div>

            {/* Performance Cache */}
            <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition cursor-pointer">
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Zero-Flicker Local Caching
                </div>
                <p className="text-muted-foreground mt-0.5">
                  Caches students, classes, and accounts locally so pages open in 0ms without waiting.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.performance}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    performance: e.target.checked,
                  }))
                }
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Personalization */}
            <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition cursor-pointer">
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Cookie className="w-3.5 h-3.5 text-blue-500" />
                  UI Preferences & Theme
                </div>
                <p className="text-muted-foreground mt-0.5">
                  Remembers your dark/light theme, language, and sidebar preferences.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    preferences: e.target.checked,
                  }))
                }
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setShowCustomize((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showCustomize ? "Hide options" : "Customize"}
            {showCustomize ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {showCustomize ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
              >
                Save Preferences
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                Essential Only
              </button>
            )}

            <button
              type="button"
              onClick={handleAcceptAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Accept All & Boost Speed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
