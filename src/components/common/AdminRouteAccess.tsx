"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_FEATURE_REGISTRY } from "@/lib/features/adminFeatureRegistry";
import { EntitlementGate } from "./EntitlementGate";
import { ChooseYourPlanModal } from "@/components/billing/ChooseYourPlanModal";
import { getSchoolById } from "@/lib/services/school.service";
import { useAuth } from "@/hooks/use-auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ReactNode } from "react";

export function AdminRouteAccess({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    getSchoolById(schoolId).then((data) => {
      if (!active || !data) return;
      const status = (data as any)?.onboardingStatus;
      setOnboardingRequired(status === "PLAN_SELECTION_REQUIRED");
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId]);

  const feature = ADMIN_FEATURE_REGISTRY.filter((f) => {
    const route = f.route?.split("?")[0];
    return route && (path === route || (route !== "/admin" && path.startsWith(`${route}/`)));
  }).sort(
    (a, b) =>
      (b.route?.length || 0) - (a.route?.length || 0) || (a.type === "module" ? 1 : -1)
  )[0];

  return (
    <>
      {onboardingRequired && schoolId && (
        <ChooseYourPlanModal
          isOpen={true}
          schoolId={schoolId}
          adminName={profile?.name || "Administrator"}
          adminEmail={profile?.email || ""}
          onPlanActivated={() => setOnboardingRequired(false)}
        />
      )}
      {!feature || path === "/admin" || path === "/admin/billing" ? (
        children
      ) : (
        <EntitlementGate capability={feature.key} title={feature.label}>
          {children}
        </EntitlementGate>
      )}
    </>
  );
}
