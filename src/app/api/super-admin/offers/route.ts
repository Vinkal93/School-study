import { NextResponse } from "next/server";
import {
  createCustomOffer,
  listAllCustomOffers,
  getCustomOfferAnalytics,
  CreateCustomOfferInput,
} from "@/lib/billing/customOffers";

/**
 * GET /api/super-admin/offers
 * Returns list of custom offers, search results, and analytics summary metrics.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "ALL";
    const schoolId = searchParams.get("schoolId") || "";

    const [offers, analytics] = await Promise.all([
      listAllCustomOffers({ search, statusFilter, schoolId }),
      getCustomOfferAnalytics(),
    ]);

    return NextResponse.json({
      success: true,
      offers,
      analytics,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/offers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load custom offers." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/offers
 * Creates a new custom offer for a school or global code with server-side validation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      schoolId,
      tenantId,
      schoolName,
      adminEmail,
      adminName,
      originalPlanId,
      offerPlanId,
      planName,
      billingCycle,
      offerType,
      promoDurationMonths,
      originalPriceRupees,
      customPriceRupees,
      validFrom,
      validUntil,
      maxRedemptions,
      offerCode,
      notes,
      internalReason,
      actorId = "super_admin",
    } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }

    if (typeof customPriceRupees !== "number" || customPriceRupees < 0) {
      return NextResponse.json(
        { error: "customPriceRupees must be a non-negative number." },
        { status: 400 }
      );
    }

    const originalPricePaise = Math.round((originalPriceRupees || 9999) * 100);
    const customPricePaise = Math.round(customPriceRupees * 100);

    const offer = await createCustomOffer(
      {
        name,
        schoolId,
        tenantId: tenantId || schoolId,
        schoolName: schoolName || schoolId,
        adminEmail,
        adminName,
        originalPlanId: originalPlanId || "plan_starter",
        offerPlanId: offerPlanId || "plan_professional",
        planName: planName || "Professional Plan",
        billingCycle: billingCycle || "monthly",
        offerType: offerType || "PROMOTIONAL_RECURRING",
        promoDurationMonths: promoDurationMonths || 1,
        originalPricePaise,
        customPricePaise,
        validFrom,
        validUntil,
        maxRedemptions: maxRedemptions || 1,
        offerCode,
        notes,
        internalReason,
      },
      actorId
    );

    return NextResponse.json({
      success: true,
      offer,
      message: `Custom offer '${offer.name}' (₹${customPriceRupees}) created successfully for ${offer.schoolName}.`,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/offers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create custom offer." },
      { status: 500 }
    );
  }
}
