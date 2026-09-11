"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePortalUI } from "@/context/portal-ui-context";
import { useAppQuery } from "@/lib/cache";
import { getSchoolById } from "@/lib/services/school.service";
import { getSchoolSetupData } from "@/lib/services/setup.service";
import type { School } from "@/types";
import { useEntitlement } from "@/context/EntitlementContext";
import { useRealtimeSchoolDashboard } from "@/hooks/useRealtimeSchoolDashboard";
import { ClassicSchoolAdminDashboard } from "@/components/admin/ClassicSchoolAdminDashboard";
import { ModernSchoolAdminDashboard } from "@/components/admin/ModernSchoolAdminDashboard";
import { LiquidGlassSchoolAdminDashboard } from "@/components/admin/LiquidGlassSchoolAdminDashboard";

export default function SchoolAdminPage() {
  const { profile } = useAuth();
  const { settings, loading: portalLoading } = usePortalUI();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const isAllowed =
    profile?.role === "super_admin" ||
    profile?.role === "school_admin" ||
    (profile?.role as string) === "admin" ||
    canAccess("school_dashboard");

  // 1. Real-time Live Firestore Listener for School Profile & Metric Counts
  const {
    school: liveSchool,
    counts: liveCounts,
    isLoading: isRealtimeLoading,
    lastSyncTime,
  } = useRealtimeSchoolDashboard(schoolId);

  // 2. Cached fallback for instant paint / offline scenarios
  const { data: cachedSchool } = useAppQuery<School | null>(
    schoolId && isAllowed ? `schoolProfile:${schoolId}` : null,
    () => getSchoolById(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 60_000 }
  );

  const { data: cachedSetupData } = useAppQuery(
    schoolId && isAllowed ? `schoolSetupData:${schoolId}` : null,
    () => getSchoolSetupData(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 30_000 }
  );

  const school = liveSchool || cachedSchool || null;
  const counts = {
    teachers: liveCounts.teachers || cachedSetupData?.teachers?.length || 0,
    students: liveCounts.students || cachedSetupData?.students?.length || 0,
    classes: liveCounts.classes || cachedSetupData?.classes?.length || 0,
    academicYears: liveCounts.academicYears || cachedSetupData?.academicYears?.length || 0,
  };

  // Determine active UI presentation version
  const isLiquidGlass = !portalLoading && settings.schoolAdmin === "liquid_glass";
  const isModern = !portalLoading && settings.schoolAdmin === "new";

  // 1. When Liquid Glass UI is selected by Super Admin
  if (isLiquidGlass) {
    return (
      <LiquidGlassSchoolAdminDashboard
        school={school}
        counts={counts}
      />
    );
  }

  // 2. When Modern UI 2.0 is selected by Super Admin
  if (isModern) {
    return (
      <ModernSchoolAdminDashboard
        school={school}
        counts={counts}
      />
    );
  }

  // 3. Default to Classic UI
  return (
    <ClassicSchoolAdminDashboard
      initialSchool={school}
      initialCounts={counts}
    />
  );
}
