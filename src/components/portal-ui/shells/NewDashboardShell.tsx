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
import { Sparkles } from "lucide-react";

/**
 * MODERN UI 2.0 DASHBOARD SHELL
 * 
 * Alternate, modern presentation shell for School Admin, Teacher & Super Admin:
 * - Frosted glass floating topbar with Modern 2.0 status chip
 * - Rounded elevation canvas with refined borders
 * - Preserves 100% of underlying business components, auth, and state
 */
export function NewDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const isSchoolAdmin = profile?.role === "school_admin";
  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F6F8FC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {/* Modern Floating Sidebar Wrapper */}
      <div className="hidden md:flex h-full p-2.5 pr-0">
        <div className="h-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/90 shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Modern Frosted Topbar with 2.0 Pill */}
        <div className="relative z-30">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800/80 shadow-xs">
            {/* Version indicator banner chip */}
            <div className="w-full px-4 sm:px-6 py-1 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-500/15 dark:via-indigo-500/15 dark:to-purple-500/15 border-b border-blue-500/15 flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                <span>Modern UI 2.0 Active</span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-normal">
                  • Next-generation dashboard shell
                </span>
              </div>
              <span className="px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-900/60">
                Live 2.0
              </span>
            </div>

            <Topbar />
          </div>
        </div>

        {/* Subscription Banners & Modals */}
        {isSchoolAdmin && (
          <>
            <SubscriptionReminderBanner />
            <SubscriptionReminderModal />
          </>
        )}

        {/* Modern Elevated Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-28 md:pb-8 focus:outline-none">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* Floating Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
