import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { canAccessAiFeature } from "@/lib/ai/entitlement";
import { getMonthlyAiUsageCount } from "@/lib/ai/usage/usageTracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const entitlement = await canAccessAiFeature({ user });

    // Calculate usage against quota
    let usedThisMonth = 0;
    if (entitlement.allowed && user.schoolId) {
      usedThisMonth = await getMonthlyAiUsageCount({ instituteId: user.schoolId });
    } else if (entitlement.allowed) {
      usedThisMonth = await getMonthlyAiUsageCount({ userId: user.uid });
    }

    const total = entitlement.quotaTotal ?? 20;
    const remaining = total === -1 ? Infinity : Math.max(0, total - usedThisMonth);

    return NextResponse.json({
      ...entitlement,
      usedThisMonth,
      quotaRemaining: remaining,
      isQuotaExceeded: total !== -1 && usedThisMonth >= total,
    });
  } catch (error: any) {
    console.error("[API: AI Entitlement]", error);
    return NextResponse.json(
      { error: "Failed to resolve AI entitlement", details: error.message },
      { status: 500 }
    );
  }
}
