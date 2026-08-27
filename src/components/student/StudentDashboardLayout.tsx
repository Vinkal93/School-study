"use client";

import React from "react";
import { DashboardHeader } from "./header/DashboardHeader";
import { StudentHeaderData, StudentNotificationData } from "./header/types";
import { MobileBottomNavigation } from "./navigation/MobileBottomNavigation";

interface StudentDashboardLayoutProps {
  student: StudentHeaderData;
  notifications: StudentNotificationData;
  tenantEnabledModules?: string[];
  children?: React.ReactNode;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
}

export function StudentDashboardLayout({
  student,
  notifications,
  tenantEnabledModules,
  children,
  onMenuClick,
  onNotificationClick,
  onProfileClick,
}: StudentDashboardLayoutProps) {
  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex justify-center selection:bg-blue-500 selection:text-white overflow-x-hidden relative">
      {/* Mobile Screen Container Frame */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl flex flex-col min-h-screen min-h-[100dvh] shadow-sm sm:border-x sm:border-slate-200/60 dark:sm:border-slate-900 relative">
        {/* Top Header (Phase 1) */}
        <DashboardHeader
          student={student}
          notifications={notifications}
          onMenuClick={onMenuClick}
          onNotificationClick={onNotificationClick}
          onProfileClick={onProfileClick}
        />

        {/* Main Scrollable Content Container (pb-24 to accommodate floating nav) */}
        <main className="flex-1 w-full px-4 sm:px-5 py-4 overflow-y-auto overflow-x-hidden space-y-5 pb-24 sm:pb-28 focus:outline-none">
          {children}
        </main>

        {/* Floating Mobile Bottom Navigation (Phase 6) */}
        <MobileBottomNavigation
          tenantEnabledModules={tenantEnabledModules}
          unreadNotificationCount={notifications.unreadCount}
        />
      </div>
    </div>
  );
}
