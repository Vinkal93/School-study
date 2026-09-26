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
    const clientDb = getFirebaseDb();
    let showcases: FeatureShowcase[] = [];

    // Fetch global showcase settings
    let globalSettings = {
      enabled: true,
      landingBannerEnabled: true,
      dashboardModalEnabled: true,
    };

    if (adminDb) {
      try {
        const snap = await adminDb.collection("feature_showcases").get();
        showcases = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
        const setDoc = await adminDb.collection("siteSettings").doc("feature_showcase_settings").get();
        if (setDoc.exists) {
          globalSettings = { ...globalSettings, ...setDoc.data() };
        }
      } catch (e) {}
    } else if (clientDb) {
      try {
        const { getDoc, doc: fDoc } = await import("firebase/firestore");
        const snap = await getDocs(collection(clientDb, "feature_showcases"));
        showcases = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
        const setDoc = await getDoc(fDoc(clientDb, "siteSettings", "feature_showcase_settings"));
        if (setDoc.exists()) {
          globalSettings = { ...globalSettings, ...setDoc.data() };
        }
      } catch (e) {}
    }

    if (showcases.length === 0) {
      showcases = [DEFAULT_AI_SHOWCASE];
    }

    showcases.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return NextResponse.json({ showcases, settings: globalSettings, success: true });
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
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    const now = new Date().toISOString();

    // 1. Action: Update global settings (Master ON/OFF, Landing banner ON/OFF, Modal ON/OFF)
    if (body.action === "update_global_settings" || body.globalSettings) {
      const settingsToSave = {
        ...(body.settings || body.globalSettings || {}),
        updatedAt: now,
        updatedBy: authResult.user.uid,
      };

      if (adminDb) {
        await adminDb.collection("siteSettings").doc("feature_showcase_settings").set(settingsToSave, { merge: true });
      } else if (clientDb) {
        const { setDoc: fSetDoc, doc: fDoc } = await import("firebase/firestore");
        await fSetDoc(fDoc(clientDb, "siteSettings", "feature_showcase_settings"), settingsToSave, { merge: true });
      }

      // If master toggle changed, also cascade to default AI showcase status for total consistency
      if (typeof settingsToSave.enabled === "boolean") {
        const targetStatus = settingsToSave.enabled ? "PUBLISHED" : "PAUSED";
        const cascadeDoc: Partial<FeatureShowcase> = {
          status: targetStatus,
          enabled: settingsToSave.enabled,
          updatedAt: now,
          updatedBy: authResult.user.uid,
        };
        if (adminDb) {
          await adminDb.collection("feature_showcases").doc("showcase_ai_mode").set(cascadeDoc, { merge: true });
        } else if (clientDb) {
          const { setDoc: fSetDoc, doc: fDoc } = await import("firebase/firestore");
          await fSetDoc(fDoc(clientDb, "feature_showcases", "showcase_ai_mode"), cascadeDoc, { merge: true });
        }
      }

      await logAuditEvent({
        actorId: authResult.user.uid,
        actorRole: "super_admin",
        actorEmail: authResult.user.email,
        actorName: authResult.user.name,
        action: "UPDATE" as any,
        entityType: "SETTINGS" as any,
        entityId: "feature_showcase_settings",
        previousState: null,
        newState: settingsToSave as any,
        metadata: { action: "update_global_settings" },
      }).catch(() => {});

      return NextResponse.json({ success: true, settings: settingsToSave });
    }

    // 2. Action: Master toggle all popups & banners
    if (body.action === "toggle_all") {
      const targetEnabled = Boolean(body.enabled);
      const targetStatus = targetEnabled ? "PUBLISHED" : "PAUSED";

      const settingsUpdate = {
        enabled: targetEnabled,
        landingBannerEnabled: targetEnabled,
        dashboardModalEnabled: targetEnabled,
        updatedAt: now,
        updatedBy: authResult.user.uid,
      };

      if (adminDb) {
        await adminDb.collection("siteSettings").doc("feature_showcase_settings").set(settingsUpdate, { merge: true });
        // Update all showcases in database
        const snap = await adminDb.collection("feature_showcases").get();
        if (!snap.empty) {
          const batch = adminDb.batch();
          snap.docs.forEach((d: any) => {
            batch.set(d.ref, { status: targetStatus, enabled: targetEnabled, updatedAt: now }, { merge: true });
          });
          await batch.commit();
        } else {
          await adminDb.collection("feature_showcases").doc("showcase_ai_mode").set({
            ...DEFAULT_AI_SHOWCASE,
            status: targetStatus,
            enabled: targetEnabled,
            updatedAt: now,
            updatedBy: authResult.user.uid,
          }, { merge: true });
        }
      } else if (clientDb) {
        const { setDoc: fSetDoc, doc: fDoc } = await import("firebase/firestore");
        await fSetDoc(fDoc(clientDb, "siteSettings", "feature_showcase_settings"), settingsUpdate, { merge: true });
        await fSetDoc(fDoc(clientDb, "feature_showcases", "showcase_ai_mode"), {
          ...DEFAULT_AI_SHOWCASE,
          status: targetStatus,
          enabled: targetEnabled,
          updatedAt: now,
          updatedBy: authResult.user.uid,
        }, { merge: true });
      }

      return NextResponse.json({ success: true, enabled: targetEnabled, status: targetStatus });
    }

    // 3. Action: Toggle landing banner specifically
    if (body.action === "toggle_landing") {
      const targetEnabled = Boolean(body.enabled);
      const settingsUpdate = {
        landingBannerEnabled: targetEnabled,
        updatedAt: now,
        updatedBy: authResult.user.uid,
      };

      if (adminDb) {
        await adminDb.collection("siteSettings").doc("feature_showcase_settings").set(settingsUpdate, { merge: true });
        await adminDb.collection("feature_showcases").doc("showcase_ai_mode").set({
          showOnLandingPage: targetEnabled,
          status: targetEnabled ? "PUBLISHED" : "PAUSED",
          updatedAt: now,
        }, { merge: true });
      } else if (clientDb) {
        const { setDoc: fSetDoc, doc: fDoc } = await import("firebase/firestore");
        await fSetDoc(fDoc(clientDb, "siteSettings", "feature_showcase_settings"), settingsUpdate, { merge: true });
        await fSetDoc(fDoc(clientDb, "feature_showcases", "showcase_ai_mode"), {
          showOnLandingPage: targetEnabled,
          status: targetEnabled ? "PUBLISHED" : "PAUSED",
          updatedAt: now,
        }, { merge: true });
      }

      return NextResponse.json({ success: true, landingBannerEnabled: targetEnabled });
    }

    // 4. Default: Save or update individual showcase item
    const id = body.id || `showcase_${Date.now()}`;
    const showcaseData: FeatureShowcase = {
      ...DEFAULT_AI_SHOWCASE,
      ...body,
      id,
      updatedAt: now,
      updatedBy: authResult.user.uid,
    };

    if (adminDb) {
      await adminDb.collection("feature_showcases").doc(id).set(showcaseData, { merge: true });
    } else if (clientDb) {
      const { setDoc: fSetDoc, doc: fDoc } = await import("firebase/firestore");
      await fSetDoc(fDoc(clientDb, "feature_showcases", id), showcaseData, { merge: true });
    }

    await logAuditEvent({
      actorId: authResult.user.uid,
      actorRole: "super_admin",
      actorEmail: authResult.user.email,
      actorName: authResult.user.name,
      action: "UPDATE" as any,
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
