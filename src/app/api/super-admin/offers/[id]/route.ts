import { NextResponse } from "next/server";
import {
  getOfferById,
  updateOffer,
  setOfferStatus,
  duplicateOffer,
  archiveOffer,
  getAllRedemptions,
} from "@/lib/billing/offersPromotionsEngine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing offer ID" }, { status: 400 });

    const offer = await getOfferById(id);
    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found." }, { status: 404 });
    }

    const redemptions = await getAllRedemptions({ offerId: id, limit: 50 });

    return NextResponse.json({ success: true, offer, redemptions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch offer." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing offer ID" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { action, actorId = "super_admin", ...updateData } = body;

    if (action === "deactivate" || action === "pause") {
      const offer = await setOfferStatus(id, "PAUSED", actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} has been paused.`,
      });
    }

    if (action === "activate") {
      const offer = await setOfferStatus(id, "ACTIVE", actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} has been activated.`,
      });
    }

    if (action === "duplicate") {
      const offer = await duplicateOffer(id, updateData.newCode, actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} duplicated as new draft offer ${offer.id}.`,
      });
    }

    if (action === "archive") {
      const offer = await archiveOffer(id, actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} archived.`,
      });
    }

    // Default update
    const offer = await updateOffer(id, updateData, actorId);
    return NextResponse.json({
      success: true,
      offer,
      message: `Offer ${id} updated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update offer." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing offer ID" }, { status: 400 });

    const offer = await archiveOffer(id, "super_admin");
    return NextResponse.json({
      success: true,
      offer,
      message: `Offer ${id} archived successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to archive offer." },
      { status: 500 }
    );
  }
}
