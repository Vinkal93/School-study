import { NextResponse } from "next/server";
import { getAllPlansAdmin, getActivePlanVersion } from "@/lib/billing/plans";

/**
 * GET /api/super-admin/pricing
 * Returns full list of pricing plans and active version details for Super Admin configuration.
 */
export async function GET() {
  try {
    const plans = await getAllPlansAdmin();

    const enrichedPlans = await Promise.all(
      plans.map(async (p) => {
        const activeVersion = await getActivePlanVersion(p.id).catch(() => null);
        return {
          ...p,
          limits: {
            ...p.limits,
            monthlyPrice: activeVersion?.monthlyPrice || (p.slug === "professional" ? 199900 : p.slug === "enterprise" ? 999900 : 99900),
            annualPrice: activeVersion?.annualPrice || (p.slug === "professional" ? 159900 : p.slug === "enterprise" ? 799900 : 79900),
          },
          activeVersion,
        };
      })
    );

    return NextResponse.json({
      success: true,
      plans: enrichedPlans,
      total: enrichedPlans.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/pricing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pricing plans." },
      { status: 500 }
    );
  }
}
