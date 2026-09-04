"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/student/header/DashboardHeader";
import { MobileBottomNavigation } from "@/components/student/navigation/MobileBottomNavigation";
import { StudentHeaderProvider } from "@/context/student-header-context";
import { StudentHeaderData, StudentNotificationData } from "@/components/student/header/types";
import { Sparkles } from "lucide-react";

/**
 * MODERN UI 2.0 STUDENT SHELL
 * 
 * Alternate modern presentation shell for the Student Portal:
 * - Edge-to-edge canvas with subtle ambient gradient
 * - Modern 2.0 status pill indicator
 * - Sleek card container with refined shadow & frosted glass header
 * - Reuses the exact same DashboardHeader and MobileBottomNavigation
 */
export function NewStudentShell({ children }: { children: React.ReactNode }) {
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
      <div className="w-full min-h-screen min-h-[100dvh] bg-[#F1F5F9] dark:bg-[#060810] text-slate-900 dark:text-slate-100 font-sans antialiased flex justify-center selection:bg-indigo-500 selection:text-white overflow-x-hidden relative transition-colors">
        {/* Mobile Screen Container Frame with 2.0 Styling */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl flex flex-col min-h-screen min-h-[100dvh] shadow-xl sm:border-x sm:border-indigo-100/60 dark:sm:border-indigo-950/40 relative bg-white dark:bg-slate-950">
          
          {/* Modern UI 2.0 Header Pill Banner */}
          <div className="w-full px-4 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between text-[11px] font-bold shadow-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
              <span>Modern Student 2.0</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[9px] font-extrabold uppercase tracking-wider">
              Preview
            </span>
          </div>

          {/* SINGLE AUTHORITATIVE STUDENT HEADER */}
          <DashboardHeader
            student={studentHeaderData}
            notifications={notificationsData}
          />

          {/* MAIN SCROLLABLE CONTENT */}
          <main className="flex-1 w-full px-3.5 sm:px-5 py-4 overflow-y-auto overflow-x-hidden space-y-5 pb-24 sm:pb-28 focus:outline-none">
            {children}
          </main>

          {/* SINGLE AUTHORITATIVE FLOATING BOTTOM NAVIGATION */}
          <MobileBottomNavigation
            unreadNotificationCount={notificationsData.unreadCount}
          />
        </div>
      </div>
    </StudentHeaderProvider>
  );
}
