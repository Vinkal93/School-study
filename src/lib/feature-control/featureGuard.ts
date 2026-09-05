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
    const db = typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
    if (!db) return {};

    const [controlsSnap, overridesSnap] = await Promise.all([
      db.collection("siteSettings").doc("feature_controls").get(),
      db.collection("schoolFeatureOverrides").get(),
    ]);

    const globalStates = controlsSnap.exists ? controlsSnap.data()?.states || {} : {};
    const overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

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
