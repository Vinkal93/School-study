import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveFeatureAccess, FeatureAccessResult } from "./resolver";
import { getFeatureDefinition } from "./featureRegistry";

// In-memory / cache store for server-side evaluation
let cachedGlobalFeatures: Record<string, any> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 second TTL for blazing fast API checks

async function loadServerFeatureData() {
  const now = Date.now();
  if (cachedGlobalFeatures && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedGlobalFeatures;
  }

  try {
    const adminModule = await import("@/lib/firebase/admin");
    const adminDb = typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
    let data: any = {};
    let overrides: any[] = [];

    if (adminDb) {
      const [controlsSnap, overridesSnap] = await Promise.all([
        adminDb.collection("siteSettings").doc("feature_controls").get().catch(() => null),
        adminDb.collection("schoolFeatureOverrides").get().catch(() => null),
      ]);
      if (controlsSnap && controlsSnap.exists) data = controlsSnap.data() || {};
      if (overridesSnap && overridesSnap.docs) {
        overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
    } else {
      const clientModule = await import("@/lib/firebase/client");
      const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
      if (clientDb) {
        const firestoreModule = await import("firebase/firestore");
        const [controlsSnap, overridesSnap] = await Promise.all([
          firestoreModule.getDoc(firestoreModule.doc(clientDb, "siteSettings", "feature_controls")).catch(() => null),
          firestoreModule.getDocs(firestoreModule.collection(clientDb, "schoolFeatureOverrides")).catch(() => null),
        ]);
        if (controlsSnap && controlsSnap.exists()) data = controlsSnap.data() || {};
        if (overridesSnap && overridesSnap.docs) {
          overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
      }
    }

    const globalStates: Record<string, any> = {};
    if (Array.isArray(data.statesList)) {
      data.statesList.forEach((s: any) => {
        if (s && s.featureId) {
          globalStates[s.featureId] = s;
          const def = getFeatureDefinition(s.featureId);
          if (def?.key) globalStates[def.key] = s;
          if (def?.moduleKey) {
            globalStates[def.moduleKey] = s;
            globalStates[`module:${def.moduleKey}`] = s;
          }
        }
      });
    } else if (data.states && typeof data.states === "object") {
      Object.entries(data.states).forEach(([key, val]) => {
        if (val && typeof val === "object") {
          globalStates[key] = val;
          const def = getFeatureDefinition(key);
          if (def?.key) globalStates[def.key] = val;
          if (def?.moduleKey) {
            globalStates[def.moduleKey] = val;
            globalStates[`module:${def.moduleKey}`] = val;
          }
        }
      });
    }

    cachedGlobalFeatures = { globalStates, overrides };
    lastFetchTime = now;
    return cachedGlobalFeatures;
  } catch (e) {
    return cachedGlobalFeatures || { globalStates: {}, overrides: [] };
  }
}

/**
 * Evaluates feature access for an API endpoint.
 * Returns null if allowed, or a pre-formatted NextResponse (403/503) if blocked.
 */
export async function assertFeatureEnabled(
  featureKey: string,
  schoolId?: string,
  userRole?: string
): Promise<NextResponse | null> {
  const data = await loadServerFeatureData();

  const result = resolveEffectiveFeatureAccess({
    featureKey,
    schoolId,
    role: userRole,
    globalStates: data.globalStates,
    schoolOverrides: data.overrides,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: result.status === 503 ? "FEATURE_DISABLED" : "ACCESS_DENIED",
        message: result.reason || "This feature is currently unavailable.",
        featureKey,
        featureName: result.featureName,
        category: result.category,
      },
      { status: result.status }
    );
  }

  return null;
}
