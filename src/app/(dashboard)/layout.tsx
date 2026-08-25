"use client";

import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileNavProvider } from "@/context/mobile-nav-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRedirectByRole, isRoleAllowedForPath } from "@/lib/utils/redirect-by-role";

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
      <div className="flex min-h-screen items-center justify-center">
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </MobileNavProvider>
  );
}
