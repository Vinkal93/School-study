import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import type { FeatureShowcase } from "@/types/ai";
import { DEFAULT_AI_SHOWCASE } from "@/types/ai";
import { logAuditEvent } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

export { DEFAULT_AI_SHOWCASE };

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Super Admin privileges required." }, { status: 403 });
    }

    const adminDb = getSafeAdminDb();
    let showcases: FeatureShowcase[] = [];

    if (adminDb) {
      const snap = await adminDb.collection("feature_showcases").get();
      showcases = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const snap = await getDocs(collection(clientDb, "feature_showcases"));
        showcases = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
      }
    }

    if (showcases.length === 0) {
      showcases = [DEFAULT_AI_SHOWCASE];
    }

    showcases.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return NextResponse.json({ showcases });
  } catch (error: any) {
    console.error("[API: Super Admin Feature Showcase GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch showcases", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Super Admin privileges required." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = body.id || `showcase_${Date.now()}`;
    const now = new Date().toISOString();

    const showcaseData: FeatureShowcase = {
      ...DEFAULT_AI_SHOWCASE,
      ...body,
      id,
      updatedAt: now,
      updatedBy: authResult.user.uid,
    };

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb.collection("feature_showcases").doc(id).set(showcaseData, { merge: true });
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        await setDoc(doc(clientDb, "feature_showcases", id), showcaseData, { merge: true });
      }
    }

    await logAuditEvent({
      actorId: authResult.user.uid,
      actorRole: "super_admin",
      actorEmail: authResult.user.email,
      actorName: authResult.user.name,
      action: "CREATE" as any,
      entityType: "SETTINGS" as any,
      entityId: id,
      previousState: null,
      newState: showcaseData as any,
      metadata: { title: showcaseData.title, status: showcaseData.status },
    }).catch(() => {});

    return NextResponse.json({ showcase: showcaseData, success: true });
  } catch (error: any) {
    console.error("[API: Super Admin Feature Showcase POST]", error);
    return NextResponse.json(
      { error: "Failed to save showcase", details: error.message },
      { status: 500 }
    );
  }
}
