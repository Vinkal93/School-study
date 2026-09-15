import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import type { FeatureShowcase, FeatureShowcaseView } from "@/types/ai";
import { DEFAULT_AI_SHOWCASE } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const context = searchParams.get("context") || "landing"; // "landing" | "dashboard"
    const portal = searchParams.get("portal") || "";

    const authResult = await authenticateRequest(req);
    const user = authResult.isAuthenticated ? authResult.user : null;

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    let showcases: FeatureShowcase[] = [];

    // Check if showcase feature is disabled platform-wide
    let globalShowcaseEnabled = true;
    try {
      if (adminDb) {
        const setDoc = await adminDb.collection("siteSettings").doc("feature_showcase_settings").get();
        if (setDoc.exists && setDoc.data()?.enabled === false) {
          globalShowcaseEnabled = false;
        }
      }
    } catch {}

    if (!globalShowcaseEnabled) {
      return NextResponse.json({ activeShowcase: null });
    }

    if (adminDb) {
      const snap = await adminDb
        .collection("feature_showcases")
        .where("status", "==", "PUBLISHED")
        .get();
      showcases = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
    } else if (clientDb) {
      try {
        const snap = await getDocs(query(collection(clientDb, "feature_showcases"), where("status", "==", "PUBLISHED")));
        showcases = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeatureShowcase[];
      } catch {}
    }

    if (showcases.length === 0) {
      showcases = [DEFAULT_AI_SHOWCASE];
    }

    // Filter by context, enabled flag, and target portal
    showcases = showcases.filter((s) => {
      if (s.enabled === false || s.status === "PAUSED" || s.status === "ARCHIVED") return false;
      if (context === "landing" && !s.showOnLandingPage) return false;
      if (context === "dashboard" && !s.showOnDashboard) return false;
      if (portal && s.targetPortals && s.targetPortals.length > 0 && !s.targetPortals.includes(portal as any)) {
        return false;
      }
      return true;
    });

    if (showcases.length === 0) {
      return NextResponse.json({ activeShowcase: null });
    }

    // Sort by priority
    showcases.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const selected = showcases[0];

    // If authenticated user, check if already dismissed
    if (user && adminDb) {
      const viewDocId = `${user.uid}_${selected.id}_${selected.version}`;
      const viewSnap = await adminDb.collection("feature_showcase_views").doc(viewDocId).get();
      if (viewSnap.exists) {
        const viewData = viewSnap.data() as FeatureShowcaseView;
        if (selected.frequency === "ONCE" || selected.frequency === "UNTIL_DISMISSED") {
          if (viewData.dismissedAt) {
            return NextResponse.json({ activeShowcase: null });
          }
        }
      }
    }

    return NextResponse.json({ activeShowcase: selected });
  } catch (error: any) {
    console.error("[API: Active Feature Showcase GET]", error);
    return NextResponse.json(
      { error: "Failed to retrieve active showcase", details: error.message },
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

    const { user } = authResult;
    const body = await req.json().catch(() => ({}));
    const { showcaseId, featureKey, version, action } = body; // action: "dismiss" | "click"

    if (!showcaseId) {
      return NextResponse.json({ error: "showcaseId is required." }, { status: 400 });
    }

    const docId = `${user.uid}_${showcaseId}_${version || "1.0"}`;
    const now = new Date().toISOString();
    const updateData: Partial<FeatureShowcaseView> = {
      userId: user.uid,
      showcaseId,
      featureKey: featureKey || "ai_mode",
      version: version || "1.0",
      seenAt: now,
    };

    if (action === "dismiss") {
      updateData.dismissedAt = now;
    } else if (action === "click") {
      updateData.clickedCtaAt = now;
    }

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb.collection("feature_showcase_views").doc(docId).set(updateData, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API: Active Feature Showcase POST]", error);
    return NextResponse.json(
      { error: "Failed to update showcase view", details: error.message },
      { status: 500 }
    );
  }
}
