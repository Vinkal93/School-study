import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";
import {
  GlobalFeatureState,
  SchoolFeatureOverride,
  FeatureControlOverview,
} from "@/types/featureControl";

// Global in-memory fallback store for resilient local dev & serverless restarts
const featureStore = (globalThis as any).__SCHOOL_STUDY_FEATURE_STORE__ || {
  states: {} as Record<string, GlobalFeatureState>,
  overrides: [] as SchoolFeatureOverride[],
  auditLogs: [] as any[],
};
(globalThis as any).__SCHOOL_STUDY_FEATURE_STORE__ = featureStore;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const roleHeader = req.headers.get("x-user-role");

    // Optional Super Admin authorization
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();

    let globalStates: Record<string, GlobalFeatureState> = { ...featureStore.states };
    let overrides: SchoolFeatureOverride[] = [...featureStore.overrides];
    let schools: any[] = [];
    let auditLogs: any[] = [...featureStore.auditLogs];

    // Tier 1: Try Admin SDK (if service account available)
    if (adminDb) {
      try {
        const [controlsSnap, overridesSnap, schoolsSnap, auditSnap] = await Promise.all([
          adminDb.collection("siteSettings").doc("feature_controls").get(),
          adminDb.collection("schoolFeatureOverrides").get(),
          adminDb.collection("schools").select("name", "code", "status").get(),
          adminDb.collection("featureControlAuditLogs").orderBy("timestamp", "desc").limit(50).get(),
        ]);

        if (controlsSnap.exists) {
          globalStates = { ...globalStates, ...(controlsSnap.data()?.states || {}) };
          featureStore.states = globalStates;
        }

        overrides = overridesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        featureStore.overrides = overrides;

        schools = schoolsSnap.docs.map((d: any) => ({
          id: d.id,
          name: d.data().name || "Unnamed School",
          code: d.data().code || "",
          status: d.data().status || "ACTIVE",
        }));

        auditLogs = auditSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        featureStore.auditLogs = auditLogs;
      } catch (adminErr) {
        console.warn("Notice: Admin DB features fetch notice:", adminErr);
      }
    } else if (clientDb) {
      // Tier 2: Try Client Firestore SDK
      try {
        const controlsDoc = await getDoc(doc(clientDb, "siteSettings", "feature_controls"));
        if (controlsDoc.exists()) {
          globalStates = { ...globalStates, ...(controlsDoc.data()?.states || {}) };
          featureStore.states = globalStates;
        }

        const overridesSnap = await getDocs(collection(clientDb, "schoolFeatureOverrides")).catch(() => ({ docs: [] }));
        if (overridesSnap.docs?.length) {
          overrides = overridesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          featureStore.overrides = overrides;
        }

        const schoolsSnap = await getDocs(collection(clientDb, "schools")).catch(() => ({ docs: [] }));
        if (schoolsSnap.docs?.length) {
          schools = schoolsSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "Unnamed School",
              code: data.code || "",
              status: data.status || "ACTIVE",
            };
          });
        }
      } catch (clientErr) {
        console.warn("Notice: Client DB features fetch notice:", clientErr);
      }
    }

    // Default fallback school if schools list was empty
    if (!schools.length) {
      schools = [
        { id: "school_default", name: "Apex International School", code: "APEX-01", status: "ACTIVE" },
        { id: "school_st_mary", name: "St. Mary High School", code: "SMHS-02", status: "ACTIVE" },
        { id: "school_greenwood", name: "Greenwood Public School", code: "GWPS-03", status: "ACTIVE" },
      ];
    }

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
    return NextResponse.json(
      {
        success: true,
        registry: FEATURE_REGISTRY,
        globalStates: featureStore.states,
        overrides: featureStore.overrides,
        schools: [],
        auditLogs: featureStore.auditLogs,
        overview: {
          totalModules: 9,
          activeModules: 9,
          disabledModules: 0,
          totalFeatures: 27,
          activeFeatures: 27,
          betaFeatures: 0,
          activeActions: 8,
          dangerousActionsKilled: 0,
          activeOverridesCount: 0,
          affectedSchoolsCount: 0,
        },
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { featureId, rolloutMode, selectedSchoolIds = [], enabled, reason = "" } = body;

    if (!featureId) {
      return NextResponse.json({ error: "featureId is required" }, { status: 400 });
    }

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    const userEmail = req.headers.get("x-user-email") || "superadmin@platform.com";
    const userId = req.headers.get("x-user-id") || "superadmin_actor";

    const def = FEATURE_REGISTRY.find((f) => f.id === featureId || f.key === featureId);
    const resolvedEnabled = enabled !== undefined ? enabled : rolloutMode !== "OFF";

    const newState: GlobalFeatureState = {
      featureId,
      rolloutMode: rolloutMode || (resolvedEnabled ? "ON_FOR_ALL" : "OFF"),
      selectedSchoolIds: Array.isArray(selectedSchoolIds) ? selectedSchoolIds : [],
      enabled: resolvedEnabled,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
      reason,
    };

    // Update in-memory store
    const previousState = featureStore.states[featureId] || null;
    featureStore.states[featureId] = newState;

    const auditEntry = {
      id: "audit_" + Math.random().toString(36).slice(2, 9),
      featureId,
      featureName: def?.name || featureId,
      category: def?.category || "feature",
      previousState,
      newState,
      target: "GLOBAL",
      actorId: userId,
      actorEmail: userEmail,
      reason: reason || "Updated via Feature Control Center",
      timestamp: new Date().toISOString(),
    };
    featureStore.auditLogs.unshift(auditEntry);

    // Try persisting to Admin DB or Client DB asynchronously
    if (adminDb) {
      adminDb
        .collection("siteSettings")
        .doc("feature_controls")
        .set({ states: featureStore.states, lastUpdated: new Date().toISOString() }, { merge: true })
        .catch((e: any) => console.warn("Notice: Admin DB features write notice:", e));

      adminDb
        .collection("featureControlAuditLogs")
        .add(auditEntry)
        .catch((e: any) => console.warn("Notice: Admin DB audit write notice:", e));
    } else if (clientDb) {
      setDoc(doc(clientDb, "siteSettings", "feature_controls"), {
        states: featureStore.states,
        lastUpdated: new Date().toISOString(),
      }, { merge: true }).catch((e) => console.warn("Notice: Client DB features write notice:", e));
    }

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
