import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getBackupConfig, saveBackupConfig } from "@/lib/services/google-sheets.service";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "global";

    const config = await getBackupConfig(schoolId);
    
    // Mask sensitive secret before sending to frontend
    const sanitizedConfig = config
      ? {
          ...config,
          syncSecret: config.syncSecret ? "••••••••••••" : (process.env.GOOGLE_SHEETS_SYNC_SECRET ? "••••••••••••" : ""),
          hasConfiguredSecret: Boolean(config.syncSecret || process.env.GOOGLE_SHEETS_SYNC_SECRET),
        }
      : null;

    return NextResponse.json({ success: true, config: sanitizedConfig });
  } catch (error: any) {
    console.error("GET /api/super-admin/backup/config error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch backup config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { schoolId = "global", ...configData } = body;

    // If user left syncSecret masked or empty, preserve existing or env var
    let effectiveSecret = (configData.syncSecret || "").trim();
    if (!effectiveSecret || effectiveSecret === "••••••••••••") {
      const existing = await getBackupConfig(schoolId);
      effectiveSecret = existing?.syncSecret || process.env.GOOGLE_SHEETS_SYNC_SECRET || "";
    }

    await saveBackupConfig(schoolId, {
      ...configData,
      syncSecret: effectiveSecret,
      connectedBy: authResult.user.email || authResult.user.uid,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Backup configuration saved successfully." });
  } catch (error: any) {
    console.error("POST /api/super-admin/backup/config error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save backup config" },
      { status: 500 }
    );
  }
}
