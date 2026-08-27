"use client";

import React, { useMemo } from "react";
import { Bell } from "lucide-react";

interface NotificationButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationButton({ unreadCount, onClick }: NotificationButtonProps) {
  // Format badge number: 0 -> no badge, 1..9 -> number, 10+ -> "9+"
  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    if (unreadCount >= 10) return "9+";
    return String(unreadCount);
  }, [unreadCount]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View notifications${badgeLabel ? ` (${badgeLabel} unread)` : ""}`}
      className="relative w-11 h-11 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
    >
      <Bell className="h-5 w-5 stroke-[2]" />
      {badgeLabel && (
        <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-950">
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
