import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSuperAdminAiAnalytics } from "@/lib/ai/usage/usageTracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json({ error: "Super Admin privileges required." }, { status: 403 });
    }

    const analytics = await getSuperAdminAiAnalytics();
    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error("[API: Super Admin AI Usage GET]", error);
    return NextResponse.json(
      { error: "Failed to load AI usage analytics", details: error.message },
      { status: 500 }
    );
  }
}
