"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  SubscriptionReminderBanner,
  SubscriptionReminderModal,
} from "@/components/billing";
import { useAuth } from "@/hooks/use-auth";

/**
 * CLASSIC DASHBOARD SHELL
 * 
 * Preserves 100% of the stable production layout:
 * - Desktop collapsible sidebar
 * - Fixed topbar
 * - Scrollable main content area
 * - Mobile bottom drawer nav
 * - Subscription alerts
 */
export function ClassicDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const isSchoolAdmin = profile?.role === "school_admin";

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar />
        {isSchoolAdmin && (
          <>
            <SubscriptionReminderBanner />
            <SubscriptionReminderModal />
          </>
        )}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 md:pb-6 focus:outline-none">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
