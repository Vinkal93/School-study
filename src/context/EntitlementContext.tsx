"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EffectiveEntitlement, FeatureAccessMode } from "@/types";
import { getEffectiveEntitlement } from "@/lib/billing/entitlement";
import { clearSubscriptionCache } from "@/lib/billing/subscriptions";
import { cachePlan, clearPlanCache } from "@/lib/billing/plans";
import { appQueryClient } from "@/lib/cache";
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
  accessMode: "NO_ACCESS",
  canAccess: () => false,
  canAccessFeature: () => false,
  canAccessAction: () => false,
  getFeatureAccessMode: () => "HIDDEN",
  getCapabilityAccessMode: () => "HIDDEN",
  getRequiredPlanForFeature: () => "Upgrade Required",
  getRequiredPlanForCapability: () => "Upgrade Required",
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
      (snap) => {
        clearSubscriptionCache(schoolId);
        if (snap.exists()) {
          const subData = snap.data();
          const rawPlan = subData?.planId || "plan_starter";
          let normalizedPlan = rawPlan.toLowerCase().trim();
          if (!normalizedPlan.startsWith("plan_")) normalizedPlan = `plan_${normalizedPlan}`;

          // Seed memory cache immediately with authoritative snapshot
          const g = globalThis as any;
          if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map();
          g.__BILLING_SUBSCRIPTIONS_MAP__.set(schoolId, {
            ...subData,
            id: schoolId,
            schoolId,
            planId: normalizedPlan,
            status: subData?.status || "ACTIVE",
          });
        }
        appQueryClient.invalidateCache(`schoolProfile:${schoolId}`);
        appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
        appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
        fetchEntitlement();
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Subscription real-time listener notice:", err);
        }
      }
    );

    // Setup real-time listener on schools/{schoolId} to instantly capture plan updates
    const schoolRef = doc(db, "schools", schoolId);
    const unsubscribeSchool = onSnapshot(
      schoolRef,
      (snap) => {
        clearSubscriptionCache(schoolId);
        if (snap.exists()) {
          const sData = snap.data();
          const rawPlan = sData?.planId || sData?.plan || "plan_starter";
          let normalizedPlan = rawPlan.toLowerCase().trim();
          if (!normalizedPlan.startsWith("plan_")) normalizedPlan = `plan_${normalizedPlan}`;

          const g = globalThis as any;
          if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map();
          const existing = g.__BILLING_SUBSCRIPTIONS_MAP__.get(schoolId) || {};
          g.__BILLING_SUBSCRIPTIONS_MAP__.set(schoolId, {
            ...existing,
            id: schoolId,
            schoolId,
            planId: normalizedPlan,
            status: sData?.subscriptionStatus || existing?.status || "ACTIVE",
          });
        }
        appQueryClient.invalidateCache(`schoolProfile:${schoolId}`);
        appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
        appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
        fetchEntitlement();
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("School document real-time listener notice:", err);
        }
      }
    );

    // Setup real-time listener on accessOverrides for this school
    const overridesRef = collection(db, "accessOverrides");
    const q = query(overridesRef, where("schoolId", "==", schoolId));
    const unsubscribeOverrides = onSnapshot(
      q,
      () => {
        clearSubscriptionCache(schoolId);
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
      (snap) => {
        clearPlanCache();
        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const p = { id: d.id, ...d.data() } as any;
            cachePlan(p);
          });
        }
        clearSubscriptionCache(schoolId);
        appQueryClient.invalidateCache(`schoolProfile:${schoolId}`);
        appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
        appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
        fetchEntitlement();
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Plans real-time listener notice:", err);
        }
      }
    );

    // Cross-tab / Multi-window instant synchronization via BroadcastChannel & storage events
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("school_study_realtime_sync");
        broadcastChannel.onmessage = (event) => {
          const evtType = String(event.data?.type || "").toUpperCase();
          if (
            (evtType === "PLAN_UPDATED" ||
              evtType === "FEATURE_OVERRIDE_UPDATED" ||
              evtType === "SUBSCRIPTION_UPDATED" ||
              evtType === "FEATURES_UPDATED") &&
            (!event.data?.schoolId || event.data?.schoolId === schoolId)
          ) {
            clearPlanCache();
            clearSubscriptionCache(schoolId);
            appQueryClient.invalidateCache(`schoolProfile:${schoolId}`);
            appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
            appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
            fetchEntitlement();
          }
        };
      }
    } catch (bcErr) {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === "school_study_plan_updated" ||
        e.key === "school_study_features_updated" ||
        e.key === "school_study_realtime_sync"
      ) {
        clearPlanCache();
        clearSubscriptionCache(schoolId);
        appQueryClient.invalidateCache(`schoolProfile:${schoolId}`);
        appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
        appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
        fetchEntitlement();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageEvent);
    }

    return () => {
      unsubscribeFeatures();
      unsubscribeSub();
      unsubscribeSchool();
      unsubscribeOverrides();
      unsubscribeFeatOverrides();
      unsubscribePlans();
      if (broadcastChannel) broadcastChannel.close();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  }, [schoolId]);

  const canAccess = (featureKey: string): boolean => {
    if (role === "super_admin") return true;
    if (!featureKey) return false;

    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentKey = getParentFeatureKey(canonical);

    // 0. CORE DASHBOARD ACCESS: Evergreen core feature accessible for all active school accounts
    if (canonical === "school_dashboard" || canonical === "dashboard") {
      return true;
    }

    // Fail-closed while loading or if not authenticated with a school
    if (loading || !entitlement) {
      return false;
    }

    // 0b. HIGHEST PRIORITY: Global Feature Control States (Super Admin Feature Control Center)
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

    const isFullControlOverride = (entitlement as any)?.controlMode === "FULL_CONTROL";

    // 1. Layered Feature Control Resolver Check
    const result = resolveEffectiveFeatureAccess({
      featureKey: canonical,
      schoolId,
      role,
      globalStates: globalFeatureStates,
      schoolOverrides: schoolFeatureOverrides,
      planAllowedFeatures: entitlement ? Object.keys(entitlement.features).filter((k) => entitlement.features[k]) : [],
      isFullControl: isFullControlOverride,
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
    if (isFullControlOverride) return true;

    if (entitlement.features[canonical] !== undefined) {
      return entitlement.features[canonical] !== false;
    }
    if (entitlement.features[featureKey] !== undefined) {
      return entitlement.features[featureKey] !== false;
    }
    if (parentKey && entitlement.features[parentKey] !== undefined) {
      return entitlement.features[parentKey] !== false;
    }

    if (Array.isArray(entitlement?.allowedFeatures) && entitlement.allowedFeatures.length > 0) {
      return (
        entitlement.allowedFeatures.includes(canonical) ||
        entitlement.allowedFeatures.includes(featureKey) ||
        (parentKey ? entitlement.allowedFeatures.includes(parentKey) : false)
      );
    }

    return false;
  };

  const getFeatureAccessMode = (featureKey: string): FeatureAccessMode => {
    if (role === "super_admin") return "FULL_ACCESS";
    if (!featureKey) return "HIDDEN";

    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentCapKey = getParentCapabilityKey(canonical);
    const parentKey = getParentFeatureKey(canonical);

    // 0. CORE DASHBOARD ACCESS: Evergreen core feature accessible for all active school accounts
    if (canonical === "school_dashboard" || canonical === "dashboard") {
      return "FULL_ACCESS";
    }

    // Fail-closed while loading or if not authenticated with a school
    if (loading || !entitlement) {
      return "HIDDEN";
    }

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

    const isFullControlOverride = (entitlement as any)?.controlMode === "FULL_CONTROL";

    // Layered Feature Control Resolver Check
    const result = resolveEffectiveFeatureAccess({
      featureKey: canonical,
      schoolId,
      role,
      globalStates: globalFeatureStates,
      schoolOverrides: schoolFeatureOverrides,
      planAllowedFeatures: entitlement ? Object.keys(entitlement.features).filter((k) => entitlement.features[k]) : [],
      isFullControl: isFullControlOverride,
    });

    if (!result.allowed) {
      if (
        result.status === 503 ||
        result.reason?.includes("restricted for this school") ||
        result.reason?.includes("disabled by platform")
      ) {
        return "HIDDEN";
      }

      const explicitMode =
        entitlement?.featureAccessModes?.[canonical] ||
        entitlement?.featureAccessModes?.[featureKey] ||
        (parentCapKey ? entitlement?.featureAccessModes?.[parentCapKey] : undefined) ||
        (parentKey ? entitlement?.featureAccessModes?.[parentKey] : undefined);

      if (explicitMode === "SHOWCASE") {
        return "SHOWCASE";
      }

      return "HIDDEN";
    }

    if (isFullControlOverride) {
      return "FULL_ACCESS";
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

    if (Array.isArray(entitlement?.allowedFeatures) && entitlement.allowedFeatures.length > 0) {
      const isIncluded =
        entitlement.allowedFeatures.includes(canonical) ||
        entitlement.allowedFeatures.includes(featureKey) ||
        (parentKey ? entitlement.allowedFeatures.includes(parentKey) : false);
      return isIncluded ? "FULL_ACCESS" : "HIDDEN";
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
