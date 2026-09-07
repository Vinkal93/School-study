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
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md sm:max-w-xl pointer-events-auto mb-[env(safe-area-inset-bottom,0px)]">
      <nav
        aria-label="Student Mobile Navigation"
        className="w-full bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.05)] px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-around gap-1.5 transition-all"
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
