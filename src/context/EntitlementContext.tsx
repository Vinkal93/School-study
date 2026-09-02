"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EffectiveEntitlement } from "@/types";
import { getEffectiveEntitlement } from "@/lib/billing/entitlement";

interface EntitlementContextType {
  entitlement: EffectiveEntitlement | null;
  loading: boolean;
  accessMode: string;
  canAccess: (featureKey: string) => boolean;
  refreshEntitlement: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextType>({
  entitlement: null,
  loading: true,
  accessMode: "FULL_ACCESS",
  canAccess: () => true,
  refreshEntitlement: async () => {},
});

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role;

  const [entitlement, setEntitlement] = useState<EffectiveEntitlement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
    if (!schoolId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchEntitlement();

    // Setup real-time listener on schoolSubscriptions/{schoolId}
    const db = getFirebaseDb();
    if (!db) return;

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
      unsubscribeSub();
      unsubscribeOverrides();
      unsubscribePlans();
    };
  }, [schoolId]);

  const canAccess = (featureKey: string): boolean => {
    if (role === "super_admin") return true;
    if (!entitlement) return true; // Default fallback while loading
    if (entitlement.accessMode === "NO_ACCESS") return false;
    return entitlement.features[featureKey] !== false;
  };

  return (
    <EntitlementContext.Provider
      value={{
        entitlement,
        loading,
        accessMode: entitlement?.accessMode || "FULL_ACCESS",
        canAccess,
        refreshEntitlement: fetchEntitlement,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement() {
  return useContext(EntitlementContext);
}
