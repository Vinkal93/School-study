"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Cookie,
  Zap,
  ShieldCheck,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
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

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);

    const existing = getStoredConsent();
    if (existing) {
      setPreferences(existing.categories);
    }

    // PHASE 6 REQUIREMENT: Never automatically show an intrusive popup modal on homepage navigation.
    // The panel only opens when manually triggered (e.g. from footer link or on /cookies).
    const handleConsentEvent = (e: any) => {
      setVisible(true);
      setShowCustomize(true);
    };

    window.addEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
    return () => {
      window.removeEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
    };
  }, []);

  // If on the dedicated /cookies page, the cookie policy and settings are handled directly in page content
  if (!mounted || !visible || pathname === "/cookies" || pathname === "/cookie-policy") return null;

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
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Cookie & Privacy Preferences
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> User Privacy
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                SchoolStudy uses essential authentication cookies for session security, along with high-speed local caching to ensure fast dashboards.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customization Details Dropdown */}
        {showCustomize && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
            {/* Essential Category */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Essential Authentication & Security</span>
                  <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                    Always Required
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Required for sign in, multi-tenant isolation, CSRF protection, and audit safety.
                </p>
              </div>
              <div className="text-xs font-bold text-muted-foreground">Active</div>
            </div>

            {/* Performance Category */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <div className="flex-1 pr-3">
                <span className="text-xs font-bold text-foreground">High-Speed Query Cache</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  IndexedDB instant page paint and zero-latency dashboard switching.
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
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Analytics Category */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <div className="flex-1 pr-3">
                <span className="text-xs font-bold text-foreground">Anonymous Telemetry</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Anonymized performance monitoring to detect slow mobile networks.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    analytics: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setShowCustomize(!showCustomize)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showCustomize ? "Hide Details" : "Customize"}</span>
            {showCustomize ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="text-xs font-medium px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              Essential Only
            </button>
            {showCustomize ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-foreground text-background hover:opacity-90 transition cursor-pointer"
              >
                Save Preferences
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAcceptAll}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition cursor-pointer"
              >
                Accept All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default CookieConsentBanner;
