import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  DEFAULT_TEST_CATALOG,
  getSecurityRuns,
  getSecurityFindings,
  getSecurityIncidents,
  calculateSecurityScore,
  runSecurityTestSuite,
  scanFrontendPatterns,
} from "@/lib/services/security-center.service";
import type { SecurityCategory } from "@/types/security-center";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const [runs, findings, incidents] = await Promise.all([
      getSecurityRuns(),
      getSecurityFindings(),
      getSecurityIncidents(),
    ]);

    const latestRun = runs[0];
    const totalCatalog = DEFAULT_TEST_CATALOG.length;
    const passedTests = latestRun ? latestRun.passed : 0;
    const failedTests = latestRun ? latestRun.failed : 0;

    const scoreCard = calculateSecurityScore(
      totalCatalog,
      passedTests,
      failedTests,
      findings
    );

    const frontendChecks = scanFrontendPatterns();

    return NextResponse.json({
      success: true,
      data: {
        catalog: DEFAULT_TEST_CATALOG,
        runs,
        findings,
        incidents,
        scoreCard,
        frontendChecks,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch security center data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const categoryFilter: SecurityCategory | "ALL" = body.category || "ALL";
    const environment: "STAGING" | "PRODUCTION" = body.environment || "STAGING";

    const testRun = await runSecurityTestSuite(categoryFilter, environment, user?.uid || "super_admin");
    const findings = await getSecurityFindings();

    const scoreCard = calculateSecurityScore(
      DEFAULT_TEST_CATALOG.length,
      testRun.passed,
      testRun.failed,
      findings
    );

    return NextResponse.json({
      success: true,
      data: {
        testRun,
        scoreCard,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute security tests" },
      { status: 500 }
    );
  }
}
