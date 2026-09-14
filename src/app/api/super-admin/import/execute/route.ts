import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { executeControlledImport } from "@/lib/services/import-export.service";
import type { SupportedImportModule } from "@/types/backup";

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
    const { schoolId, targetModule, records } = body;

    if (!schoolId || !targetModule || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: schoolId, targetModule, and valid records are required." },
        { status: 400 }
      );
    }

    const result = await executeControlledImport(
      schoolId,
      targetModule as SupportedImportModule,
      records,
      authResult.user.email || authResult.user.uid
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Import execution failed." },
      { status: 500 }
    );
  }
}
