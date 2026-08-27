"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AttentionHeaderProps {
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}

export function AttentionHeader({ showViewAll = true, onViewAllClick }: AttentionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
        What needs your attention?
      </h2>
      {showViewAll && (
        onViewAllClick ? (
          <button
            type="button"
            onClick={onViewAllClick}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 active:scale-95 transition-all shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Link
            href="/student/notices"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 active:scale-95 transition-all shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )
      )}
    </div>
  );
}
