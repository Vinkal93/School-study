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
    <div className="liquid-glass-portal flex h-screen h-[100dvh] overflow-hidden text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors relative bg-[#F8FBFF] dark:bg-[#070C18]">
      
      {/* Precision Multi-radial Ambient Gradient Mesh */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 dark:hidden"
        style={{
          background: `
            radial-gradient(circle at 8% 8%, rgba(92,150,255,.28), transparent 28%),
            radial-gradient(circle at 92% 12%, rgba(185,132,255,.24), transparent 26%),
            radial-gradient(circle at 50% 100%, rgba(83,196,255,.18), transparent 35%),
            linear-gradient(135deg, #edf4ff, #f8fbff 48%, #eef1ff)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none -z-10 hidden dark:block"
        style={{
          background: `
            radial-gradient(circle at 8% 8%, rgba(56,189,248,.22), transparent 28%),
            radial-gradient(circle at 92% 12%, rgba(168,85,247,.20), transparent 26%),
            radial-gradient(circle at 50% 100%, rgba(99,102,241,.18), transparent 35%),
            linear-gradient(135deg, #070c18, #0a1124 48%, #060a14)
          `,
        }}
      />

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
