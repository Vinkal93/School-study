"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Wallet, ChevronRight } from "lucide-react";
import { FeesOverviewData } from "./types";

interface FeesCardProps {
  data?: FeesOverviewData;
  onClick?: () => void;
}

export function FeesCard({ data, onClick }: FeesCardProps) {
  const status = data?.status || "pending";
  const dueAmount = data?.dueAmount ?? 1500;
  const dueMonth = data?.dueMonth || "August";

  // Indian currency formatting (e.g. ₹1,500, ₹10,000, ₹1,25,000)
  const formattedAmount = useMemo(() => {
    return `₹${dueAmount.toLocaleString("en-IN")}`;
  }, [dueAmount]);

  const displayState = useMemo(() => {
    if (status === "fully_paid" || status === "no_dues" || dueAmount <= 0) {
      return {
        metric: "All Paid",
        subtitle: "No dues pending",
        isPositive: true,
      };
    }
    if (status === "partially_paid") {
      return {
        metric: formattedAmount,
        subtitle: "Remaining balance",
        isPositive: false,
      };
    }
    return {
      metric: formattedAmount,
      subtitle: `Due for ${dueMonth}`,
      isPositive: false,
    };
  }, [status, dueAmount, dueMonth, formattedAmount]);

  const cardContent = (
    <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group relative overflow-hidden">
      {/* Icon, Title & Action Chevron */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <Wallet className="h-5 w-5 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
            Fees Due
          </span>
        </div>
        <div className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 group-hover:translate-x-0.5 transition-transform shrink-0">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric & Subtitle */}
      <div>
        <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${displayState.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {displayState.metric}
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
          {displayState.subtitle}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-2xl active:scale-[0.98] transition-transform"
        aria-label={`Fees Due metric: ${displayState.metric}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href="/student/fees"
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-2xl active:scale-[0.98] transition-transform"
      aria-label={`Fees Due metric: ${displayState.metric}. Click to view fees details.`}
    >
      {cardContent}
    </Link>
  );
}
