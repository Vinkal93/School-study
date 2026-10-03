"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";
import type { FeatureShowcase } from "@/types/ai";

export function FeatureShowcaseBanner() {
  const [showcase, setShowcase] = useState<FeatureShowcase | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/feature-showcase/active?context=landing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.activeShowcase) {
          setShowcase(data.activeShowcase);
        }
      })
      .catch(() => {});
  }, []);

  if (!showcase || dismissed) return null;

  return (
    <div className="relative isolate flex items-center justify-between gap-x-6 overflow-hidden bg-linear-to-r from-indigo-900 via-purple-900 to-indigo-950 px-4 py-2.5 sm:px-6 sm:py-3 text-white text-xs sm:text-sm shadow-md">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mx-auto text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-indigo-200 border border-white/20">
          <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
          {showcase.badgeText || "NEW"}
        </span>

        <p className="font-medium text-white/90">
          <strong className="font-semibold text-white">{showcase.title}:</strong>{" "}
          <span className="hidden sm:inline">{showcase.description}</span>
        </p>

        <Link
          href={showcase.ctaUrl || "/login"}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-900 shadow-xs hover:bg-white/90 transition ml-2"
        >
          {showcase.ctaText || "Explore"} <ArrowRight className="h-3 w-3 inline" />
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition"
        title="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
