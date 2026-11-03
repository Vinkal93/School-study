import { NextResponse } from "next/server";
import { getAllPlans, getActivePlanVersion, DEFAULT_STATIC_PLAN_VERSIONS } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        const defaultVersion =
          DEFAULT_STATIC_PLAN_VERSIONS[p.id] ||
          DEFAULT_STATIC_PLAN_VERSIONS[`plan_${p.slug}`] ||
          DEFAULT_STATIC_PLAN_VERSIONS[p.slug];

        const monthlyPrice =
          activeVersion?.monthlyPrice ??
          (p.limits as any)?.monthlyPrice ??
          defaultVersion?.monthlyPrice ??
          (p.slug === "base"
            ? 39900
            : p.slug === "starter"
            ? 99900
            : p.slug === "growth"
            ? 149900
            : p.slug === "professional"
            ? 199900
            : p.slug === "enterprise"
            ? 999900
            : 0);

        const annualPrice =
          activeVersion?.annualPrice ??
          (p.limits as any)?.annualPrice ??
          defaultVersion?.annualPrice ??
          (p.slug === "base"
            ? 29900
            : p.slug === "starter"
            ? 79900
            : p.slug === "growth"
            ? 119900
            : p.slug === "professional"
            ? 159900
            : p.slug === "enterprise"
            ? 799900
            : 0);

        const resolvedVersion = activeVersion || defaultVersion || {
          id: `${p.id}_v1`,
          planId: p.id,
          version: p.version || 1,
          monthlyPrice,
          annualPrice,
          currency: "INR",
          features: p.features || [],
          limits: p.limits || {},
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveUntil: null,
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
        };

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          status: p.status,
          displayOrder: p.displayOrder,
          isPopular: !!p.isPopular,
          publicVisible: p.publicVisible !== undefined ? p.publicVisible : true,
          version: p.version || resolvedVersion.version || 1,
          features: p.features || [],
          featureAccess: p.featureAccess || {},
          limits: {
            ...p.limits,
            monthlyPrice,
            annualPrice,
          },
          monthlyPrice,
          annualPrice,
          currency: resolvedVersion.currency || "INR",
          activeVersion: resolvedVersion,
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
