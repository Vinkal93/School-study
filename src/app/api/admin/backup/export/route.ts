import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { exportSchoolData } from "@/lib/services/import-export.service";
import type { SupportedImportModule } from "@/types/backup";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "school_admin" && authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: School Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const module = (searchParams.get("module") || "students") as SupportedImportModule | "all";
    const format = (searchParams.get("format") || "xlsx") as "xlsx" | "csv" | "json";
    const classId = searchParams.get("classId") || undefined;
    const requestedSchoolId = searchParams.get("schoolId");

    const schoolId = authResult.user.role === "super_admin" && requestedSchoolId
      ? requestedSchoolId
      : authResult.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: "No school associated with this account." }, { status: 400 });
    }

    const exportResult = await exportSchoolData(schoolId, module, format, { classId });

    return new Response(exportResult.data, {
      status: 200,
      headers: {
        "Content-Type": exportResult.contentType,
        "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
      },
    });
  } catch (error: any) {
    console.error("School export failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate school data export." },
      { status: 500 }
    );
  }
}
