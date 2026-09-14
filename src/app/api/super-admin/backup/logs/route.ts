import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSyncLogs } from "@/lib/services/google-sheets.service";

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
    const schoolId = searchParams.get("schoolId") || undefined;
    const limitCount = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await getSyncLogs(schoolId, limitCount);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch sync logs" },
      { status: 500 }
    );
  }
}
