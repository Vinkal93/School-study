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
import { Sparkles, X } from "lucide-react";

/**
 * MODERN UI 2.0 DASHBOARD SHELL
 * 
 * Alternate, modern presentation shell for School Admin, Teacher & Super Admin:
 * - Frosted glass floating topbar
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

  const [showModernBadge, setShowModernBadge] = React.useState(false);

  React.useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("dismissed_modern_badge");
      if (!dismissed) {
        setShowModernBadge(true);
        const timer = setTimeout(() => {
          setShowModernBadge(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleDismissBadge = () => {
    setShowModernBadge(false);
    try {
      sessionStorage.setItem("dismissed_modern_badge", "true");
    } catch {}
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F6F8FC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {/* Modern Floating Sidebar (renders desktop aside + mobile drawer at root) */}
      <Sidebar variant="modern" />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Modern Frosted Topbar */}
        <div className="relative z-30">
          <div className="border-b border-slate-200/70 dark:border-slate-800/80 shadow-xs">
            <Topbar variant="modern" />
          </div>
        </div>

        {/* Floating Modern UI 2.0 Notification Toast */}
        {showModernBadge && (
          <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 shadow-xl border border-blue-200/80 dark:border-blue-900/80 text-xs animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                Modern UI 2.0 Active
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Next-generation dashboard shell
              </p>
            </div>
            <button
              onClick={handleDismissBadge}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
