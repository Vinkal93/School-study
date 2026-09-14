import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getAiGlobalSettings, saveAiGlobalSettings } from "@/lib/ai/entitlement";
import { logAuditEvent } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Super Admin privileges required." }, { status: 403 });
    }

    const settings = await getAiGlobalSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("[API: Super Admin AI Settings GET]", error);
    return NextResponse.json(
      { error: "Failed to load AI settings", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Super Admin privileges required." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const previous = await getAiGlobalSettings();
    const updated = await saveAiGlobalSettings(body, authResult.user.uid);

    // Record audit log
    await logAuditEvent({
      actorId: authResult.user.uid,
      actorRole: "super_admin",
      actorEmail: authResult.user.email,
      actorName: authResult.user.name,
      action: "UPDATE_STATUS" as any,
      entityType: "SETTINGS" as any,
      entityId: "ai_settings",
      previousState: previous as any,
      newState: updated as any,
      metadata: {
        description: "Updated AI Global settings and portal access matrix",
        changes: Object.keys(body),
      },
    }).catch(() => {});

    return NextResponse.json({ settings: updated, success: true });
  } catch (error: any) {
    console.error("[API: Super Admin AI Settings PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update AI settings", details: error.message },
      { status: 500 }
    );
  }
}
