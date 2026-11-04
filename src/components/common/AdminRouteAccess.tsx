"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_FEATURE_REGISTRY } from "@/lib/features/adminFeatureRegistry";
import { EntitlementGate } from "./EntitlementGate";
import { ChooseYourPlanModal } from "@/components/billing/ChooseYourPlanModal";
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
    const db = getFirebaseDb();
    if (!db) return;

    try {
      const unsub = onSnapshot(
        doc(db, "schools", schoolId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const status = data?.onboardingStatus;
            // Only trigger modal when explicitly in PLAN_SELECTION_REQUIRED state
            setOnboardingRequired(status === "PLAN_SELECTION_REQUIRED");
          }
        },
        (err) => {
          console.warn("[AdminRouteAccess] School snapshot notice:", err);
        }
      );

      return () => unsub();
    } catch (e) {
      // Non-blocking
    }
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
