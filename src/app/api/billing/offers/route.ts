import { NextResponse } from "next/server";
import { getSchoolActiveCustomOffer, listAllCustomOffers } from "@/lib/billing/customOffers";

/**
 * GET /api/billing/offers
 * Returns active custom offer for a school context (tenant-isolated).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId parameter is required." }, { status: 400 });
    }

    const offer = await getSchoolActiveCustomOffer(schoolId);
    const allSchoolOffers = await listAllCustomOffers({ schoolId });

    return NextResponse.json({
      success: true,
      activeOffer: offer,
      historyOffers: allSchoolOffers,
    });
  } catch (error: any) {
    console.error("GET /api/billing/offers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load active custom offer." },
      { status: 500 }
    );
  }
}
