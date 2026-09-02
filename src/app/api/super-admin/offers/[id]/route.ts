import { NextResponse } from "next/server";
import {
  deactivateCustomOffer,
  duplicateCustomOffer,
} from "@/lib/billing/customOffers";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getFirebaseDb();
    if (!db) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

    const snap = await getDoc(doc(db, BILLING_COLLECTIONS.CUSTOM_OFFERS, id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, offer: { id: snap.id, ...snap.data() } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch offer." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, actorId = "super_admin" } = body;

    if (action === "deactivate") {
      const offer = await deactivateCustomOffer(id, actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} has been deactivated.`,
      });
    }

    if (action === "duplicate") {
      const offer = await duplicateCustomOffer(id, actorId);
      return NextResponse.json({
        success: true,
        offer,
        message: `Offer ${id} duplicated as new draft offer ${offer.id}.`,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to perform offer action." }, { status: 500 });
  }
}
