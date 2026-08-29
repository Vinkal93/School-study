import { NextResponse } from "next/server";
import {
  getPublicSiteSettings,
  saveSiteSettingsDraft,
  publishSiteSettings,
  getSiteSettingsVersions,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
} from "@/lib/cms/siteSettings";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  let published = DEFAULT_SITE_SETTINGS;
  let versions: any[] = [];
  let draft: SiteSettings | null = null;

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
        draft = { ...DEFAULT_SITE_SETTINGS, ...draftSnap.data() } as SiteSettings;
      }
    }
  } catch (e) {
    draft = null;
  }

  return NextResponse.json({
    published,
    draft: draft || published,
    versions,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, settings, actorId = "super_admin" } = body;

    if (!settings) {
      return NextResponse.json({ error: "settings object is required." }, { status: 400 });
    }

    if (action === "publish") {
      const published = await publishSiteSettings(settings, actorId);
      return NextResponse.json({ success: true, settings: published, message: "Site settings published live." });
    } else {
      const draft = await saveSiteSettingsDraft(settings, actorId);
      return NextResponse.json({ success: true, settings: draft, message: "Draft configuration saved." });
    }
  } catch (error: any) {
    console.error("Super Admin Site Settings POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update site settings." },
      { status: 500 }
    );
  }
}
