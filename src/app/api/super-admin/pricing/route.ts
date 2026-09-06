import { NextResponse } from "next/server";
import { getAllPlansAdmin, getActivePlanVersion, createPlan, CreatePlanInput } from "@/lib/billing/plans";

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
            monthlyPrice: activeVersion?.monthlyPrice ?? (p.slug === "professional" ? 199900 : p.slug === "enterprise" ? 999900 : 99900),
            annualPrice: activeVersion?.annualPrice ?? (p.slug === "professional" ? 159900 : p.slug === "enterprise" ? 799900 : 79900),
          },
          version: p.version || activeVersion?.version || 1,
          publicVisible: p.publicVisible !== undefined ? p.publicVisible : true,
          isArchived: p.isArchived || p.status === "ARCHIVED",
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

/**
 * POST /api/super-admin/pricing
 * Creates a dynamic pricing plan and its initial v1 version.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      monthlyPricePaise,
      annualPricePaise,
      currency,
      isPopular,
      publicVisible,
      displayOrder,
      status,
      features,
      limits,
      actorId,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Plan name is required." }, { status: 400 });
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ success: false, error: "Plan slug is required." }, { status: 400 });
    }

    if (typeof monthlyPricePaise !== "number" || monthlyPricePaise < 0) {
      return NextResponse.json({ success: false, error: "Monthly price in paise must be a non-negative number." }, { status: 400 });
    }

    if (typeof annualPricePaise !== "number" || annualPricePaise < 0) {
      return NextResponse.json({ success: false, error: "Annual price in paise must be a non-negative number." }, { status: 400 });
    }

    const input: CreatePlanInput = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: (description || "").trim(),
      monthlyPricePaise,
      annualPricePaise,
      currency: currency || "INR",
      isPopular: !!isPopular,
      publicVisible: publicVisible !== undefined ? !!publicVisible : true,
      displayOrder: typeof displayOrder === "number" ? displayOrder : 1,
      status: status || "ACTIVE",
      features: Array.isArray(features) ? features : [],
      limits: limits || {
        maxStudents: 500,
        maxTeachers: 20,
        maxClasses: 15,
        maxStaffAccounts: 2,
      },
    };

    const newPlan = await createPlan(input, actorId || "super_admin");
    const activeVersion = await getActivePlanVersion(newPlan.id);

    return NextResponse.json({
      success: true,
      message: `Plan "${newPlan.name}" created successfully.`,
      plan: {
        ...newPlan,
        activeVersion,
      },
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/pricing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create pricing plan." },
      { status: 400 }
    );
  }
}
