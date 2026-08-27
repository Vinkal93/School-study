"use client";

import React, { useMemo } from "react";
import { NavigationItem } from "./NavigationItem";
import { MobileBottomNavigationProps } from "./types";
import { STUDENT_BOTTOM_NAV_ITEMS } from "@/lib/config/student-navigation";

export function MobileBottomNavigation({
  navItems = STUDENT_BOTTOM_NAV_ITEMS,
  tenantEnabledModules,
  unreadNotificationCount = 3,
}: MobileBottomNavigationProps) {
  // Filter nav items based on tenant configuration (Section 14 & 26)
  const filteredNavItems = useMemo(() => {
    if (!tenantEnabledModules || tenantEnabledModules.length === 0) {
      return navItems;
    }
    return navItems.filter((item) => {
      if (!item.moduleKey || item.id === "home" || item.id === "more") return true;
      return tenantEnabledModules.includes(item.moduleKey);
    });
  }, [navItems, tenantEnabledModules]);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md sm:max-w-xl md:max-w-2xl pointer-events-auto">
      <nav
        aria-label="Student Mobile Navigation"
        className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full shadow-lg p-1.5 sm:p-2 flex items-center justify-around gap-1 pb-safe"
      >
        {filteredNavItems.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            unreadCount={unreadNotificationCount}
          />
        ))}
      </nav>
    </div>
  );
}
