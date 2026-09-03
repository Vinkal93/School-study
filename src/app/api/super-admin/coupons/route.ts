import { NextResponse } from "next/server";
import { getAllCoupons, createCoupon } from "@/lib/billing/gstCouponsEngine";

/**
 * GET /api/super-admin/coupons
 * Returns all configured coupons.
 */
export async function GET() {
  try {
    const coupons = await getAllCoupons();
    return NextResponse.json({ success: true, coupons, total: coupons.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/coupons
 * Creates a new coupon with full rule validation and audit logging.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { actorId = "super_admin", ...couponInput } = body || {};

    const created = await createCoupon(couponInput, actorId);

    return NextResponse.json({
      success: true,
      message: `Coupon "${created.code}" created successfully.`,
      coupon: created,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
