import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";
import {
  GlobalFeatureState,
  SchoolFeatureOverride,
  FeatureControlOverview,
} from "@/types/featureControl";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const db = getSafeAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    // Parallel fetch of controls, overrides, schools, and audit logs
    const [controlsSnap, overridesSnap, schoolsSnap, auditSnap] = await Promise.all([
      db.collection("siteSettings").doc("feature_controls").get(),
      db.collection("schoolFeatureOverrides").get(),
      db.collection("schools").select("name", "code", "status").get(),
      db.collection("featureControlAuditLogs").orderBy("timestamp", "desc").limit(50).get(),
    ]);

    const globalStates: Record<string, GlobalFeatureState> = controlsSnap.exists
      ? controlsSnap.data()?.states || {}
      : {};

    const overrides: SchoolFeatureOverride[] = overridesSnap.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    const schools = schoolsSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data().name || "Unnamed School",
      code: d.data().code || "",
      status: d.data().status || "ACTIVE",
    }));

    const auditLogs = auditSnap.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    // Compute overview metrics
    const modules = FEATURE_REGISTRY.filter((f) => f.category === "module");
    const features = FEATURE_REGISTRY.filter((f) => f.category === "feature");
    const actions = FEATURE_REGISTRY.filter((f) => f.category === "action");

    let activeModules = 0;
    let disabledModules = 0;
    modules.forEach((m) => {
      const state = globalStates[m.id] || globalStates[m.key];
      if (state && (state.rolloutMode === "OFF" || state.enabled === false)) {
        disabledModules++;
      } else {
        activeModules++;
      }
    });

    let activeFeatures = 0;
    let betaFeatures = 0;
    features.forEach((f) => {
      const state = globalStates[f.id] || globalStates[f.key];
      if (state && state.rolloutMode === "BETA") {
        betaFeatures++;
      }
      if (!state || (state.rolloutMode !== "OFF" && state.enabled !== false)) {
        activeFeatures++;
      }
    });

    let dangerousActionsKilled = 0;
    actions.forEach((a) => {
      const state = globalStates[a.id] || globalStates[a.key];
      if (state && (state.rolloutMode === "OFF" || state.enabled === false)) {
        dangerousActionsKilled++;
      }
    });

    const affectedSchoolSet = new Set<string>();
    overrides.forEach((o) => affectedSchoolSet.add(o.schoolId));
    Object.values(globalStates).forEach((s) => {
      if (s.selectedSchoolIds) {
        s.selectedSchoolIds.forEach((sid) => affectedSchoolSet.add(sid));
      }
    });

    const overview: FeatureControlOverview = {
      totalModules: modules.length,
      activeModules,
      disabledModules,
      totalFeatures: features.length,
      activeFeatures,
      betaFeatures,
      activeActions: actions.length,
      dangerousActionsKilled,
      activeOverridesCount: overrides.length,
      affectedSchoolsCount: affectedSchoolSet.size,
    };

    return NextResponse.json({
      success: true,
      registry: FEATURE_REGISTRY,
      globalStates,
      overrides,
      schools,
      auditLogs,
      overview,
    });
  } catch (err: any) {
    console.error("Super Admin Features GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }
    const user = auth.user!;

    const body = await req.json();
    const { featureId, rolloutMode, selectedSchoolIds = [], enabled, reason = "" } = body;

    if (!featureId) {
      return NextResponse.json({ error: "featureId is required" }, { status: 400 });
    }

    const db = getSafeAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const docRef = db.collection("siteSettings").doc("feature_controls");
    const docSnap = await docRef.get();
    const existingStates: Record<string, GlobalFeatureState> = docSnap.exists
      ? docSnap.data()?.states || {}
      : {};

    const previousState = existingStates[featureId] || null;

    const def = FEATURE_REGISTRY.find((f) => f.id === featureId || f.key === featureId);
    const resolvedEnabled = enabled !== undefined ? enabled : rolloutMode !== "OFF";

    const newState: GlobalFeatureState = {
      featureId,
      rolloutMode: rolloutMode || (resolvedEnabled ? "ON_FOR_ALL" : "OFF"),
      selectedSchoolIds: Array.isArray(selectedSchoolIds) ? selectedSchoolIds : [],
      enabled: resolvedEnabled,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email || user.uid,
      reason,
    };

    existingStates[featureId] = newState;

    await docRef.set({ states: existingStates, lastUpdated: new Date().toISOString() }, { merge: true });

    // Record immutable audit entry
    const auditEntry = {
      featureId,
      featureName: def?.name || featureId,
      category: def?.category || "feature",
      previousState,
      newState,
      target: "GLOBAL",
      actorId: user.uid,
      actorEmail: user.email || "super_admin",
      reason: reason || "Updated via Feature Control Center",
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      db.collection("featureControlAuditLogs").add(auditEntry),
      db.collection("superAdminAuditLogs").add({
        action: "FEATURE_CONTROL_UPDATE",
        target: featureId,
        details: auditEntry,
        performedBy: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Feature '${def?.name || featureId}' updated successfully.`,
      state: newState,
    });
  } catch (err: any) {
    console.error("Super Admin Features POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
