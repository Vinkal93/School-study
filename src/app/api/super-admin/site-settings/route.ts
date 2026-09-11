import { NextResponse } from "next/server";
import {
  getPublicSiteSettings,
  saveSiteSettingsDraft,
  publishSiteSettings,
  getSiteSettingsVersions,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  sanitizeSiteSettings,
} from "@/lib/cms/siteSettings";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { updatePortalUIVersion } from "@/lib/services/portal-ui.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Enforce Super Admin authentication to view drafts and historical versions
  const auth = await requireSuperAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  let published = DEFAULT_SITE_SETTINGS;
  let versions: SiteSettings[] = [];
  let draft: SiteSettings | null = null;

  // 1. Try Firebase Admin on server if available
  try {
    if (typeof window === "undefined") {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const pubSnap = await adminDb.collection("siteSettings").doc("global").get();
        if (pubSnap.exists) {
          published = sanitizeSiteSettings(pubSnap.data() as Partial<SiteSettings>);
        }

        const draftSnap = await adminDb.collection("siteSettings").doc("draft").get();
        if (draftSnap.exists) {
          draft = sanitizeSiteSettings(draftSnap.data() as Partial<SiteSettings>);
        }

        const versSnap = await adminDb.collection("siteSettingsVersions").get();
        versions = versSnap.docs.map((d) => sanitizeSiteSettings(d.data() as Partial<SiteSettings>));
        versions.sort((a, b) => (b.version || 0) - (a.version || 0));

        return NextResponse.json({
          success: true,
          published,
          draft: draft || published,
          versions,
        });
      }
    }
  } catch (adminErr) {
    // Fallback to client SDK
  }

  try {
    published = await getPublicSiteSettings();
  } catch (e) {
    published = DEFAULT_SITE_SETTINGS;
  }

  try {
    versions = await getSiteSettingsVersions();
  } catch (e) {
    versions = [];
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      const draftSnap = await getDoc(doc(db, "siteSettings", "draft"));
      if (draftSnap.exists()) {
        draft = sanitizeSiteSettings(draftSnap.data() as Partial<SiteSettings>);
      }
    }
  } catch (e) {
    draft = null;
  }

  return NextResponse.json({
    success: true,
    published,
    draft: draft || published,
    versions,
  });
}

export async function POST(request: Request) {
  // Enforce Super Admin authentication
  const auth = await requireSuperAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  const actorUid = auth.user!.uid;
  const actorEmail = auth.user!.email || actorUid;

  try {
    const body = await request.json();
    const { action, settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings object is required." }, { status: 400 });
    }

    const sanitizedSettings = sanitizeSiteSettings(settings);

    // Synchronize Landing Page version if provided
    if (sanitizedSettings.landing?.landingVersion) {
      try {
        const portalVersion =
          sanitizedSettings.landing.landingVersion === "liquid_glass"
            ? "liquid_glass"
            : sanitizedSettings.landing.landingVersion === "modern"
            ? "new"
            : "classic";
        await updatePortalUIVersion(
          "landingPage",
          portalVersion,
          { uid: actorUid, name: actorEmail }
        );
      } catch (uiErr) {
        console.warn("Notice: Portal UI sync warning:", uiErr);
      }
    }

    if (action === "publish") {
      const published = await publishSiteSettings(sanitizedSettings, actorEmail);
      return NextResponse.json({
        success: true,
        settings: published,
        message: `Version ${published.version} published live successfully!`,
      });
    } else {
      const draft = await saveSiteSettingsDraft(sanitizedSettings, actorEmail);
      return NextResponse.json({
        success: true,
        settings: draft,
        message: "Draft configuration saved successfully.",
      });
    }
  } catch (error: any) {
    console.error("Super Admin Site Settings POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update site settings." },
      { status: 500 }
    );
  }
}
