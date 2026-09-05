import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";
import { SchoolFeatureOverride } from "@/types/featureControl";

const featureStore = (globalThis as any).__SCHOOL_STUDY_FEATURE_STORE__ || {
  states: {},
  overrides: [] as SchoolFeatureOverride[],
  auditLogs: [],
};
(globalThis as any).__SCHOOL_STUDY_FEATURE_STORE__ = featureStore;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const featureId = searchParams.get("featureId");

    let overrides: SchoolFeatureOverride[] = [...featureStore.overrides];
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();

    if (adminDb) {
      try {
        let query: any = adminDb.collection("schoolFeatureOverrides");
        if (schoolId) query = query.where("schoolId", "==", schoolId);
        if (featureId) query = query.where("featureId", "==", featureId);
        const snap = await query.get();
        if (snap.docs?.length) {
          overrides = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          featureStore.overrides = overrides;
        }
      } catch (err) {
        console.warn("Notice: Admin DB overrides fetch notice:", err);
      }
    } else if (clientDb) {
      try {
        const snap = await getDocs(collection(clientDb, "schoolFeatureOverrides")).catch(() => ({ docs: [] }));
        if (snap.docs?.length) {
          overrides = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          featureStore.overrides = overrides;
        }
      } catch (err) {
        console.warn("Notice: Client DB overrides fetch notice:", err);
      }
    }

    return NextResponse.json({ success: true, overrides });
  } catch (err: any) {
    console.error("Overrides GET error:", err);
    return NextResponse.json({ success: true, overrides: featureStore.overrides });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, featureId, overrideType, limitValue, reason = "" } = body;

    if (!schoolId || !featureId || !overrideType) {
      return NextResponse.json(
        { error: "schoolId, featureId, and overrideType are required" },
        { status: 400 }
      );
    }

    const def = FEATURE_REGISTRY.find((f) => f.id === featureId || f.key === featureId);
    const overrideDocId = `${schoolId}_${featureId.replace(/[:.]/g, "_")}`;
    const userEmail = req.headers.get("x-user-email") || "superadmin@platform.com";
    const userId = req.headers.get("x-user-id") || "superadmin_actor";

    const overrideData: SchoolFeatureOverride = {
      id: overrideDocId,
      schoolId,
      featureId,
      overrideType,
      limitValue: overrideType === "CUSTOM_LIMIT" ? Number(limitValue) || 0 : undefined,
      reason,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    };

    // Update in-memory store
    const existingIdx = featureStore.overrides.findIndex(
      (o: any) => o.schoolId === schoolId && o.featureId === featureId
    );
    if (existingIdx >= 0) {
      featureStore.overrides[existingIdx] = overrideData;
    } else {
      featureStore.overrides.push(overrideData);
    }

    const auditEntry = {
      id: "audit_" + Math.random().toString(36).slice(2, 9),
      featureId,
      featureName: def?.name || featureId,
      category: def?.category || "feature",
      previousState: existingIdx >= 0 ? featureStore.overrides[existingIdx] : null,
      newState: overrideData,
      target: schoolId,
      actorId: userId,
      actorEmail: userEmail,
      reason: reason || `School override set to ${overrideType}`,
      timestamp: new Date().toISOString(),
    };
    featureStore.auditLogs.unshift(auditEntry);

    // Try persisting
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    if (adminDb) {
      adminDb.collection("schoolFeatureOverrides").doc(overrideDocId).set(overrideData).catch((e: any) => console.warn(e));
      adminDb.collection("featureControlAuditLogs").add(auditEntry).catch((e: any) => console.warn(e));
    } else if (clientDb) {
      setDoc(doc(clientDb, "schoolFeatureOverrides", overrideDocId), overrideData, { merge: true }).catch((e) => console.warn(e));
    }

    return NextResponse.json({
      success: true,
      message: `Override for school '${schoolId}' set to ${overrideType}.`,
      override: overrideData,
    });
  } catch (err: any) {
    console.error("Overrides POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");
    const featureId = searchParams.get("featureId");

    let docId = id;
    if (!docId && schoolId && featureId) {
      docId = `${schoolId}_${featureId.replace(/[:.]/g, "_")}`;
    }

    if (!docId) {
      return NextResponse.json(
        { error: "Provide either override 'id' or 'schoolId' and 'featureId'" },
        { status: 400 }
      );
    }

    // Remove from in-memory
    featureStore.overrides = featureStore.overrides.filter((o: any) => o.id !== docId && `${o.schoolId}_${o.featureId?.replace(/[:.]/g, "_")}` !== docId);

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    if (adminDb) {
      adminDb.collection("schoolFeatureOverrides").doc(docId).delete().catch((e: any) => console.warn(e));
    } else if (clientDb) {
      deleteDoc(doc(clientDb, "schoolFeatureOverrides", docId)).catch((e) => console.warn(e));
    }

    return NextResponse.json({
      success: true,
      message: "Override removed successfully; default inheritance restored.",
    });
  } catch (err: any) {
    console.error("Overrides DELETE error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
