import { NextRequest, NextResponse } from "next/server";
import {
  getGlobalCommunicationSettings,
  updateGlobalCommunicationSettings,
  getAllPlatformCommunicationLogs,
  validateTwilioConnection,
  validateWhatsAppSender,
  validateSmsSender,
  DEFAULT_COMMUNICATION_TEMPLATES,
  DEFAULT_COMMUNICATION_SETTINGS,
} from "@/lib/services/communication.service";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    let settings = DEFAULT_COMMUNICATION_SETTINGS;
    try {
      settings = await getGlobalCommunicationSettings(true);
    } catch (sErr) {
      console.warn("[API:super-admin:communication] Warning loading settings, using defaults:", sErr);
    }

    let platformLogs: any[] = [];
    try {
      platformLogs = await getAllPlatformCommunicationLogs(100);
    } catch (lErr) {
      console.warn("[API:super-admin:communication] Warning loading platform logs:", lErr);
    }

    // Fetch all schools for the Super Admin overview table
    let schools: any[] = [];
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      try {
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
      } catch (dbErr) {
        console.warn("[API:super-admin:communication] AdminDb schools fetch warning:", dbErr);
      }
    }

    // Correlate school-wise communication access & logs count safely
    const schoolStats = schools.map((s) => {
      const planSlug = s.planSlug || "free";
      const planAccessMap = settings?.planAccess || DEFAULT_COMMUNICATION_SETTINGS.planAccess;
      const planChannels = planAccessMap[planSlug] || planAccessMap.free || DEFAULT_COMMUNICATION_SETTINGS.planAccess.free;

      const override = settings?.schoolOverrides?.[s.id];
      const isOverridden = Boolean(override && typeof override.enabled === "boolean");
      const overrideEnabled = override?.enabled ?? true;

      const channelsConfig = settings?.channels || DEFAULT_COMMUNICATION_SETTINGS.channels;
      const canWhatsApp = channelsConfig.whatsapp && (override?.channels?.whatsapp ?? (planChannels.whatsapp && overrideEnabled));
      const canEmail = channelsConfig.email && (override?.channels?.email ?? (planChannels.email && overrideEnabled));
      const canInApp = channelsConfig.in_app;
      const canAutomate = channelsConfig.automation && (override?.channels?.automation ?? (planChannels.automation && overrideEnabled));

      const schoolLogs = platformLogs.filter((l) => l.schoolId === s.id);
      const sentCount = schoolLogs.filter((l) => l.status === "sent" || l.status === "delivered").length;
      const failedCount = schoolLogs.filter((l) => l.status === "failed").length;

      return {
        ...s,
        canWhatsApp: Boolean(settings?.masterEnabled && canWhatsApp),
        canEmail: Boolean(settings?.masterEnabled && canEmail),
        canInApp: Boolean(settings?.masterEnabled && canInApp),
        canAutomate: Boolean(settings?.masterEnabled && canAutomate),
        isOverridden,
        overrideEnabled,
        sentCount,
        failedCount,
        totalLogs: schoolLogs.length,
      };
    });

    const isTwilioSet = Boolean(settings?.twilio?.isConfigured && settings?.twilio?.accountSid);
    const isEmailSet = Boolean(settings?.email?.isConfigured && settings?.email?.provider !== "none");

    return NextResponse.json({
      success: true,
      settings: settings || DEFAULT_COMMUNICATION_SETTINGS,
      status: {
        twilio: isTwilioSet ? "CONFIGURED" : "NOT_CONFIGURED",
        email: isEmailSet ? "CONFIGURED" : "NOT_CONFIGURED",
        inApp: "AVAILABLE",
      },
      schools: schoolStats,
      recentLogs: platformLogs,
      templates: DEFAULT_COMMUNICATION_TEMPLATES,
    });
  } catch (err: any) {
    console.error("[API:super-admin:communication] GET Error:", err);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_COMMUNICATION_SETTINGS,
      status: {
        twilio: "NOT_CONFIGURED",
        email: "NOT_CONFIGURED",
        inApp: "AVAILABLE",
      },
      schools: [],
      recentLogs: [],
      templates: DEFAULT_COMMUNICATION_TEMPLATES,
      warning: err.message || "Failed to load dynamic communication settings",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const adminUser = {
      uid: authResult.user?.uid || "super_admin",
      email: authResult.user?.email || "superadmin@schoolstudy.com",
      name: authResult.user?.name || "Super Admin",
    };

    const body = await req.json().catch(() => ({}));
    const { action, settingsUpdate, schoolId, overrideData, credentials } = body;

    // ACTION: TEST TWILIO CONNECTION
    if (action === "test_twilio" || action === "test_connection") {
      const testResult = await validateTwilioConnection({
        accountSid: credentials?.accountSid || "",
        authToken: credentials?.authToken || "",
        fromNumber: credentials?.fromNumber,
        smsFromNumber: credentials?.smsFromNumber,
      });

      return NextResponse.json(testResult, { status: testResult.statusCode });
    }

    // ACTION: EXPLICIT REMOVAL OF TWILIO CREDENTIALS
    if (action === "remove_twilio_credentials" || action === "remove_twilio") {
      await updateGlobalCommunicationSettings({ action: "remove_twilio_credentials" }, adminUser);
      return NextResponse.json({ success: true, message: "Twilio credentials successfully removed." });
    }

    // ACTION: SCHOOL MANUAL OVERRIDE
    if (action === "override_school") {
      if (!schoolId || typeof schoolId !== "string") {
        return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
      }

      const current = await getGlobalCommunicationSettings(false);
      const updatedOverrides = {
        ...(current.schoolOverrides || {}),
        [schoolId]: {
          ...(current.schoolOverrides?.[schoolId] || {}),
          ...overrideData,
          updatedAt: new Date().toISOString(),
          updatedBy: adminUser.email,
        },
      };

      await updateGlobalCommunicationSettings(
        { schoolOverrides: updatedOverrides },
        adminUser
      );

      return NextResponse.json({ success: true, message: "School override updated" });
    }

    // ACTION: SAVE GLOBAL SETTINGS
    if (settingsUpdate) {
      // Validate twilio parameters if provided
      if (settingsUpdate.twilio) {
        const { accountSid, fromNumber, smsFromNumber } = settingsUpdate.twilio;
        if (accountSid && typeof accountSid === "string" && accountSid.trim()) {
          if (!accountSid.trim().startsWith("AC") || accountSid.trim().length < 30) {
            return NextResponse.json({
              success: false,
              error: "Invalid Twilio Account SID format. Must start with AC and be 34 characters long.",
            }, { status: 400 });
          }
        }

        if (fromNumber && typeof fromNumber === "string" && fromNumber.trim()) {
          const senderVal = validateWhatsAppSender(fromNumber);
          if (!senderVal.isValid) {
            return NextResponse.json({
              success: false,
              error: senderVal.error || "Invalid WhatsApp sender format.",
            }, { status: 400 });
          }
        }

        if (smsFromNumber && typeof smsFromNumber === "string" && smsFromNumber.trim()) {
          const smsVal = validateSmsSender(smsFromNumber);
          if (!smsVal.isValid) {
            return NextResponse.json({
              success: false,
              error: smsVal.error || "Invalid SMS sender format.",
            }, { status: 400 });
          }
        }
      }

      await updateGlobalCommunicationSettings(settingsUpdate, adminUser);
      return NextResponse.json({ success: true, message: "Global communication settings saved" });
    }

    return NextResponse.json({ success: false, error: "Invalid action or payload" }, { status: 400 });
  } catch (err: any) {
    console.error("[API:super-admin:communication] POST Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process communication action" },
      { status: 500 }
    );
  }
}
