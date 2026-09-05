"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EffectiveEntitlement } from "@/types";
import { getEffectiveEntitlement } from "@/lib/billing/entitlement";
import { resolveEffectiveFeatureAccess } from "@/lib/feature-control/resolver";
import type { GlobalFeatureState, SchoolFeatureOverride } from "@/types/featureControl";

interface EntitlementContextType {
  entitlement: EffectiveEntitlement | null;
  loading: boolean;
  accessMode: string;
  canAccess: (featureKey: string) => boolean;
  canAccessFeature: (featureKey: string) => boolean;
  refreshEntitlement: () => Promise<void>;
  globalFeatureStates: Record<string, GlobalFeatureState>;
  schoolFeatureOverrides: SchoolFeatureOverride[];
}

const EntitlementContext = createContext<EntitlementContextType>({
  entitlement: null,
  loading: true,
  accessMode: "FULL_ACCESS",
  canAccess: () => true,
  canAccessFeature: () => true,
  refreshEntitlement: async () => {},
  globalFeatureStates: {},
  schoolFeatureOverrides: [],
});

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role;

  const [entitlement, setEntitlement] = useState<EffectiveEntitlement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [globalFeatureStates, setGlobalFeatureStates] = useState<Record<string, GlobalFeatureState>>({});
  const [schoolFeatureOverrides, setSchoolFeatureOverrides] = useState<SchoolFeatureOverride[]>([]);

  const fetchEntitlement = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getEffectiveEntitlement(schoolId);
      setEntitlement(data);
    } catch (err) {
      console.warn("Failed to fetch effective entitlement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    // Real-time listener on siteSettings/feature_controls for instant global toggle updates
    const featureControlsRef = doc(db, "siteSettings", "feature_controls");
    const unsubscribeFeatures = onSnapshot(
      featureControlsRef,
      (snap) => {
        if (snap.exists()) {
          const states = snap.data()?.states || {};
          setGlobalFeatureStates(states);
        }
      },
      (err) => {
        console.warn("Feature controls real-time listener notice:", err);
      }
    );

    // If no schoolId, still keep global listener
    if (!schoolId) {
      setLoading(false);
      return () => unsubscribeFeatures();
    }

    // Initial fetch
    fetchEntitlement();

    // Setup real-time listener on schoolSubscriptions/{schoolId}
    const subRef = doc(db, "schoolSubscriptions", schoolId);
    const unsubscribeSub = onSnapshot(
      subRef,
      () => {
        fetchEntitlement();
      },
      (err) => {
        console.warn("Subscription real-time listener notice:", err);
      }
    );

    // Setup real-time listener on accessOverrides for this school
    const overridesRef = collection(db, "accessOverrides");
    const q = query(overridesRef, where("schoolId", "==", schoolId));
    const unsubscribeOverrides = onSnapshot(
      q,
      () => {
        fetchEntitlement();
      },
      (err) => {
        console.warn("AccessOverrides real-time listener notice:", err);
      }
    );

    // Setup real-time listener on schoolFeatureOverrides for this school
    const featureOverridesRef = collection(db, "schoolFeatureOverrides");
    const qFeatOverrides = query(featureOverridesRef, where("schoolId", "==", schoolId));
    const unsubscribeFeatOverrides = onSnapshot(
      qFeatOverrides,
      (snap) => {
        const list: SchoolFeatureOverride[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setSchoolFeatureOverrides(list);
      },
      (err) => {
        console.warn("School feature overrides listener notice:", err);
      }
    );

    // Setup real-time listener on plans collection for dynamic plan feature revalidation
    const plansRef = collection(db, "plans");
    const unsubscribePlans = onSnapshot(
      plansRef,
      () => {
        fetchEntitlement();
      },
      (err) => {
        console.warn("Plans real-time listener notice:", err);
      }
    );

    return () => {
      unsubscribeFeatures();
      unsubscribeSub();
      unsubscribeOverrides();
      unsubscribeFeatOverrides();
      unsubscribePlans();
    };
  }, [schoolId]);

  const canAccess = (featureKey: string): boolean => {
    if (role === "super_admin") return true;

    // 1. Layered Feature Control Resolver Check
    const result = resolveEffectiveFeatureAccess({
      featureKey,
      schoolId,
      role,
      globalStates: globalFeatureStates,
      schoolOverrides: schoolFeatureOverrides,
      planAllowedFeatures: entitlement ? Object.keys(entitlement.features).filter((k) => entitlement.features[k]) : [],
      isFullControl: entitlement?.accessMode === "FULL_ACCESS",
    });

    if (!result.allowed) return false;

    // 2. Base Entitlement checks
    if (!entitlement) return true; // Default fallback while loading
    if (entitlement.accessMode === "NO_ACCESS") return false;
    if (entitlement.accessMode === "FULL_ACCESS") return true;
    return entitlement.features[featureKey] !== false;
  };

  return (
    <EntitlementContext.Provider
      value={{
        entitlement,
        loading,
        accessMode: entitlement?.accessMode || "FULL_ACCESS",
        canAccess,
        canAccessFeature: canAccess,
        refreshEntitlement: fetchEntitlement,
        globalFeatureStates,
        schoolFeatureOverrides,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement() {
  return useContext(EntitlementContext);
}

export function useFeatureControl() {
  return useContext(EntitlementContext);
}

