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

  // 1. Try Firebase Admin on server
  try {
    if (typeof window === "undefined") {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const pubSnap = await adminDb.collection("siteSettings").doc("global").get();
        if (pubSnap.exists) {
          const data = pubSnap.data() as SiteSettings;
          published = {
            ...DEFAULT_SITE_SETTINGS,
            ...data,
            header: {
              ...DEFAULT_SITE_SETTINGS.header,
              ...(data.header || {}),
              navigation: data.header?.navigation || DEFAULT_SITE_SETTINGS.header.navigation,
            },
            footer: {
              ...DEFAULT_SITE_SETTINGS.footer,
              ...(data.footer || {}),
              columns: data.footer?.columns || DEFAULT_SITE_SETTINGS.footer.columns,
            },
          };
        }

        const draftSnap = await adminDb.collection("siteSettings").doc("draft").get();
        if (draftSnap.exists) {
          const dData = draftSnap.data() as SiteSettings;
          draft = {
            ...DEFAULT_SITE_SETTINGS,
            ...dData,
            header: {
              ...DEFAULT_SITE_SETTINGS.header,
              ...(dData.header || {}),
              navigation: dData.header?.navigation || DEFAULT_SITE_SETTINGS.header.navigation,
            },
            footer: {
              ...DEFAULT_SITE_SETTINGS.footer,
              ...(dData.footer || {}),
              columns: dData.footer?.columns || DEFAULT_SITE_SETTINGS.footer.columns,
            },
          };
        }

        const versSnap = await adminDb.collection("siteSettingsVersions").get();
        versions = versSnap.docs.map((d) => d.data() as SiteSettings);
        versions.sort((a, b) => (b.version || 0) - (a.version || 0));

        return NextResponse.json({
          published,
          draft: draft || published,
          versions,
        });
      }
    }
  } catch (adminErr) {
    // Non-blocking fallback
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
    console.warn("Super Admin Site Settings POST notice:", error?.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update site settings on server." },
      { status: 200 }
    );
  }
}
