import { NextResponse } from "next/server";
import { setOfferStatus } from "@/lib/billing/offersPromotionsEngine";
import type { OfferStatus } from "@/types/offerPromotion";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing offer ID" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { status, actorId = "super_admin" } = body;

    const validStatuses: OfferStatus[] = ["DRAFT", "ACTIVE", "SCHEDULED", "PAUSED", "EXPIRED", "ARCHIVED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await setOfferStatus(id, status, actorId);

    return NextResponse.json({
      success: true,
      offer: updated,
      message: `Offer status changed to ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update offer status." },
      { status: 400 }
    );
  }
}
