import { NextResponse } from "next/server";
import { updateCampaign, setCampaignStatus } from "@/lib/billing/offersPromotionsEngine";
import type { CampaignStatus } from "@/types/offerPromotion";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing campaign ID" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { status, actorId = "super_admin", ...updateData } = body;

    let updated;
    if (status) {
      updated = await setCampaignStatus(id, status as CampaignStatus, actorId);
    } else {
      updated = await updateCampaign(id, updateData, actorId);
    }

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: `Campaign "${id}" updated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update campaign." },
      { status: 400 }
    );
  }
}
