import { NextResponse } from "next/server";
import {
  getAllOffers,
  getAllCampaigns,
  getOffersDashboardMetrics,
  createOffer,
} from "@/lib/billing/offersPromotionsEngine";

/**
 * GET /api/super-admin/offers
 * Returns list of offers & promotions, campaigns, and top 8 KPI metrics.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const planId = searchParams.get("planId") || "ALL";
    const discountType = searchParams.get("discountType") || "ALL";
    const campaignId = searchParams.get("campaignId") || "ALL";

    const [offers, campaigns, metrics] = await Promise.all([
      getAllOffers({ search, status, planId, discountType, campaignId }),
      getAllCampaigns(),
      getOffersDashboardMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      offers,
      campaigns,
      metrics,
      analytics: {
        totalOffers: metrics.totalOffers,
        activeOffersCount: metrics.activeOffers,
        scheduledOffersCount: metrics.scheduledOffers,
        expiredOffersCount: metrics.expiredOffers,
        redeemedOffersCount: metrics.totalRedemptions,
        deactivatedOffersCount: metrics.pausedOffers,
        totalDiscountGivenRupees: metrics.totalDiscountGivenRupees,
        totalOfferRevenueRupees: metrics.totalRevenueGeneratedRupees,
        conversionRate: metrics.conversionRate,
      },
      total: offers.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/offers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load offers & promotions." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/offers
 * Creates a new offer with full multi-criteria rules and audit logging.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorId = body.actorId || "super_admin";

    // Support both custom offer legacy inputs and new multi-criteria inputs
    const name = body.name || body.title || "Special Promotional Offer";
    const code = (body.code || body.offerCode || body.couponCode || "").trim().toUpperCase();
    const discountType = body.discountType || (body.customPriceRupees !== undefined ? "CUSTOM_PLAN_PRICE" : "PERCENTAGE");
    
    let discountValue = 0;
    if (typeof body.discountValue === "number") {
      discountValue = body.discountValue;
    } else if (typeof body.customPriceRupees === "number") {
      discountValue = Math.round(body.customPriceRupees * 100);
    } else if (typeof body.customPricePaise === "number") {
      discountValue = body.customPricePaise;
    }

    const offer = await createOffer(
      {
        name,
        title: body.title || name,
        description: body.description || body.notes || "",
        code,
        discountType,
        discountValue,
        maxDiscountCapPaise: typeof body.maxDiscountCapPaise === "number" ? body.maxDiscountCapPaise : undefined,
        minOrderAmountPaise: typeof body.minOrderAmountPaise === "number" ? body.minOrderAmountPaise : 0,
        maxTotalRedemptions: typeof body.maxTotalRedemptions === "number" ? body.maxTotalRedemptions : (body.maxRedemptions || -1),
        maxRedemptionsPerSchool: typeof body.maxRedemptionsPerSchool === "number" ? body.maxRedemptionsPerSchool : 1,
        maxRedemptionsPerUser: typeof body.maxRedemptionsPerUser === "number" ? body.maxRedemptionsPerUser : 1,
        startDate: body.startDate || body.validFrom || new Date().toISOString(),
        endDate: body.endDate !== undefined ? body.endDate : (body.validUntil || null),
        applicablePlans: Array.isArray(body.applicablePlans) && body.applicablePlans.length > 0 
          ? body.applicablePlans 
          : (body.offerPlanId ? [body.offerPlanId] : ["ALL"]),
        applicableBillingCycles: Array.isArray(body.applicableBillingCycles) 
          ? body.applicableBillingCycles 
          : (body.billingCycle ? [body.billingCycle] : ["all"]),
        targetAudience: body.targetAudience || (body.schoolId && body.schoolId !== "global" ? "SPECIFIC_SCHOOLS" : "ALL"),
        targetSchoolIds: body.targetSchoolIds || (body.schoolId && body.schoolId !== "global" ? [body.schoolId] : []),
        autoApply: Boolean(body.autoApply),
        priority: typeof body.priority === "number" ? body.priority : 1,
        isStackable: Boolean(body.isStackable),
        campaignId: body.campaignId,
        status: body.status || "ACTIVE",
        termsAndConditions: body.termsAndConditions || body.notes || "",
        notes: body.notes || "",
        internalReason: body.internalReason || "",
      },
      actorId
    );

    return NextResponse.json({
      success: true,
      message: `Offer "${offer.name}" (${offer.code}) created successfully.`,
      offer,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/offers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create offer." },
      { status: 400 }
    );
  }
}
