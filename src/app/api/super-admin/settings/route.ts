import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/services/platform-settings.service";
import { createBillingAuditLog } from "@/lib/billing/audit";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET /api/super-admin/settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch platform settings." },
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
    const result = await updatePlatformSettings(body, {
      uid: actorUid,
      name: actorEmail,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: result.errors },
        { status: 400 }
      );
    }

    // Audit logging for critical change
    await createBillingAuditLog(
      actorUid,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "billing_settings",
      "platform_settings",
      {
        actionType: "PLATFORM_SETTINGS_UPDATED",
        timestamp: new Date().toISOString(),
        actor: actorEmail,
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Platform settings successfully updated.",
      settings: result.settings,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save platform settings." },
      { status: 500 }
    );
  }
}
