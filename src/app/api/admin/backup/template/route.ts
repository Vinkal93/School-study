import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { generateSampleTemplate } from "@/lib/services/import-export.service";
import type { SupportedImportModule } from "@/types/backup";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = (searchParams.get("module") || "students") as SupportedImportModule;
    const format = (searchParams.get("format") || "xlsx") as "xlsx" | "csv";

    const templateResult = await generateSampleTemplate(module, format);

    return new Response(templateResult.data, {
      status: 200,
      headers: {
        "Content-Type": templateResult.contentType,
        "Content-Disposition": `attachment; filename="${templateResult.filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Template generation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate template." },
      { status: 500 }
    );
  }
}
