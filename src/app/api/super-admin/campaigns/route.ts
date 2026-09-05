import { NextResponse } from "next/server";
import { getAllCampaigns, createCampaign } from "@/lib/billing/offersPromotionsEngine";

export async function GET() {
  try {
    const campaigns = await getAllCampaigns();
    return NextResponse.json({ success: true, campaigns, total: campaigns.length });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load campaigns." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorId = body.actorId || "super_admin";

    const campaign = await createCampaign(body, actorId);

    return NextResponse.json({
      success: true,
      campaign,
      message: `Campaign "${campaign.name}" created successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create campaign." },
      { status: 400 }
    );
  }
}
