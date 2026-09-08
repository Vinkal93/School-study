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
import { Droplets, Sparkles } from "lucide-react";

/**
 * LIQUID GLASS DASHBOARD SHELL
 * 
 * Apple/iOS Liquid Glass presentation shell for School Admin, Teacher & Super Admin:
 * - Ultra-frosted translucent floating sidebar with ambient specular highlights
 * - Frosted glass floating topbar with Liquid Glass status pill
 * - Iridescent ambient light meshes in the background
 * - Preserves 100% of underlying business components, auth, role-based controls, and state
 */
export function LiquidGlassDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const isSchoolAdmin = profile?.role === "school_admin";

  return (
    <div className="liquid-glass-portal flex h-screen h-[100dvh] overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFC] to-[#E0E7FF] dark:from-[#030712] dark:via-[#090E1A] dark:to-[#0B1329] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors relative">
      
      {/* Iridescent Ambient Background Glowing Orbs */}
      <div className="fixed top-[-15%] left-[5%] w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-tr from-cyan-400/25 via-sky-400/20 to-indigo-500/25 dark:from-cyan-500/20 dark:via-sky-500/15 dark:to-indigo-600/20 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-15%] right-[5%] w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-bl from-purple-500/25 via-pink-400/20 to-blue-600/25 dark:from-purple-600/20 dark:via-pink-600/15 dark:to-blue-600/20 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[30%] w-[30vw] h-[30vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-r from-emerald-400/15 to-teal-500/15 dark:from-emerald-600/10 dark:to-teal-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Floating Liquid Glass Sidebar (renders desktop aside + mobile drawer at root) */}
      <Sidebar variant="liquid" />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 z-10">
        {/* Floating Liquid Glass Topbar */}
        <div className="relative z-30">
          <div className="border-b border-white/50 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            {/* Version indicator banner chip */}
            <div className="w-full px-4 sm:px-6 py-1 bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-indigo-500/15 dark:from-cyan-500/20 dark:via-sky-500/20 dark:to-indigo-500/20 border-b border-cyan-500/20 flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300">
                <Droplets className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 animate-bounce" />
                <span>Liquid Glass UI Active</span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-normal">
                  • Apple iOS inspired glassmorphism shell
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="px-2 py-0.2 rounded-full bg-cyan-100/80 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-300/60 dark:border-cyan-800/60">
                  Liquid Glass
                </span>
              </div>
            </div>

            <Topbar variant="liquid" />
          </div>
        </div>

        {/* Subscription Banners & Modals */}
        {isSchoolAdmin && (
          <>
            <SubscriptionReminderBanner />
            <SubscriptionReminderModal />
          </>
        )}

        {/* Liquid Glass Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-28 md:pb-8 focus:outline-none">
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
