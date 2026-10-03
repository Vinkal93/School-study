"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X, CheckCircle2 } from "lucide-react";
import type { FeatureShowcase } from "@/types/ai";

export function FeatureShowcaseModal() {
  const [showcase, setShowcase] = useState<FeatureShowcase | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Suppress popups inside embedded iframes (e.g. AI phone preview)
    if (typeof window !== "undefined" && window.self !== window.top) {
      return;
    }

    fetch("/api/feature-showcase/active?context=dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const item: FeatureShowcase | undefined = data?.activeShowcase;
        if (!item) return;

        // 1. Check if disabled or paused
        if (item.enabled === false || item.status === "PAUSED" || item.status === "ARCHIVED") {
          return;
        }

        // 2. Check local dismissal state
        const dismissKey = `feature_showcase_dismissed_${item.id}_${item.version || "1.0"}`;
        if (typeof window !== "undefined" && localStorage.getItem(dismissKey) === "true") {
          return;
        }

        // 3. Check impression count against maxImpressions / frequency
        const impressionKey = `feature_showcase_impressions_${item.id}_${item.version || "1.0"}`;
        const currentImpressions = typeof window !== "undefined"
          ? parseInt(localStorage.getItem(impressionKey) || "0", 10)
          : 0;

        const maxAllowed = item.maxImpressions ?? (item.frequency === "ONCE" ? 1 : 3);
        if (currentImpressions >= maxAllowed) {
          return;
        }

        // Show modal and increment impression count
        setShowcase(item);
        setIsOpen(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(impressionKey, String(currentImpressions + 1));
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = async () => {
    if (!showcase) return;
    setIsOpen(false);
    if (typeof window !== "undefined") {
      const dismissKey = `feature_showcase_dismissed_${showcase.id}_${showcase.version || "1.0"}`;
      localStorage.setItem(dismissKey, "true");
    }
    try {
      await fetch("/api/feature-showcase/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showcaseId: showcase.id,
          featureKey: showcase.featureKey,
          version: showcase.version,
          action: "dismiss",
        }),
      });
    } catch (e) {}
  };

  const handleClickCta = async () => {
    if (!showcase) return;
    setIsOpen(false);
    if (typeof window !== "undefined") {
      const dismissKey = `feature_showcase_dismissed_${showcase.id}_${showcase.version || "1.0"}`;
      localStorage.setItem(dismissKey, "true");
    }
    try {
      await fetch("/api/feature-showcase/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showcaseId: showcase.id,
          featureKey: showcase.featureKey,
          version: showcase.version,
          action: "click",
        }),
      });
    } catch (e) {}
  };

  if (!showcase || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={handleDismiss}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative p-6 sm:p-8 bg-linear-to-b from-indigo-50/70 to-white dark:from-indigo-950/30 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={handleDismiss}
            className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/80 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
            {showcase.badgeText || "FEATURE SPOTLIGHT"}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {showcase.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
            {showcase.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Context-aware attendance analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Real-time fee dues & defaulters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Role-scoped authorized queries</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Available now in your sidebar</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-end gap-3">
          <button
            onClick={handleDismiss}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition"
          >
            {showcase.secondaryCtaText || "Maybe Later"}
          </button>

          <Link
            href={showcase.ctaUrl || "/admin/ai"}
            onClick={handleClickCta}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            {showcase.ctaText || "Try AI Mode"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
