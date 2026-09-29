import { NextRequest, NextResponse } from "next/server";
import {
  getGlobalCommunicationSettings,
  updateGlobalCommunicationSettings,
  getAllPlatformCommunicationLogs,
  DEFAULT_COMMUNICATION_TEMPLATES,
  DEFAULT_COMMUNICATION_SETTINGS,
} from "@/lib/services/communication.service";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

/**
 * Validates WhatsApp sender phone number format
 * Accepts E.164 formatted WhatsApp numbers: whatsapp:+[1-9][0-9]{7,14}
 */
function validateWhatsAppSender(sender: string): {
  isValid: boolean;
  formatted: string;
  isSandbox: boolean;
  error?: string;
} {
  if (!sender || typeof sender !== "string") {
    return { isValid: false, formatted: "", isSandbox: false, error: "Sender number is required" };
  }

  const trimmed = sender.trim();
  const normalized = trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
  const phonePart = normalized.replace(/^whatsapp:/, "");

  // Must follow E.164: + followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(phonePart)) {
    return {
      isValid: false,
      formatted: normalized,
      isSandbox: false,
      error: `Invalid WhatsApp sender format "${sender}". Must be formatted as whatsapp:+[country_code][number] (e.g. whatsapp:+14155238886).`,
    };
  }

  const isSandbox = phonePart === "+14155238886";

  return {
    isValid: true,
    formatted: normalized,
    isSandbox,
  };
}

export async function GET(req: NextRequest) {
  try {
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

    // Fetch all schools for the Super Admin overview table (with resilient fallback)
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
    } else {
      const db = getFirebaseDb();
      if (db) {
        try {
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
        } catch (clientDbErr) {
          console.warn("[API:super-admin:communication] ClientDb schools fetch warning:", clientDbErr);
        }
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

      // Calculate messages from logs for this school
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
    // Never return 500: Return safe default state with 200 OK
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
    const body = await req.json().catch(() => ({}));
    const { action, settingsUpdate, schoolId, overrideData, adminUser, credentials } = body;

    // ACTION: TEST TWILIO CONNECTION
    if (action === "test_twilio" || action === "test_connection") {
      let accountSid = credentials?.accountSid?.trim() || "";
      let authToken = credentials?.authToken?.trim() || "";
      let fromNumber = credentials?.fromNumber?.trim() || "";

      // If not provided in body, load from authoritative server secrets
      if (!accountSid || !authToken || authToken.includes("••••")) {
        const adminDb = getSafeAdminDb();
        if (adminDb) {
          const secSnap = await adminDb.collection("siteSettings").doc("communication_secrets").get();
          if (secSnap.exists) {
            const data = secSnap.data() || {};
            accountSid = accountSid || data.twilioAccountSid || "";
            authToken = (!authToken || authToken.includes("••••")) ? data.twilioAuthToken || "" : authToken;
            fromNumber = fromNumber || data.twilioFromNumber || "";
          }
        } else {
          const db = getFirebaseDb();
          if (db) {
            try {
              const secSnap = await getDoc(doc(db, "siteSettings", "communication_secrets"));
              if (secSnap.exists()) {
                const data = secSnap.data() || {};
                accountSid = accountSid || data.twilioAccountSid || "";
                authToken = (!authToken || authToken.includes("••••")) ? data.twilioAuthToken || "" : authToken;
                fromNumber = fromNumber || data.twilioFromNumber || "";
              }
            } catch {}
          }
        }
      }

      // Check for missing credentials
      if (!accountSid) {
        return NextResponse.json({
          success: false,
          errorCode: "MISSING_ACCOUNT_SID",
          message: "✕ Connection Failed: Twilio Account SID is missing.",
          provider: "twilio",
          details: "Please provide a valid Twilio Account SID (e.g. ACxxxxxxxx...)",
        }, { status: 400 });
      }

      if (!authToken || authToken.includes("••••")) {
        return NextResponse.json({
          success: false,
          errorCode: "MISSING_AUTH_TOKEN",
          message: "✕ Connection Failed: Twilio Auth Token is not set.",
          provider: "twilio",
          details: "Please enter your Twilio Auth Token to authenticate the connection.",
        }, { status: 400 });
      }

      if (!accountSid.startsWith("AC") || accountSid.length < 30) {
        return NextResponse.json({
          success: false,
          errorCode: "INVALID_ACCOUNT_SID_FORMAT",
          message: "✕ Connection Failed: Invalid Twilio Account SID format.",
          provider: "twilio",
          details: "Twilio Account SID must start with 'AC' and be 34 characters long.",
        }, { status: 400 });
      }

      // Validate WhatsApp sender
      const senderValidation = validateWhatsAppSender(fromNumber || "whatsapp:+14155238886");
      if (!senderValidation.isValid) {
        return NextResponse.json({
          success: false,
          errorCode: "INVALID_SENDER_FORMAT",
          message: `✕ Sender Validation Failed: ${senderValidation.error}`,
          provider: "twilio",
          details: senderValidation.error,
        }, { status: 400 });
      }

      // Test Twilio Authentication against Twilio Accounts API
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

        const twilioRes = await fetch(twilioUrl, {
          method: "GET",
          headers: {
            Authorization: `Basic ${authHeader}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const twilioData = await twilioRes.json().catch(() => ({}));

        if (!twilioRes.ok) {
          const twilioCode = twilioData.code || twilioRes.status;
          const twilioMsg = twilioData.message || "Authentication failed.";
          return NextResponse.json({
            success: false,
            errorCode: "AUTHENTICATION_FAILED",
            message: `✕ Twilio Connection Failed: ${twilioMsg} (Code ${twilioCode})`,
            provider: "twilio",
            details: `Twilio API returned HTTP ${twilioRes.status}. Verify Account SID & Auth Token.`,
          }, { status: 200 }); // Return 200 with success: false for clean client parsing
        }

        if (twilioData.status === "suspended") {
          return NextResponse.json({
            success: false,
            errorCode: "ACCOUNT_SUSPENDED",
            message: "✕ Twilio Account Suspended: Check your Twilio Console billing status.",
            provider: "twilio",
            details: "Account status is 'suspended'.",
          }, { status: 200 });
        }

        // Success!
        return NextResponse.json({
          success: true,
          errorCode: null,
          message: "✓ Twilio Connected • WhatsApp Sender Ready",
          provider: "twilio",
          details: {
            accountSid: `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}`,
            accountName: twilioData.friendly_name || "Twilio Account",
            accountStatus: twilioData.status || "active",
            accountType: twilioData.type || "Full",
            sender: senderValidation.formatted,
            senderType: senderValidation.isSandbox ? "Twilio WhatsApp Sandbox" : "Registered Business Sender",
          },
        });
      } catch (networkErr: any) {
        return NextResponse.json({
          success: false,
          errorCode: "NETWORK_ERROR",
          message: `✕ Network Error: Unable to reach Twilio API (${networkErr.message})`,
          provider: "twilio",
          details: networkErr.message,
        }, { status: 200 });
      }
    }

    // ACTION: SCHOOL MANUAL OVERRIDE
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

    // ACTION: SAVE GLOBAL SETTINGS
    if (settingsUpdate) {
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
