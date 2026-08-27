"use client";

import React, { useMemo } from "react";
import { AttentionHeader } from "./AttentionHeader";
import { AttentionItemCard } from "./AttentionItemCard";
import { AttentionSkeleton } from "./AttentionSkeleton";
import { AttentionCenterProps, AttentionItem, AttentionPriority } from "./types";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const priorityWeight: Record<AttentionPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export function AttentionCenter({
  items,
  maxItems = 3,
  loading = false,
  error = null,
  onRetry,
  onViewAllClick,
  onItemAction,
}: AttentionCenterProps) {
  // 1. Loading Skeleton State (Section 25)
  if (loading) {
    return <AttentionSkeleton />;
  }

  // 2. Error Fallback State (Section 26)
  if (error) {
    return (
      <div className="w-full space-y-2.5">
        <AttentionHeader showViewAll={false} />
        <div className="w-full p-4 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error || "Unable to load updates."}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 active:scale-95 transition-all text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Priority sorting logic (Section 10)
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  }, [items]);

  const visibleItems = useMemo(() => {
    return sortedItems.slice(0, maxItems);
  }, [sortedItems, maxItems]);

  const hasMore = sortedItems.length > maxItems;

  return (
    <section className="w-full space-y-2.5" aria-label="What needs your attention">
      <AttentionHeader
        showViewAll={visibleItems.length > 0 && (hasMore || !!onViewAllClick)}
        onViewAllClick={onViewAllClick}
      />

      {visibleItems.length > 0 ? (
        <div className="space-y-2.5">
          {visibleItems.map((item) => (
            <AttentionItemCard key={item.id} item={item} onAction={onItemAction} />
          ))}
          {hasMore && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onViewAllClick}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                + {sortedItems.length - maxItems} more item{sortedItems.length - maxItems > 1 ? "s" : ""} → View All
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Positive All Caught Up Empty State (Section 12 & 27) */
        <div className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-extrabold tracking-tight">
              You&apos;re all caught up 🎉
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              No pending tasks or alerts.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
