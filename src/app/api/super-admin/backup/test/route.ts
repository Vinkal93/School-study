import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { pingGoogleSheet, getBackupConfig } from "@/lib/services/google-sheets.service";

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
    let { webAppUrl, syncSecret, schoolId = "global" } = body;

    // Resolve secret if masked or not provided in request body
    if (!syncSecret || syncSecret === "••••••••••••") {
      const existing = await getBackupConfig(schoolId);
      syncSecret = existing?.syncSecret || process.env.GOOGLE_SHEETS_SYNC_SECRET || "";
    }

    if (!webAppUrl) {
      return NextResponse.json(
        {
          success: false,
          step: "url_validation",
          reason: "Google Apps Script Web App URL is required.",
          httpStatus: 400,
          suggestedFix: "Paste the deployed Web App URL ending in /exec.",
        },
        { status: 400 }
      );
    }

    const testResult = await pingGoogleSheet(webAppUrl.trim(), (syncSecret || "").trim());
    const statusCode = testResult.success ? 200 : (testResult.httpStatus || 400);
    return NextResponse.json(testResult, { status: statusCode });
  } catch (error: any) {
    console.error("POST /api/super-admin/backup/test error:", error);
    return NextResponse.json(
      {
        success: false,
        step: "server_execution",
        reason: error?.message || "Connection test failed unexpectedly.",
        httpStatus: 500,
        suggestedFix: "Check server logs for details.",
      },
      { status: 500 }
    );
  }
}
