import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";
import { SchoolFeatureOverride } from "@/types/featureControl";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const featureId = searchParams.get("featureId");

    const db = getSafeAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    let query: any = db.collection("schoolFeatureOverrides");
    if (schoolId) query = query.where("schoolId", "==", schoolId);
    if (featureId) query = query.where("featureId", "==", featureId);

    const snap = await query.get();
    const overrides: SchoolFeatureOverride[] = snap.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, overrides });
  } catch (err: any) {
    console.error("Overrides GET error:", err);
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
    const { schoolId, featureId, overrideType, limitValue, reason = "" } = body;

    if (!schoolId || !featureId || !overrideType) {
      return NextResponse.json(
        { error: "schoolId, featureId, and overrideType are required" },
        { status: 400 }
      );
    }

    if (!["ALLOW", "DENY", "CUSTOM_LIMIT"].includes(overrideType)) {
      return NextResponse.json(
        { error: "overrideType must be ALLOW, DENY, or CUSTOM_LIMIT" },
        { status: 400 }
      );
    }

    const db = getSafeAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const def = FEATURE_REGISTRY.find((f) => f.id === featureId || f.key === featureId);
    const overrideDocId = `${schoolId}_${featureId.replace(/[:.]/g, "_")}`;
    const docRef = db.collection("schoolFeatureOverrides").doc(overrideDocId);

    const prevSnap = await docRef.get();
    const previousState = prevSnap.exists ? prevSnap.data() : null;

    const overrideData: SchoolFeatureOverride = {
      id: overrideDocId,
      schoolId,
      featureId,
      overrideType,
      limitValue: overrideType === "CUSTOM_LIMIT" ? Number(limitValue) || 0 : undefined,
      reason,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email || user.uid,
    };

    await docRef.set(overrideData);

    // Audit log
    const auditEntry = {
      featureId,
      featureName: def?.name || featureId,
      category: def?.category || "feature",
      previousState,
      newState: overrideData,
      target: schoolId,
      actorId: user.uid,
      actorEmail: user.email || "super_admin",
      reason: reason || `School override set to ${overrideType}`,
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      db.collection("featureControlAuditLogs").add(auditEntry),
      db.collection("superAdminAuditLogs").add({
        action: "SCHOOL_FEATURE_OVERRIDE_SET",
        target: schoolId,
        details: auditEntry,
        performedBy: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      }),
    ]);

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
    const auth = await requireSuperAdmin(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");
    const featureId = searchParams.get("featureId");

    const db = getSafeAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

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

    const docRef = db.collection("schoolFeatureOverrides").doc(docId);
    const prevSnap = await docRef.get();
    const previousState = prevSnap.exists ? prevSnap.data() : null;

    await docRef.delete();

    if (previousState) {
      const auditEntry = {
        featureId: previousState.featureId,
        target: previousState.schoolId,
        category: "override",
        previousState,
        newState: null,
        actorId: user.uid,
        actorEmail: user.email || "super_admin",
        reason: "Override removed; default inheritance restored",
        timestamp: new Date().toISOString(),
      };

      await Promise.all([
        db.collection("featureControlAuditLogs").add(auditEntry),
        db.collection("superAdminAuditLogs").add({
          action: "SCHOOL_FEATURE_OVERRIDE_DELETE",
          target: previousState.schoolId,
          details: auditEntry,
          performedBy: user.uid,
          userEmail: user.email,
          timestamp: new Date().toISOString(),
        }),
      ]);
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
