import { NextRequest, NextResponse } from "next/server";
import {
  getGlobalCommunicationSettings,
  updateGlobalCommunicationSettings,
  getAllPlatformCommunicationLogs,
  DEFAULT_COMMUNICATION_TEMPLATES,
} from "@/lib/services/communication.service";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    const [settings, platformLogs] = await Promise.all([
      getGlobalCommunicationSettings(true),
      getAllPlatformCommunicationLogs(100),
    ]);

    // Fetch all schools for the Super Admin overview table
    let schools: any[] = [];
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("schools").get();
      schools = snap.docs.map((d: any) => ({
        id: d.id,
        name: d.data().name || "School",
        code: d.data().code || "",
        planSlug: (d.data().planSlug || d.data().planId || "free").toLowerCase().replace(/^plan_/, ""),
        planName: d.data().planName || "Free Plan",
        studentCount: d.data().studentCount || 0,
        status: d.data().status || "active",
      }));
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDocs(collection(db, "schools"));
        schools = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "School",
          code: d.data().code || "",
          planSlug: (d.data().planSlug || d.data().planId || "free").toLowerCase().replace(/^plan_/, ""),
          planName: d.data().planName || "Free Plan",
          studentCount: d.data().studentCount || 0,
          status: d.data().status || "active",
        }));
      }
    }

    // Correlate school-wise communication access & logs count
    const schoolStats = schools.map((s) => {
      const planSlug = s.planSlug || "free";
      const planChannels = settings.planAccess[planSlug] || settings.planAccess.free || {
        whatsapp: false,
        email: false,
        in_app: true,
        automation: false,
      };

      const override = settings.schoolOverrides?.[s.id];
      const isOverridden = Boolean(override && typeof override.enabled === "boolean");
      const overrideEnabled = override?.enabled ?? true;

      const canWhatsApp = settings.channels.whatsapp && (override?.channels?.whatsapp ?? (planChannels.whatsapp && overrideEnabled));
      const canEmail = settings.channels.email && (override?.channels?.email ?? (planChannels.email && overrideEnabled));
      const canInApp = settings.channels.in_app;
      const canAutomate = settings.channels.automation && (override?.channels?.automation ?? (planChannels.automation && overrideEnabled));

      // Calculate messages from logs for this school
      const schoolLogs = platformLogs.filter((l) => l.schoolId === s.id);
      const sentCount = schoolLogs.filter((l) => l.status === "sent" || l.status === "delivered").length;
      const failedCount = schoolLogs.filter((l) => l.status === "failed").length;

      return {
        ...s,
        canWhatsApp: settings.masterEnabled && canWhatsApp,
        canEmail: settings.masterEnabled && canEmail,
        canInApp: settings.masterEnabled && canInApp,
        canAutomate: settings.masterEnabled && canAutomate,
        isOverridden,
        overrideEnabled,
        sentCount,
        failedCount,
        totalLogs: schoolLogs.length,
      };
    });

    return NextResponse.json({
      success: true,
      settings,
      schools: schoolStats,
      recentLogs: platformLogs,
      templates: DEFAULT_COMMUNICATION_TEMPLATES,
    });
  } catch (err: any) {
    console.error("[API:super-admin:communication] GET Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load communication controls" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, settingsUpdate, schoolId, overrideData, adminUser } = body;

    if (action === "override_school" && schoolId) {
      const current = await getGlobalCommunicationSettings(false);
      const updatedOverrides = {
        ...(current.schoolOverrides || {}),
        [schoolId]: {
          ...(current.schoolOverrides?.[schoolId] || {}),
          ...overrideData,
          updatedAt: new Date().toISOString(),
          updatedBy: adminUser?.email || "Super Admin",
        },
      };

      await updateGlobalCommunicationSettings(
        { schoolOverrides: updatedOverrides },
        adminUser
      );

      return NextResponse.json({ success: true, message: "School override updated" });
    }

    // General settings update (Master switches, plan access, or provider credentials)
    if (settingsUpdate) {
      await updateGlobalCommunicationSettings(settingsUpdate, adminUser);
      return NextResponse.json({ success: true, message: "Global communication settings saved" });
    }

    return NextResponse.json({ success: false, error: "Invalid action or payload" }, { status: 400 });
  } catch (err: any) {
    console.error("[API:super-admin:communication] POST Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update communication controls" },
      { status: 500 }
    );
  }
}
