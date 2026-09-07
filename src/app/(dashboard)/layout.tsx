"use client";

import { useAuth } from "@/hooks/use-auth";
import { MobileNavProvider } from "@/context/mobile-nav-context";
import { EntitlementProvider } from "@/context/EntitlementContext";
import { PortalUIProvider, usePortalUI } from "@/context/portal-ui-context";
import { ClassicDashboardShell } from "@/components/portal-ui/shells/ClassicDashboardShell";
import { NewDashboardShell } from "@/components/portal-ui/shells/NewDashboardShell";
import { LiquidGlassDashboardShell } from "@/components/portal-ui/shells/LiquidGlassDashboardShell";
import { PortalUIErrorBoundary } from "@/components/portal-ui/PortalUIErrorBoundary";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRedirectByRole, isRoleAllowedForPath } from "@/lib/utils/redirect-by-role";
import { Spinner } from "@/components/common/Spinner";

function DashboardShellSwitch({ children }: { children: React.ReactNode }) {
  const { isNewUI, isLiquidGlassUI, activePortal } = usePortalUI();

  if (isLiquidGlassUI) {
    return (
      <PortalUIErrorBoundary
        fallback={<ClassicDashboardShell>{children}</ClassicDashboardShell>}
        portalName={`${activePortal} (Liquid Glass)`}
      >
        <LiquidGlassDashboardShell>{children}</LiquidGlassDashboardShell>
      </PortalUIErrorBoundary>
    );
  }

  if (isNewUI) {
    return (
      <PortalUIErrorBoundary
        fallback={<ClassicDashboardShell>{children}</ClassicDashboardShell>}
        portalName={activePortal}
      >
        <NewDashboardShell>{children}</NewDashboardShell>
      </PortalUIErrorBoundary>
    );
  }

  return <ClassicDashboardShell>{children}</ClassicDashboardShell>;
}

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

      if (pathname.startsWith("/super-admin")) {
        if (profile?.role !== "super_admin") {
          const correctRoute = getRedirectByRole(profile?.role || "school_admin");
          router.replace(correctRoute);
          return;
        }
        const isPinVerified = sessionStorage.getItem("ss_super_admin_verified") === "true";
        if (!isPinVerified) {
          router.replace("/super-admin/login");
          return;
        }
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
        <Spinner size="lg" />
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  // Super Admin security gate: Require both super_admin role and active 2FA PIN session
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isSuperAdminVerified =
    typeof window !== "undefined"
      ? sessionStorage.getItem("ss_super_admin_verified") === "true"
      : false;

  if (isSuperAdminRoute && (!profile || profile.role !== "super_admin" || !isSuperAdminVerified)) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If profile is loaded but user is on wrong route, prevent flash before redirect
  if (profile && !isRoleAllowedForPath(profile.role, pathname)) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Student Portal uses its own dedicated mobile-first header & bottom navigation
  const isStudentRoute = pathname.startsWith("/student");

  if (isStudentRoute) {
    return (
      <PortalUIProvider>
        <MobileNavProvider>
          <EntitlementProvider>
            <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950">
              {children}
            </div>
          </EntitlementProvider>
        </MobileNavProvider>
      </PortalUIProvider>
    );
  }

  return (
    <PortalUIProvider>
      <MobileNavProvider>
        <EntitlementProvider>
          <DashboardShellSwitch>{children}</DashboardShellSwitch>
        </EntitlementProvider>
      </MobileNavProvider>
    </PortalUIProvider>
  );
}
