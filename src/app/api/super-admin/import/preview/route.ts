import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { parseImportFile, validateAndPreviewImport } from "@/lib/services/import-export.service";
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

    const contentType = request.headers.get("content-type") || "";
    let schoolId = "global";
    let targetModule: SupportedImportModule = "students";
    let fileBuffer: ArrayBuffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      schoolId = (formData.get("schoolId") as string) || "global";
      targetModule = ((formData.get("targetModule") as string) || "students") as SupportedImportModule;
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
    } else {
      const body = await request.json().catch(() => ({}));
      schoolId = body.schoolId || "global";
      targetModule = (body.targetModule || "students") as SupportedImportModule;
      if (body.fileBase64) {
        const binaryString = atob(body.fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "Missing file buffer for parsing." }, { status: 400 });
    }

    const rawRows = await parseImportFile(fileBuffer);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "The uploaded spreadsheet is empty or has no data rows." }, { status: 400 });
    }

    const previewResult = await validateAndPreviewImport(schoolId, targetModule, rawRows);
    return NextResponse.json({ success: true, ...previewResult });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process import preview." },
      { status: 500 }
    );
  }
}
