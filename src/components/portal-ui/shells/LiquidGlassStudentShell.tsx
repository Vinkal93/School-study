"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/student/header/DashboardHeader";
import { MobileBottomNavigation } from "@/components/student/navigation/MobileBottomNavigation";
import { StudentHeaderProvider } from "@/context/student-header-context";
import { StudentHeaderData, StudentNotificationData } from "@/components/student/header/types";
import { StudentNavDrawer } from "@/components/student/navigation/StudentNavDrawer";
import { Droplets, Sparkles } from "lucide-react";

/**
 * LIQUID GLASS STUDENT SHELL
 * 
 * Apple iOS inspired Liquid Glass presentation shell for Student Portal:
 * - Dynamic Island liquid status banner
 * - Ambient iridescent background meshes with soft glowing lighting
 * - Ultra-frosted glass container & navigation bar
 * - Accessible slide-over drawer connected to top nav menu button
 * - Clean iPhone frame margins and safe padding
 */
export function LiquidGlassStudentShell({ children }: { children: React.ReactNode }) {
  const { profile, firebaseUser } = useAuth();

  const studentHeaderData: StudentHeaderData = useMemo(() => {
    const rawName = profile?.name || firebaseUser?.displayName || "Student";
    const firstName = rawName.trim().split(" ")[0] || "Student";
    const photoUrl =
      (profile as any)?.photoURL ||
      (profile as any)?.avatarUrl ||
      firebaseUser?.photoURL ||
      undefined;

    return {
      id: profile?.uid || firebaseUser?.uid || "student",
      firstName,
      fullName: rawName,
      photoUrl,
    };
  }, [profile, firebaseUser]);

  const notificationsData: StudentNotificationData = useMemo(() => {
    return {
      unreadCount: 0,
    };
  }, []);

  return (
    <StudentHeaderProvider>
      <div className="liquid-glass-portal w-full min-h-screen min-h-[100dvh] bg-gradient-to-br from-[#EEF2FF] via-[#F0FDF4]/50 to-[#F8FAFC] dark:from-[#080B14] dark:via-[#091322] dark:to-[#0A0718] text-slate-900 dark:text-slate-100 font-sans antialiased flex justify-center selection:bg-cyan-500 selection:text-white overflow-x-hidden relative transition-colors">
        
        {/* Ambient Liquid Glowing Orbs in Background */}
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-500/20 dark:from-cyan-500/10 dark:to-blue-600/10 blur-[100px] pointer-events-none -z-10" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-indigo-500/10 dark:to-purple-600/10 blur-[100px] pointer-events-none -z-10" />

        {/* iPhone-pro Device Canvas Container */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl flex flex-col min-h-screen min-h-[100dvh] relative backdrop-blur-md bg-white/70 dark:bg-slate-950/70 sm:border-x sm:border-white/50 dark:sm:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          
          {/* iOS Dynamic Island Liquid Glass Pill Banner */}
          <div className="w-full px-4 py-1.5 bg-gradient-to-r from-cyan-600/90 via-sky-600/90 to-indigo-600/90 backdrop-blur-xl text-white flex items-center justify-between text-[11px] font-bold shadow-xs">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-cyan-200 animate-bounce" />
              <span>Liquid Glass Experience</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span className="px-2 py-0.2 rounded-full bg-white/20 text-white text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md">
                Active
              </span>
            </div>
          </div>

          {/* THE AUTHORITATIVE STUDENT HEADER WITH FROSTED GLASS */}
          <div className="backdrop-blur-2xl bg-white/60 dark:bg-slate-950/60 sticky top-0 z-40 border-b border-white/40 dark:border-white/10">
            <DashboardHeader
              student={studentHeaderData}
              notifications={notificationsData}
            />
          </div>

          {/* MAIN SCROLLABLE CONTENT WITH IPHONE MARGINS */}
          <main className="flex-1 w-full px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden space-y-5 pb-28 sm:pb-32 focus:outline-none">
            {children}
          </main>

          {/* FLOATING IPHONE PILL BOTTOM NAVIGATION */}
          <MobileBottomNavigation
            unreadNotificationCount={notificationsData.unreadCount}
          />

          {/* ACCESSIBLE SLIDE-OVER NAVIGATION DRAWER */}
          <StudentNavDrawer />
        </div>
      </div>
    </StudentHeaderProvider>
  );
}
