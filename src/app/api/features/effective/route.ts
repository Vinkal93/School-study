import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";
import type { GlobalFeatureState, SchoolFeatureOverride } from "@/types/featureControl";

export const dynamic = "force-dynamic";

interface FeatureStoreType {
  states: Record<string, GlobalFeatureState>;
  overrides: SchoolFeatureOverride[];
  auditLogs: any[];
}

const defaultFeatureStore: FeatureStoreType = {
  states: {},
  overrides: [],
  auditLogs: [],
};

FEATURE_REGISTRY.forEach((f) => {
  defaultFeatureStore.states[f.id] = {
    featureId: f.id,
    rolloutMode: f.defaultRollout || "ON_FOR_ALL",
    selectedSchoolIds: [],
    enabled: f.defaultRollout !== "OFF",
    updatedAt: "1970-01-01T00:00:00.000Z",
    updatedBy: "system",
    reason: "System default baseline initialization",
  };
});

const getSharedStore = (): FeatureStoreType => {
  const g = globalThis as any;
  if (!g.__SCHOOL_STUDY_FEATURE_STORE__) {
    g.__SCHOOL_STUDY_FEATURE_STORE__ = { ...defaultFeatureStore };
  }
  return g.__SCHOOL_STUDY_FEATURE_STORE__;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "";

    const store = getSharedStore();
    let globalStates: Record<string, GlobalFeatureState> = { ...store.states };
    let overrides: SchoolFeatureOverride[] = [...store.overrides];

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();

    // 1. Fetch from Firestore Admin DB if available
    if (adminDb) {
      try {
        const controlsSnap = await adminDb.collection("siteSettings").doc("feature_controls").get().catch(() => null);
        if (controlsSnap && controlsSnap.exists) {
          const data = controlsSnap.data() || {};
          if (Array.isArray(data.statesList)) {
            data.statesList.forEach((s: GlobalFeatureState) => {
              if (s && s.featureId) {
                globalStates[s.featureId] = s;
              }
            });
          } else if (data.states && typeof data.states === "object") {
            Object.entries(data.states).forEach(([key, val]) => {
              if (val && typeof val === "object") {
                globalStates[key] = val as GlobalFeatureState;
              }
            });
          }
          store.states = globalStates;
        }

        if (schoolId) {
          const overridesSnap = await adminDb
            .collection("schoolFeatureOverrides")
            .where("schoolId", "==", schoolId)
            .get()
            .catch(() => null);
          if (overridesSnap && overridesSnap.docs) {
            overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          }
        } else {
          const overridesSnap = await adminDb.collection("schoolFeatureOverrides").get().catch(() => null);
          if (overridesSnap && overridesSnap.docs) {
            overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          }
        }
      } catch (e) {
        console.warn("Notice: Admin DB features fetch notice in effective route:", e);
      }
    } else if (clientDb) {
      try {
        const controlsSnap = await getDoc(doc(clientDb, "siteSettings", "feature_controls")).catch(() => null);
        if (controlsSnap && typeof controlsSnap.exists === "function" && controlsSnap.exists()) {
          const data = controlsSnap.data() || {};
          const mergeState = (s: GlobalFeatureState) => {
            if (!s || !s.featureId) return;
            const current = store.states[s.featureId];
            if (!current || !current.updatedAt || !s.updatedAt || new Date(s.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
              globalStates[s.featureId] = s;
              store.states[s.featureId] = s;
            }
          };

          if (Array.isArray(data.statesList)) {
            data.statesList.forEach(mergeState);
          } else if (data.states && typeof data.states === "object") {
            Object.values(data.states).forEach((val: any) => {
              if (val && typeof val === "object") mergeState(val as GlobalFeatureState);
            });
          }
        }

        if (schoolId) {
          const q = query(collection(clientDb, "schoolFeatureOverrides"), where("schoolId", "==", schoolId));
          const overridesSnap = await getDocs(q).catch(() => null);
          if (overridesSnap && overridesSnap.docs) {
            overrides = overridesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          }
        }
      } catch (e) {
        console.warn("Notice: Client DB features fetch notice in effective route:", e);
      }
    }

    if (schoolId && overrides.length === 0 && store.overrides.length > 0) {
      overrides = store.overrides.filter((o) => o.schoolId === schoolId);
    }

    const expandedStates: Record<string, GlobalFeatureState> = { ...globalStates };
    Object.values(globalStates).forEach((s) => {
      if (s && s.featureId) {
        expandedStates[s.featureId] = s;
        expandedStates[s.featureId.toLowerCase()] = s;
        expandedStates[s.featureId.replace(/[:.]/g, "_")] = s;
        const def = FEATURE_REGISTRY.find((f) => f.id === s.featureId || f.key === s.featureId);
        if (def) {
          if (def.id) {
            expandedStates[def.id] = s;
            expandedStates[def.id.toLowerCase()] = s;
          }
          if (def.key) {
            expandedStates[def.key] = s;
            expandedStates[def.key.toLowerCase()] = s;
          }
          if (def.category === "module" && def.moduleKey) {
            expandedStates[def.moduleKey] = s;
            expandedStates[`module:${def.moduleKey}`] = s;
            expandedStates[`module_${def.moduleKey}`] = s;
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      globalStates: expandedStates,
      overrides,
      schoolId,
    });
  } catch (err: any) {
    console.error("Effective Features GET error:", err);
    const store = getSharedStore();
    return NextResponse.json({
      success: true,
      globalStates: store.states,
      overrides: store.overrides,
    });
  }
}
