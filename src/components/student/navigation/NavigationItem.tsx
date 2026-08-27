"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Users,
  Wallet,
  LayoutGrid,
  LucideIcon,
} from "lucide-react";
import { StudentNavItem } from "@/lib/config/student-navigation";

const navIconMap: Record<string, LucideIcon> = {
  home: Home,
  study: BookOpen,
  attendance: Users,
  fees: Wallet,
  more: LayoutGrid,
};

interface NavigationItemProps {
  item: StudentNavItem;
  unreadCount?: number;
}

export function NavigationItem({ item, unreadCount = 0 }: NavigationItemProps) {
  const pathname = usePathname();

  // Route-driven active state calculation (Section 5)
  const isActive = useMemo(() => {
    if (!pathname) return false;
    if (item.route === "/student" || item.route === "/student/dashboard") {
      return (
        pathname === "/student" ||
        pathname === "/student/dashboard" ||
        pathname === "/student/"
      );
    }
    return pathname.startsWith(item.route);
  }, [pathname, item.route]);

  const IconComponent = navIconMap[item.icon] || LayoutGrid;

  // Unread notification badge for "More" item (Section 21)
  const badgeLabel = useMemo(() => {
    if (item.id !== "more" || !unreadCount || unreadCount <= 0) return null;
    if (unreadCount >= 10) return "9+";
    return String(unreadCount);
  }, [item.id, unreadCount]);

  return (
    <Link
      href={item.route}
      aria-label={`${item.label}${isActive ? ", selected" : ""}`}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex-1 min-w-[56px] py-1 sm:py-1.5 rounded-full flex flex-col items-center justify-center transition-all duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isActive
          ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/60"
          : "text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-slate-200"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <IconComponent
          className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`}
        />
        {badgeLabel && (
          <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 border border-white dark:border-slate-900">
            {badgeLabel}
          </span>
        )}
      </div>
      <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate max-w-full px-1">
        {item.label}
      </span>
    </Link>
  );
}
