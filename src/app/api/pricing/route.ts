import { NextResponse } from "next/server";
import { getAllPlans, getActivePlanVersion } from "@/lib/billing/plans";

/**
 * GET /api/pricing
 * Public API returning all active and public-visible pricing plans with their active versions.
 */
export async function GET() {
  try {
    const plans = await getAllPlans();

    const publicPlans = await Promise.all(
      plans.map(async (p) => {
        const activeVersion = await getActivePlanVersion(p.id).catch(() => null);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          status: p.status,
          displayOrder: p.displayOrder,
          isPopular: !!p.isPopular,
          publicVisible: p.publicVisible !== undefined ? p.publicVisible : true,
          version: p.version || activeVersion?.version || 1,
          features: p.features || [],
          limits: p.limits || {},
          monthlyPrice: activeVersion?.monthlyPrice ?? (p.slug === "starter" ? 99900 : p.slug === "professional" ? 199900 : 0),
          annualPrice: activeVersion?.annualPrice ?? (p.slug === "starter" ? 79900 : p.slug === "professional" ? 159900 : 0),
          currency: activeVersion?.currency || "INR",
          activeVersion,
        };
      })
    );

    return NextResponse.json({
      success: true,
      plans: publicPlans,
      total: publicPlans.length,
    });
  } catch (error: any) {
    console.error("GET /api/pricing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch public pricing catalog." },
      { status: 500 }
    );
  }
}
