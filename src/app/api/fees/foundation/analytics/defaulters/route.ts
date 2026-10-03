import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getFeeDefaulters } from "@/lib/services/fee-analytics.service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const className = searchParams.get("className") || undefined;
    const sectionName = searchParams.get("sectionName") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const minOverdueDays = searchParams.get("minOverdueDays") ? Number(searchParams.get("minOverdueDays")) : undefined;
    const sortBy = (searchParams.get("sortBy") as any) || undefined;
    const limitCount = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const result = await getFeeDefaulters(targetSchoolId, {
      academicYearId,
      className,
      sectionName,
      status,
      minOverdueDays,
      sortBy,
      limitCount,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      totalOutstandingPaise: result.totalOutstandingPaise,
      defaulters: result.defaulters,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/analytics/defaulters error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch fee defaulters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId: clientSchoolId, studentIds, action } = body;
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters (schoolId, studentIds array)." },
        { status: 400 }
      );
    }

    // Revalidate eligibility against real database
    const allDefaultersResult = await getFeeDefaulters(targetSchoolId);
    const eligibleDefaulters = allDefaultersResult.defaulters.filter((d) =>
      studentIds.includes(d.studentId) && d.totalOutstandingPaise > 0
    );

    const clearedCount = studentIds.length - eligibleDefaulters.length;
    const totalEligibleOutstandingPaise = eligibleDefaulters.reduce(
      (sum, d) => sum + d.totalOutstandingPaise,
      0
    );

    return NextResponse.json({
      success: true,
      action: action || "validate",
      requestedCount: studentIds.length,
      eligibleCount: eligibleDefaulters.length,
      clearedCount,
      totalOutstandingPaise: totalEligibleOutstandingPaise,
      eligibleDefaulters,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/analytics/defaulters error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process bulk defaulters action" },
      { status: 500 }
    );
  }
}
