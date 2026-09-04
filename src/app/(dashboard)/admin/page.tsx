"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePortalUI } from "@/context/portal-ui-context";
import { useAppQuery } from "@/lib/cache";
import { getSchoolById } from "@/lib/services/school.service";
import { getSchoolSetupData } from "@/lib/services/setup.service";
import type { School } from "@/types";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { ClassicSchoolAdminDashboard } from "@/components/admin/ClassicSchoolAdminDashboard";
import { ModernSchoolAdminDashboard } from "@/components/admin/ModernSchoolAdminDashboard";

export default function SchoolAdminPage() {
  const { profile } = useAuth();
  const { settings, loading: portalLoading } = usePortalUI();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const isAllowed = profile?.role === "super_admin" || canAccess("school_dashboard");

  // Determine active UI presentation version
  const isModern = !portalLoading && settings.schoolAdmin === "new";

  // Data queries used for modern overview
  const { data: school } = useAppQuery<School | null>(
    schoolId && isAllowed ? `schoolProfile:${schoolId}` : null,
    () => getSchoolById(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 60_000 }
  );

  const { data: setupData } = useAppQuery(
    schoolId && isAllowed ? `schoolSetupData:${schoolId}` : null,
    () => getSchoolSetupData(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 30_000 }
  );

  const counts = {
    teachers: setupData?.teachers?.length || 0,
    students: setupData?.students?.length || 0,
    classes: setupData?.classes?.length || 0,
    academicYears: setupData?.academicYears?.length || 0,
  };

  // 1. When Modern UI 2.0 is selected by Super Admin
  if (isModern) {
    return (
      <EntitlementGate
        feature="school_dashboard"
        title="School Admin Dashboard"
        description="Real-time school metrics, faculty counts, student enrollments, and operational status."
        requiredPlan="Starter Plan"
      >
        <ModernSchoolAdminDashboard
          school={school ?? null}
          counts={counts}
        />
      </EntitlementGate>
    );
  }

  // 2. Default to Classic UI
  return <ClassicSchoolAdminDashboard />;
}
