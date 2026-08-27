"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Wallet, ClipboardList, Calendar, BellRing, AlertCircle, ArrowRight } from "lucide-react";
import { AttentionItem } from "./types";

interface AttentionItemCardProps {
  item: AttentionItem;
  onAction?: (item: AttentionItem) => void;
}

export function AttentionItemCard({ item, onAction }: AttentionItemCardProps) {
  const visualConfig = useMemo(() => {
    switch (item.type) {
      case "fee":
        return {
          icon: Wallet,
          iconBg: "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50",
          btnBg: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
          border: "border-red-100 dark:border-red-900/40 hover:border-red-200 dark:hover:border-red-800",
        };
      case "homework":
        return {
          icon: ClipboardList,
          iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
          btnBg: "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500",
          border: "border-amber-100 dark:border-amber-900/40 hover:border-amber-200 dark:hover:border-amber-800",
        };
      case "exam":
        return {
          icon: Calendar,
          iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50",
          btnBg: "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500",
          border: "border-blue-100 dark:border-blue-900/40 hover:border-blue-200 dark:hover:border-blue-800",
        };
      case "notice":
      default:
        return {
          icon: BellRing,
          iconBg: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50",
          btnBg: "bg-purple-600 hover:bg-purple-700 text-white focus-visible:ring-purple-500",
          border: "border-purple-100 dark:border-purple-900/40 hover:border-purple-200 dark:hover:border-purple-800",
        };
    }
  }, [item.type]);

  const IconComponent = visualConfig.icon;

  const handleButtonClick = (e: React.MouseEvent) => {
    if (onAction) {
      e.preventDefault();
      onAction(item);
    }
  };

  return (
    <div
      className={`w-full bg-white dark:bg-slate-900 border ${visualConfig.border} rounded-xl p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 group`}
    >
      {/* LEFT: Icon Container & Title/Description */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${visualConfig.iconBg}`}
        >
          <IconComponent className="h-5 w-5 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {item.title}
          </h3>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {/* RIGHT: Action Button */}
      {onAction ? (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0 outline-none focus-visible:ring-2 flex items-center gap-1 ${visualConfig.btnBg}`}
        >
          <span>{item.actionLabel}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <Link
          href={item.actionUrl}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0 outline-none focus-visible:ring-2 flex items-center gap-1 ${visualConfig.btnBg}`}
        >
          <span>{item.actionLabel}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
