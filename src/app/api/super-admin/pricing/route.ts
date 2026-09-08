import { NextResponse } from "next/server";
import {
  getAllPlansAdmin,
  getActivePlanVersion,
  createPlan,
  updatePlan,
  deletePlan,
  archivePlan,
  togglePlanStatus,
  duplicatePlan,
  CreatePlanInput,
  UpdatePlanInput,
} from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

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
 * Creates a dynamic pricing plan or duplicates an existing one.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, actorId = "super_admin" } = body;

    // Duplicate action
    if (action === "duplicate") {
      const { sourcePlanId, newSlug, newName } = body;
      if (!sourcePlanId || !newSlug) {
        return NextResponse.json({ success: false, error: "Source plan ID and new slug are required." }, { status: 400 });
      }
      const duplicated = await duplicatePlan(sourcePlanId, newSlug, newName, actorId);
      return NextResponse.json({
        success: true,
        message: `Plan duplicated as "${duplicated.name}".`,
        plan: duplicated,
      });
    }

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
      featureAccess,
      limits,
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
      featureAccess: featureAccess || {},
      limits: limits || {
        maxStudents: 500,
        maxTeachers: 20,
        maxClasses: 15,
        maxStaffAccounts: 2,
      },
    };

    const newPlan = await createPlan(input, actorId);
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

/**
 * PUT /api/super-admin/pricing
 * Updates an existing plan, toggles status, or creates a new version.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { planId, action, actorId = "super_admin" } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: "Plan ID is required." }, { status: 400 });
    }

    // Toggle status action
    if (action === "toggle_status") {
      const { status } = body;
      if (!status) {
        return NextResponse.json({ success: false, error: "Target status is required." }, { status: 400 });
      }
      const updated = await togglePlanStatus(planId, status, actorId);
      return NextResponse.json({
        success: true,
        message: `Plan status updated to ${status}.`,
        plan: updated,
      });
    }

    // Archive action
    if (action === "archive") {
      const archived = await archivePlan(planId, actorId);
      return NextResponse.json({
        success: true,
        message: `Plan "${archived.name}" archived successfully.`,
        plan: archived,
      });
    }

    // Standard plan update
    const input: UpdatePlanInput = {
      name: body.name,
      description: body.description,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      isPopular: body.isPopular,
      publicVisible: body.publicVisible,
      status: body.status,
      monthlyPricePaise: body.monthlyPricePaise !== undefined ? Number(body.monthlyPricePaise) : undefined,
      annualPricePaise: body.annualPricePaise !== undefined ? Number(body.annualPricePaise) : undefined,
      features: body.features,
      featureAccess: body.featureAccess,
      limits: body.limits,
      changeNotes: body.changeNotes,
    };

    const res = await updatePlan(planId, input, actorId);
    return NextResponse.json({
      success: true,
      message: res.newVersionCreated
        ? `Plan "${res.plan.name}" updated with new version ${res.plan.version}.`
        : `Plan "${res.plan.name}" updated successfully.`,
      plan: res.plan,
      newVersionCreated: res.newVersionCreated,
    });
  } catch (error: any) {
    console.error("PUT /api/super-admin/pricing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update pricing plan." },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/super-admin/pricing
 * Safely deletes a plan if unused, or archives it to protect subscriber integrity.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let planId = searchParams.get("planId") || searchParams.get("id");
    let actorId = searchParams.get("actorId") || "super_admin";

    if (!planId) {
      const body = await request.json().catch(() => ({}));
      planId = body.planId || body.id;
      if (body.actorId) actorId = body.actorId;
    }

    if (!planId) {
      return NextResponse.json({ success: false, error: "Plan ID is required." }, { status: 400 });
    }

    const result = await deletePlan(planId, actorId);
    return NextResponse.json({
      success: true,
      archived: result.archived,
      message: result.message,
    });
  } catch (error: any) {
    console.error("DELETE /api/super-admin/pricing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete plan." },
      { status: 400 }
    );
  }
}
