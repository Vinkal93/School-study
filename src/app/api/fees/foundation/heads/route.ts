import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import { getFeeHeads, createFeeHead } from "@/lib/services/fee-foundation.service";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");
    const targetSchoolId = authResult.user.role === "super_admin"
      ? (requestedSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Missing school identifier" }, { status: 400 });
    }

    const heads = await getFeeHeads(targetSchoolId);
    return NextResponse.json({ success: true, heads });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/heads error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch fee heads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: You cannot configure fee heads." }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId: clientSchoolId, name, code, description, sortOrder } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Missing school identifier" }, { status: 400 });
    }

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required for fee heads." }, { status: 400 });
    }

    const newHead = await createFeeHead(
      targetSchoolId,
      { name, code, description, sortOrder },
      authResult.user.uid
    );

    return NextResponse.json({ success: true, head: newHead });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/heads error:", err);
    return NextResponse.json({ error: err.message || "Failed to create fee head" }, { status: 400 });
  }
}
