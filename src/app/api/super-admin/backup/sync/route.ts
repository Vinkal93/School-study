import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { syncSchoolToGoogleSheets, createFullBackupSnapshot } from "@/lib/services/google-sheets.service";

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
    const { schoolId = "global", syncType = "manual", isFullSnapshot = false } = body;

    // If full snapshot requested, also capture disaster recovery archive
    let snapshotId = "";
    if (isFullSnapshot) {
      const snap = await createFullBackupSnapshot(schoolId, "full");
      snapshotId = snap.id;
    }

    const result = await syncSchoolToGoogleSheets(
      schoolId,
      syncType,
      authResult.user.email || authResult.user.uid
    );

    return NextResponse.json({
      ...result,
      snapshotId: snapshotId || undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Sync execution failed." },
      { status: 500 }
    );
  }
}
