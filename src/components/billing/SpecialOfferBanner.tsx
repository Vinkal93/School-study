"use client";

import React from "react";
import { Sparkles, Clock, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import type { CustomOfferRecord } from "@/types/reports";

export interface SpecialOfferBannerProps {
  offer: CustomOfferRecord | null;
  onViewOffer: () => void;
}

export function SpecialOfferBanner({ offer, onViewOffer }: SpecialOfferBannerProps) {
  if (!offer || offer.status !== "ACTIVE") return null;

  const validUntilMs = new Date(offer.validUntil || offer.expiresAt).getTime();
  if (validUntilMs <= Date.now()) return null;

  const daysLeft = Math.max(1, Math.ceil((validUntilMs - Date.now()) / (1000 * 60 * 60 * 24)));
  const offerPriceRupees = Math.round(offer.customPricePaise / 100);
  const regularPriceRupees = Math.round(offer.originalPricePaise / 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 p-6 sm:p-7 shadow-lg shadow-amber-500/5 dark:bg-slate-900">
      {/* Glow Background */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Column: Offer Details */}
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500 text-slate-950 shadow-sm">
              <Sparkles className="h-3 w-3 fill-slate-950" />
              SPECIAL OFFER FOR YOUR SCHOOL
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
              {offer.discountPercentage || 99.99}% OFF
            </span>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{offer.planName || "Enterprise Plan"}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Exclusive promotional invitation for {offer.schoolName}. Upgrade your operational capacity now.
            </p>
          </div>

          {/* Large Price Badge */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              ₹{offerPriceRupees.toLocaleString("en-IN")}
            </span>
            <span className="text-sm font-bold text-slate-400 line-through">
              ₹{regularPriceRupees.toLocaleString("en-IN")} / month
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-semibold">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Offer expires in <strong className="font-extrabold">{daysLeft} days</strong> ({new Date(offer.validUntil || offer.expiresAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}).
            </span>
          </div>
        </div>

        {/* Right Column: View Offer Action */}
        <div className="shrink-0 self-start md:self-center">
          <button
            onClick={onViewOffer}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <span>View Special Offer</span>
            <ArrowRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
