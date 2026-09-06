import { NextResponse } from "next/server";
import {
  getActivePlan,
  getActivePlanVersion,
  getPlanVersions,
  updatePlan,
  deletePlan,
  archivePlan,
  togglePlanStatus,
  UpdatePlanInput,
} from "@/lib/billing/plans";

/**
 * GET /api/super-admin/pricing/[id]
 * Returns plan details, active version, and complete historical versions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const plan = await getActivePlan(planId);
    const activeVersion = await getActivePlanVersion(planId);
    const versions = await getPlanVersions(planId);

    return NextResponse.json({
      success: true,
      plan: plan ? { ...plan, activeVersion } : null,
      versions,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/pricing/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch plan." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/pricing/[id]
 * Updates plan metadata, prices, limits, public visibility, or status.
 * Automatically handles version incrementing if financial/entitlement fields change.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      monthlyPricePaise,
      annualPricePaise,
      displayOrder,
      isPopular,
      publicVisible,
      isArchived,
      status,
      features,
      limits,
      changeNotes,
      actorId,
    } = body;

    const input: UpdatePlanInput = {
      name,
      description,
      monthlyPricePaise,
      annualPricePaise,
      displayOrder,
      isPopular,
      publicVisible,
      isArchived,
      status,
      features,
      limits,
      changeNotes,
    };

    const { plan, newVersionCreated } = await updatePlan(planId, input, actorId || "super_admin");
    const activeVersion = await getActivePlanVersion(planId);

    return NextResponse.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully.${newVersionCreated ? " New version generated." : ""}`,
      plan: {
        ...plan,
        activeVersion,
      },
      newVersionCreated,
    });
  } catch (error: any) {
    console.error("PATCH /api/super-admin/pricing/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update plan." },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/super-admin/pricing/[id]
 * Safely deletes a plan if no active schools or past records reference it.
 * If referenced, safely transitions to ARCHIVED state to protect accounting integrity.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const url = new URL(request.url);
    const actorId = url.searchParams.get("actorId") || "super_admin";
    const forceArchive = url.searchParams.get("archive") === "true";

    if (forceArchive) {
      const archivedPlan = await archivePlan(planId, actorId);
      return NextResponse.json({
        success: true,
        archived: true,
        message: `Plan "${archivedPlan.name}" archived successfully.`,
        plan: archivedPlan,
      });
    }

    const result = await deletePlan(planId, actorId);

    return NextResponse.json({
      success: true,
      archived: result.archived || false,
      message: result.message,
    });
  } catch (error: any) {
    console.error("DELETE /api/super-admin/pricing/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete plan." },
      { status: 400 }
    );
  }
}
