"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "./header/DashboardHeader";
import { MobileBottomNavigation } from "./navigation/MobileBottomNavigation";
import { StudentHeaderProvider } from "@/context/student-header-context";
import { StudentHeaderData, StudentNotificationData } from "./header/types";

export function StudentShell({ children }: { children: React.ReactNode }) {
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
      <div className="w-full min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex justify-center selection:bg-blue-500 selection:text-white overflow-x-hidden relative">
        {/* Mobile-First Frame Container */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl flex flex-col min-h-screen min-h-[100dvh] shadow-sm sm:border-x sm:border-slate-200/60 dark:sm:border-slate-900 relative">
          {/* THE SINGLE AUTHORITATIVE STUDENT HEADER */}
          <DashboardHeader
            student={studentHeaderData}
            notifications={notificationsData}
          />

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 w-full px-3.5 sm:px-5 py-4 overflow-y-auto overflow-x-hidden space-y-5 pb-24 sm:pb-28 focus:outline-none">
            {children}
          </main>

          {/* THE SINGLE AUTHORITATIVE FLOATING BOTTOM NAVIGATION */}
          <MobileBottomNavigation
            unreadNotificationCount={notificationsData.unreadCount}
          />
        </div>
      </div>
    </StudentHeaderProvider>
  );
}
