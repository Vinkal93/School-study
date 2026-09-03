import { NextResponse } from "next/server";
import { deletePlan } from "@/lib/billing/plans";

/**
 * DELETE /api/super-admin/pricing/[id]
 * Safely deletes a plan if no active schools are currently subscribed.
 * Preserves historical invoices and orders.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const url = new URL(request.url);
    const actorId = url.searchParams.get("actorId") || "super_admin";

    const result = await deletePlan(planId, actorId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete plan." },
      { status: 400 }
    );
  }
}
