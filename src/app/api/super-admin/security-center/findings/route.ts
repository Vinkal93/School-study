import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  getSecurityFindings,
  createSecurityFinding,
} from "@/lib/services/security-center.service";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    let findings = await getSecurityFindings();

    if (category) {
      findings = findings.filter((f) => f.category === category);
    }
    if (severity) {
      findings = findings.filter((f) => f.severity === severity);
    }
    if (status) {
      findings = findings.filter((f) => f.status === status);
    }

    return NextResponse.json({
      success: true,
      data: findings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch findings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body.title || !body.category || !body.severity) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, category, severity" },
        { status: 400 }
      );
    }

    const finding = await createSecurityFinding(
      {
        title: body.title,
        category: body.category,
        severity: body.severity,
        affectedComponent: body.affectedComponent || "Unknown",
        affectedRouteOrApi: body.affectedRouteOrApi,
        affectedSchoolOrScope: body.affectedSchoolOrScope,
        description: body.description || "",
        expected: body.expected || "",
        actual: body.actual || "",
        impact: body.impact || "",
        evidence: body.evidence || [],
        discoveredBy: user?.name || user?.email || "Super Admin",
        discoveredAt: new Date().toISOString(),
        status: body.status || "OPEN",
        owner: body.owner,
        remediation: body.remediation,
        fixReference: body.fixReference,
        retestStatus: "REQUIRED",
      },
      user?.uid || "super_admin"
    );

    return NextResponse.json({
      success: true,
      data: finding,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create finding" },
      { status: 500 }
    );
  }
}
