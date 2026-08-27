"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Wallet,
  ClipboardList,
  GraduationCap,
  BellRing,
  Clock,
  Library as LibraryIcon,
  LayoutGrid,
  LucideIcon,
} from "lucide-react";
import { QuickActionItem } from "./types";

const iconMap: Record<string, { icon: LucideIcon; colorClass: string; bgClass: string }> = {
  attendance: {
    icon: Users,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/50",
  },
  fees: {
    icon: Wallet,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/60 border-red-100 dark:border-red-900/50",
  },
  homework: {
    icon: ClipboardList,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/50",
  },
  exams: {
    icon: GraduationCap,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/50",
  },
  notices: {
    icon: BellRing,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-900/50",
  },
  timetable: {
    icon: Clock,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900/50",
  },
  library: {
    icon: LibraryIcon,
    colorClass: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-100 dark:border-cyan-900/50",
  },
  more: {
    icon: LayoutGrid,
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  },
};

interface QuickActionCardProps {
  action: QuickActionItem;
  onClick?: (action: QuickActionItem) => void;
}

export function QuickActionCard({ action, onClick }: QuickActionCardProps) {
  const iconConfig = iconMap[action.icon] || iconMap.more;
  const IconComponent = iconConfig.icon;

  const cardContent = (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col items-center justify-center gap-2 group text-center aspect-[1/1] sm:aspect-auto sm:h-24">
      {/* Icon Container */}
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${iconConfig.bgClass} ${iconConfig.colorClass}`}>
        <IconComponent className="h-5 w-5 stroke-[2]" />
      </div>

      {/* Label */}
      <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-tight truncate w-full px-0.5">
        {action.label}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(action)}
        className="w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl active:scale-[0.96] transition-transform"
        aria-label={`Action: ${action.label}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={action.route}
      className="block w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl active:scale-[0.96] transition-transform"
      aria-label={`Action: ${action.label}`}
    >
      {cardContent}
    </Link>
  );
}
