import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import {
  getArchitectureOverview,
  INTEGRATION_REGISTRY,
  getFeatureCapabilities,
  DATABASE_ENTITIES,
  SECURITY_CONTROL_ITEMS,
  getAuthoritativeBusinessMetrics,
  hasArchitecturePermission,
} from "@/lib/services/architecture-intelligence.service";

export const dynamic = "force-dynamic";

function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) return authResult.errorResponse;
    const user = authResult.user!;

    if (!hasArchitecturePermission(user.role, "architecture_intelligence.export")) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Missing architecture_intelligence.export permission." },
        { status: 403 }
      );
    }

    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.DATA_EXPORT, user.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const type = searchParams.get("type") || "integrations";

    if (format === "csv") {
      if (type === "integrations") {
        const headers = ["Integration", "Provider", "Category", "Status", "FailureImpact", "EstCost", "ConfigCompleteness"];
        const rows = INTEGRATION_REGISTRY.map((item) => [
          sanitizeCsvCell(item.name),
          sanitizeCsvCell(item.provider),
          sanitizeCsvCell(item.category),
          sanitizeCsvCell(item.connectionStatus),
          sanitizeCsvCell(item.failureImpact),
          sanitizeCsvCell(item.estimatedMonthlyCost),
          sanitizeCsvCell(`${item.configurationCompleteness}%`),
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="architecture-integrations-${Date.now()}.csv"`,
          },
        });
      }

      if (type === "security") {
        const headers = ["ControlID", "Domain", "ControlName", "ASVSLevel", "Status", "Implementation"];
        const rows = SECURITY_CONTROL_ITEMS.map((item) => [
          sanitizeCsvCell(item.id),
          sanitizeCsvCell(item.domain),
          sanitizeCsvCell(item.name),
          sanitizeCsvCell(item.asvsLevel),
          sanitizeCsvCell(item.status),
          sanitizeCsvCell(item.implementationMechanism),
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="security-controls-matrix-${Date.now()}.csv"`,
          },
        });
      }
    }

    // Default JSON sanitized executive package
    const [overview, businessMetrics] = await Promise.all([
      getArchitectureOverview(),
      getAuthoritativeBusinessMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        title: "School Study — Architecture & Investor Technical Package",
        exportedAt: new Date().toISOString(),
        exportedBy: user.email || "Super Admin",
        overview,
        businessMetrics,
        integrations: INTEGRATION_REGISTRY,
        features: getFeatureCapabilities(),
        databaseEntities: DATABASE_ENTITIES,
        securityControls: SECURITY_CONTROL_ITEMS,
      },
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/architecture-intelligence/export error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate architecture export." },
      { status: 500 }
    );
  }
}
