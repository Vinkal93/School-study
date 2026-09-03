import { NextResponse } from "next/server";
import { updateCoupon, deleteCoupon } from "@/lib/billing/gstCouponsEngine";

/**
 * PUT /api/super-admin/coupons/[id]
 * Updates coupon rules/active status.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: couponId } = await params;
    const body = await request.json().catch(() => ({}));
    const { actorId = "super_admin", ...couponInput } = body || {};

    const updated = await updateCoupon(couponId, couponInput, actorId);

    return NextResponse.json({
      success: true,
      message: `Coupon "${updated.code}" updated successfully.`,
      coupon: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/super-admin/coupons/[id]
 * Deletes a coupon.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: couponId } = await params;
    const url = new URL(request.url);
    const actorId = url.searchParams.get("actorId") || "super_admin";

    await deleteCoupon(couponId, actorId);

    return NextResponse.json({
      success: true,
      message: `Coupon "${couponId}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
