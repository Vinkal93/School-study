import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  parseImportFile,
  validateAndPreviewImport,
  executeControlledImport,
} from "@/lib/services/import-export.service";
import type { SupportedImportModule } from "@/types/backup";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return (
        authResult.errorResponse ||
        NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Unauthorized: Authentication required." },
          },
          { status: 401 }
        )
      );
    }
    if (authResult.user.role !== "school_admin" && authResult.user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Forbidden: School Admin access required." },
        },
        { status: 403 }
      );
    }

    const schoolId = authResult.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_SCHOOL", message: "No school associated with this account." },
        },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let targetModule: SupportedImportModule = "students";
    let recordsToImport: Record<string, any>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      targetModule = ((formData.get("targetModule") as string) || "students") as SupportedImportModule;
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "MISSING_FILE", message: "No file provided in form data." },
          },
          { status: 400 }
        );
      }
      const fileBuffer = await file.arrayBuffer();
      const rawRows = await parseImportFile(fileBuffer);
      const preview = await validateAndPreviewImport(schoolId, targetModule, rawRows);
      recordsToImport = preview.allValidRecords || preview.previewData.filter((r) => !r._hasErrors);
    } else {
      const body = await request.json().catch(() => ({}));
      targetModule = (body.targetModule || "students") as SupportedImportModule;
      recordsToImport = Array.isArray(body.records) ? body.records : [];
    }

    if (!targetModule || recordsToImport.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_RECORDS",
            message: "Invalid payload: targetModule and valid records are required.",
          },
          summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
        },
        { status: 400 }
      );
    }

    const result = await executeControlledImport(
      schoolId,
      targetModule,
      recordsToImport,
      authResult.user.email || authResult.user.uid
    );

    // Return 200 with result (even if fallbackToClient is true so frontend can execute directly)
    return NextResponse.json(result, { status: result.success || result.fallbackToClient ? 200 : 400 });
  } catch (error: any) {
    console.error("Execute import API error:", error);
    const isLimitError =
      error?.code === "LIMIT_REACHED" ||
      error?.code === "LIMIT_EXCEEDED" ||
      error?.code === "OVER_LIMIT";
    return NextResponse.json(
      {
        success: false,
        fallbackToClient: !isLimitError,
        error: {
          code: error?.code || "INTERNAL_ERROR",
          message: error?.message || "Import execution failed on server.",
        },
        summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
        errors: [error?.message || "Server error"],
      },
      { status: isLimitError ? 400 : 200 }
    );
  }
}
