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
import { useEffect, useState } from "react";
import { getRedirectByRole, isRoleAllowedForPath } from "@/lib/utils/redirect-by-role";
import { Spinner } from "@/components/common/Spinner";
import { AdminWelcomeOverlay } from "@/components/common/AdminWelcomeOverlay";
import { FeatureShowcaseModal } from "@/components/showcase/FeatureShowcaseModal";

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

import { traceClient } from "@/lib/debug-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    traceClient("layout:guard_effect", {
      pathname,
      isMounted,
      loading,
      hasUser: !!firebaseUser,
      userUid: firebaseUser?.uid,
      hasProfile: !!profile,
      role: profile?.role,
      cachedSession: typeof window !== "undefined" ? !!localStorage.getItem("school_study_auth_session") : false,
    });

    // Suppress navigation redirects inside iframes/previews to prevent session disruption
    if (
      typeof window !== "undefined" &&
      (window.self !== window.top || window.location.search.includes("preview=true"))
    ) {
      traceClient("layout:guard_suppressed_iframe", { pathname });
      return;
    }

    if (isMounted && !loading) {
      if (!firebaseUser && !profile) {
        const hasCachedSession = typeof window !== "undefined" && Boolean(localStorage.getItem("school_study_auth_session"));
        traceClient("layout:guard_no_user", { pathname, hasCachedSession });
        if (!hasCachedSession) {
          traceClient("layout:REDIRECT_TO_LOGIN", { pathname });
          router.push("/login");
          return;
        }
      }

      if (pathname.startsWith("/super-admin")) {
        if (profile?.role !== "super_admin") {
          const correctRoute = getRedirectByRole(profile?.role || "school_admin");
          router.replace(correctRoute);
          return;
        }
        const isPinVerified =
          typeof window !== "undefined"
            ? localStorage.getItem("ss_super_admin_verified") === "true" ||
              sessionStorage.getItem("ss_super_admin_verified") === "true"
            : false;
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
  }, [firebaseUser, profile, loading, router, pathname, isMounted]);

  const isEmbeddedIframe = typeof window !== "undefined" && window.self !== window.top;

  // During SSR or initial client hydration or while auth is connecting, render the identical loading spinner
  if (!isMounted || loading || (!firebaseUser && !isEmbeddedIframe)) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Super Admin security gate: Require both super_admin role and active 2FA PIN session
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isSuperAdminVerified =
    typeof window !== "undefined"
      ? localStorage.getItem("ss_super_admin_verified") === "true" ||
        sessionStorage.getItem("ss_super_admin_verified") === "true"
      : false;

  if (isSuperAdminRoute && (!profile || profile.role !== "super_admin" || !isSuperAdminVerified) && !isEmbeddedIframe) {
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
            <FeatureShowcaseModal />
            <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950">
              {children}
            </div>
          </EntitlementProvider>
        </MobileNavProvider>
      </PortalUIProvider>
    );
  }

  // AI Mode is a dedicated desktop workspace (live phone on left, AI assistant on right)
  const isAiRoute = pathname.endsWith("/ai") || pathname.includes("/ai/");

  if (isAiRoute && !isEmbeddedIframe) {
    return (
      <PortalUIProvider>
        <MobileNavProvider>
          <EntitlementProvider>
            <div className="h-screen h-[100dvh] w-screen overflow-hidden bg-slate-100/80 dark:bg-slate-950">
              {children}
            </div>
          </EntitlementProvider>
        </MobileNavProvider>
      </PortalUIProvider>
    );
  }

  if (isAiRoute && isEmbeddedIframe) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center bg-white dark:bg-slate-900">
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            AI Assistant is active on the right panel.
          </p>
          <a
            href={profile?.role === "super_admin" ? "/super-admin" : "/admin"}
            className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <PortalUIProvider>
      <MobileNavProvider>
        <EntitlementProvider>
          <AdminWelcomeOverlay />
          <FeatureShowcaseModal />
          <DashboardShellSwitch>{children}</DashboardShellSwitch>
        </EntitlementProvider>
      </MobileNavProvider>
    </PortalUIProvider>
  );
}
