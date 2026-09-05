import { NextResponse } from "next/server";
import { duplicateOffer } from "@/lib/billing/offersPromotionsEngine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "Missing offer ID" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { newCode, actorId = "super_admin" } = body;

    const duplicated = await duplicateOffer(id, newCode, actorId);

    return NextResponse.json({
      success: true,
      offer: duplicated,
      message: `Offer duplicated successfully with code ${duplicated.code}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to duplicate offer." },
      { status: 400 }
    );
  }
}
