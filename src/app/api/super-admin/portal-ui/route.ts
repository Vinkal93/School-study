import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  getPortalUISettings,
  updatePortalUIVersion,
  resetAllPortalsToClassic,
} from "@/lib/services/portal-ui.service";
import { PortalKey, PortalUIVersion } from "@/types/portal-ui";
import { createBillingAuditLog } from "@/lib/billing/audit";

const VALID_PORTAL_KEYS: PortalKey[] = ["schoolAdmin", "teacher", "student", "superAdmin", "landingPage"];
const VALID_VERSIONS: PortalUIVersion[] = ["classic", "new"];

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const settings = await getPortalUISettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET /api/super-admin/portal-ui error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch portal UI settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  const actorUid = auth.user!.uid;
  const actorEmail = auth.user!.email || actorUid;

  try {
    const body = await request.json();
    const { action, portal, version } = body;

    // 1. Emergency Reset All
    if (action === "resetAll") {
      await resetAllPortalsToClassic({ uid: actorUid, name: actorEmail });

      await createBillingAuditLog(
        actorUid,
        "super_admin",
        "MANUAL_ACCESS_CHANGE",
        "accessPolicy",
        "portalUI_all",
        {
          actionType: "PORTAL_UI_EMERGENCY_RESET_ALL_TO_CLASSIC",
          timestamp: new Date().toISOString(),
        }
      ).catch(() => {});

      const updatedSettings = await getPortalUISettings();
      return NextResponse.json({
        success: true,
        message: "All portals successfully reverted to Classic UI.",
        settings: updatedSettings,
      });
    }

    // 2. Single Portal Version Update
    if (!portal || !VALID_PORTAL_KEYS.includes(portal)) {
      return NextResponse.json(
        { error: `Invalid portal key. Allowed: ${VALID_PORTAL_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedVersion: PortalUIVersion =
      version === "modern" || version === "new" ? "new" : "classic";

    if (!VALID_VERSIONS.includes(normalizedVersion)) {
      return NextResponse.json(
        { error: `Invalid version. Allowed: ${VALID_VERSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const currentSettings = await getPortalUISettings();
    const previousVersion = currentSettings[portal as PortalKey] || "classic";

    await updatePortalUIVersion(
      portal as PortalKey,
      normalizedVersion,
      { uid: actorUid, name: actorEmail }
    );

    await createBillingAuditLog(
      actorUid,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      `portalUI_${portal}`,
      {
        actionType: "PORTAL_UI_VERSION_CHANGED",
        portal,
        fromVersion: previousVersion,
        toVersion: normalizedVersion,
        timestamp: new Date().toISOString(),
      }
    ).catch(() => {});

    const updatedSettings = await getPortalUISettings();

    return NextResponse.json({
      success: true,
      message: `Successfully switched ${portal} to ${normalizedVersion === "new" ? "Modern UI 2.0" : "Classic"}.`,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/portal-ui error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update portal UI version." },
      { status: 500 }
    );
  }
}
