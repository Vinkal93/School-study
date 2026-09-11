"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EffectiveEntitlement, FeatureAccessMode } from "@/types";
import { getEffectiveEntitlement } from "@/lib/billing/entitlement";
import { clearSubscriptionCache } from "@/lib/billing/subscriptions";
import { resolveEffectiveFeatureAccess } from "@/lib/feature-control/resolver";
import { getFeatureDefinition } from "@/lib/feature-control/featureRegistry";
import type { GlobalFeatureState, SchoolFeatureOverride } from "@/types/featureControl";
import { canonicalizeCapabilityKey, getParentFeatureKey, getParentCapabilityKey } from "@/lib/billing/permissions";

interface EntitlementContextType {
  entitlement: EffectiveEntitlement | null;
  loading: boolean;
  accessMode: string;
  canAccess: (featureKey: string) => boolean;
  canAccessFeature: (featureKey: string) => boolean;
  canAccessAction: (actionKey: string) => boolean;
  getFeatureAccessMode: (featureKey: string) => FeatureAccessMode;
  getCapabilityAccessMode: (key: string) => FeatureAccessMode;
  getRequiredPlanForFeature: (featureKey: string) => string;
  getRequiredPlanForCapability: (key: string) => string;
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
  canAccessAction: () => true,
  getFeatureAccessMode: () => "FULL_ACCESS",
  getCapabilityAccessMode: () => "FULL_ACCESS",
  getRequiredPlanForFeature: () => "Professional Plan",
  getRequiredPlanForCapability: () => "Professional Plan",
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
      // CRITICAL: Clear stale in-memory subscription cache before re-fetching
      // Without this, plan changes from Super Admin are invisible to school admins
      clearSubscriptionCache(schoolId);
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
          const data = snap.data() || {};
          const states: Record<string, GlobalFeatureState> = {};

          if (Array.isArray(data.statesList)) {
            data.statesList.forEach((s: any) => {
              if (s && s.featureId) {
                states[s.featureId] = s;
                const def = getFeatureDefinition(s.featureId);
                if (def?.key) states[def.key] = s;
                if (def?.moduleKey) {
                  states[def.moduleKey] = s;
                  states[`module:${def.moduleKey}`] = s;
                }
              }
            });
          } else if (data.states && typeof data.states === "object") {
            Object.entries(data.states).forEach(([key, val]) => {
              if (val && typeof val === "object") {
                const s = val as GlobalFeatureState;
                states[key] = s;
                const def = getFeatureDefinition(key);
                if (def?.key) states[def.key] = s;
                if (def?.moduleKey) {
                  states[def.moduleKey] = s;
                  states[`module:${def.moduleKey}`] = s;
                }
              }
            });
          }

          setGlobalFeatureStates(states);
        }
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Feature controls real-time listener notice:", err);
        }
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
        if (err.code !== "permission-denied") {
          console.warn("Subscription real-time listener notice:", err);
        }
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
        if (err.code !== "permission-denied") {
          console.warn("AccessOverrides real-time listener notice:", err);
        }
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
        if (err.code !== "permission-denied") {
          console.warn("School feature overrides listener notice:", err);
        }
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
        if (err.code !== "permission-denied") {
          console.warn("Plans real-time listener notice:", err);
        }
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
    if (!featureKey) return false;

    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentKey = getParentFeatureKey(canonical);

    // 0. HIGHEST PRIORITY: Global Feature Control States (Super Admin Feature Control Center)
    // If a feature or its parent module is globally disabled, deny access immediately
    if (Object.keys(globalFeatureStates).length > 0) {
      // Check direct feature state
      const directState = globalFeatureStates[canonical] || globalFeatureStates[featureKey];
      if (directState && (directState.rolloutMode === "OFF" || directState.enabled === false)) {
        return false;
      }

      // Check parent module state
      const moduleKey = canonical.split(".")[0];
      const parentModuleState =
        globalFeatureStates[`module:${moduleKey}`] ||
        globalFeatureStates[moduleKey];
      if (parentModuleState && (parentModuleState.rolloutMode === "OFF" || parentModuleState.enabled === false)) {
        return false;
      }

      // Check BETA/SELECTED_SCHOOLS rollout
      if (directState && (directState.rolloutMode === "SELECTED_SCHOOLS" || directState.rolloutMode === "BETA")) {
        if (!schoolId || !directState.selectedSchoolIds?.includes(schoolId)) {
          return false;
        }
      }
      if (parentModuleState && (parentModuleState.rolloutMode === "SELECTED_SCHOOLS" || parentModuleState.rolloutMode === "BETA")) {
        if (!schoolId || !parentModuleState.selectedSchoolIds?.includes(schoolId)) {
          return false;
        }
      }
    }

    // 1. Layered Feature Control Resolver Check
    const result = resolveEffectiveFeatureAccess({
      featureKey: canonical,
      schoolId,
      role,
      globalStates: globalFeatureStates,
      schoolOverrides: schoolFeatureOverrides,
      planAllowedFeatures: entitlement ? Object.keys(entitlement.features).filter((k) => entitlement.features[k]) : [],
      isFullControl: entitlement?.accessMode === "FULL_ACCESS",
    });

    if (!result.allowed) return false;

    // 2. 3-Way Mode check: if explicitly SHOWCASE or HIDDEN, canAccess is false
    if (entitlement?.featureAccessModes) {
      if (entitlement.featureAccessModes[canonical] !== undefined) {
        return entitlement.featureAccessModes[canonical] === "FULL_ACCESS";
      }
      if (entitlement.featureAccessModes[featureKey] !== undefined) {
        return entitlement.featureAccessModes[featureKey] === "FULL_ACCESS";
      }
      if (parentKey && entitlement.featureAccessModes[parentKey] !== undefined) {
        return entitlement.featureAccessModes[parentKey] === "FULL_ACCESS";
      }
    }

    // 3. Base Entitlement checks
    if (!entitlement) return true; // Default fallback while loading
    if (entitlement.accessMode === "NO_ACCESS") return false;
    if (entitlement.accessMode === "FULL_ACCESS") return true;

    if (entitlement.features[canonical] !== undefined) {
      return entitlement.features[canonical] !== false;
    }
    if (entitlement.features[featureKey] !== undefined) {
      return entitlement.features[featureKey] !== false;
    }
    if (parentKey && entitlement.features[parentKey] !== undefined) {
      return entitlement.features[parentKey] !== false;
    }

    return false;
  };

  const getFeatureAccessMode = (featureKey: string): FeatureAccessMode => {
    if (role === "super_admin") return "FULL_ACCESS";
    if (!featureKey) return "HIDDEN";

    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentCapKey = getParentCapabilityKey(canonical);
    const parentKey = getParentFeatureKey(canonical);

    // 0. HIGHEST PRIORITY: Global Feature Control States
    if (Object.keys(globalFeatureStates).length > 0) {
      const directState = globalFeatureStates[canonical] || globalFeatureStates[featureKey];
      if (directState && (directState.rolloutMode === "OFF" || directState.enabled === false)) {
        return "HIDDEN";
      }
      const moduleKey = canonical.split(".")[0];
      const parentModuleState =
        globalFeatureStates[`module:${moduleKey}`] ||
        globalFeatureStates[moduleKey];
      if (parentModuleState && (parentModuleState.rolloutMode === "OFF" || parentModuleState.enabled === false)) {
        return "HIDDEN";
      }
      if (directState && (directState.rolloutMode === "SELECTED_SCHOOLS" || directState.rolloutMode === "BETA")) {
        if (!schoolId || !directState.selectedSchoolIds?.includes(schoolId)) {
          return "HIDDEN";
        }
      }
    }

    // Layered Feature Control Resolver Check
    const result = resolveEffectiveFeatureAccess({
      featureKey: canonical,
      schoolId,
      role,
      globalStates: globalFeatureStates,
      schoolOverrides: schoolFeatureOverrides,
      planAllowedFeatures: entitlement ? Object.keys(entitlement.features).filter((k) => entitlement.features[k]) : [],
      isFullControl: entitlement?.accessMode === "FULL_ACCESS",
    });

    if (!result.allowed) {
      return "HIDDEN";
    }

    if (entitlement?.featureAccessModes) {
      if (entitlement.featureAccessModes[canonical]) {
        return entitlement.featureAccessModes[canonical];
      }
      if (entitlement.featureAccessModes[featureKey]) {
        return entitlement.featureAccessModes[featureKey];
      }
      if (parentCapKey && entitlement.featureAccessModes[parentCapKey]) {
        return entitlement.featureAccessModes[parentCapKey];
      }
      if (parentKey && entitlement.featureAccessModes[parentKey]) {
        return entitlement.featureAccessModes[parentKey];
      }
    }

    if (entitlement?.features) {
      if (entitlement.features[canonical] !== undefined) {
        return entitlement.features[canonical] ? "FULL_ACCESS" : "HIDDEN";
      }
      if (entitlement.features[featureKey] !== undefined) {
        return entitlement.features[featureKey] ? "FULL_ACCESS" : "HIDDEN";
      }
      if (parentKey && entitlement.features[parentKey] !== undefined) {
        return entitlement.features[parentKey] ? "FULL_ACCESS" : "HIDDEN";
      }
    }

    return "FULL_ACCESS";
  };

  const getRequiredPlanForFeature = (featureKey: string): string => {
    if (!featureKey) return "Higher Plan Required";
    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentKey = getParentFeatureKey(canonical);

    return (
      entitlement?.availableFromMap?.[canonical] ||
      entitlement?.availableFromMap?.[featureKey] ||
      (parentKey ? entitlement?.availableFromMap?.[parentKey] : undefined) ||
      "Higher Plan Required"
    );
  };

  return (
    <EntitlementContext.Provider
      value={{
        entitlement,
        loading,
        accessMode: entitlement?.accessMode || "FULL_ACCESS",
        canAccess,
        canAccessFeature: canAccess,
        canAccessAction: canAccess,
        getFeatureAccessMode,
        getCapabilityAccessMode: getFeatureAccessMode,
        getRequiredPlanForFeature,
        getRequiredPlanForCapability: getRequiredPlanForFeature,
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
