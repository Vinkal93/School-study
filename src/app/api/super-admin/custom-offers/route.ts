import { NextResponse } from "next/server";
import {
  createCustomOffer,
  listAllCustomOffers,
  CreateCustomOfferInput,
} from "@/lib/billing/customOffers";

export async function GET() {
  try {
    const offers = await listAllCustomOffers();
    return NextResponse.json({ success: true, offers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load custom offers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, schoolName, originalPlanId, offerPlanId, originalPriceRupees, customPriceRupees, durationDays, couponCode, expiresInDays, notes, actorId = "super_admin" } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }
    if (typeof customPriceRupees !== "number" || customPriceRupees < 0) {
      return NextResponse.json({ error: "customPriceRupees must be a non-negative number." }, { status: 400 });
    }

    const offer = await createCustomOffer(
      {
        schoolId,
        schoolName: schoolName || schoolId,
        originalPlanId: originalPlanId || "starter",
        offerPlanId: offerPlanId || "professional",
        originalPricePaise: Math.round((originalPriceRupees || 1999) * 100),
        customPricePaise: Math.round(customPriceRupees * 100),
        durationDays: durationDays || 30,
        couponCode,
        expiresInDays: expiresInDays || 14,
        notes,
      },
      actorId
    );

    return NextResponse.json({
      success: true,
      offer,
      message: `Custom offer of ₹${customPriceRupees} created successfully for ${schoolName || schoolId}.`,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/custom-offers error:", error);
    return NextResponse.json({ error: error.message || "Failed to create custom offer." }, { status: 500 });
  }
}
