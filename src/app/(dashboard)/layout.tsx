"use client";

import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileNavProvider } from "@/context/mobile-nav-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRedirectByRole, isRoleAllowedForPath } from "@/lib/utils/redirect-by-role";
import { SubscriptionReminderBanner, SubscriptionReminderModal } from "@/components/billing";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      if (profile && !isRoleAllowedForPath(profile.role, pathname)) {
        // User is trying to access a route not meant for their role
        const correctRoute = getRedirectByRole(profile.role);
        router.replace(correctRoute);
      }
    }
  }, [firebaseUser, profile, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  // If profile is loaded but user is on wrong route, prevent flash before redirect
  if (profile && !isRoleAllowedForPath(profile.role, pathname)) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // Student Portal uses its own dedicated mobile-first header & bottom navigation
  const isStudentRoute = pathname.startsWith("/student");

  if (isStudentRoute) {
    return (
      <MobileNavProvider>
        <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950">
          {children}
        </div>
      </MobileNavProvider>
    );
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Topbar />
          <SubscriptionReminderBanner />
          <SubscriptionReminderModal />
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 md:pb-6 focus:outline-none">
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </MobileNavProvider>
  );
}
