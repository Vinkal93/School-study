import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";



export async function PUT(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    const { schoolId, billingName, schoolName, email, phone, address, gstin, pan, actorId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required." }, { status: 400 });
    }

    if (!ownsBillingSchool(actor.user, schoolId)) return NextResponse.json({error:"School billing access denied."},{status:403});

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid billing email is required." }, { status: 400 });
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "Valid contact phone number is required." }, { status: 400 });
    }

    if (gstin && gstin.trim().length > 0 && gstin.trim().length !== 15) {
      return NextResponse.json({ error: "GSTIN must be exactly 15 characters long." }, { status: 400 });
    }

    const db = actor.db;
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const profileData = {
      schoolId,
      billingName: billingName?.trim() || "School Administrator",
      schoolName: schoolName?.trim() || "School Campus",
      email: email.trim(),
      phone: phone.trim(),
      address: address?.trim() || "",
      gstin: gstin?.trim().toUpperCase() || "",
      pan: pan?.trim().toUpperCase() || "",
      updatedAt: new Date().toISOString(),
    };

    await db.collection("billingProfiles").doc(schoolId).set(profileData, {merge:true});

    return NextResponse.json({
      success: true,
      message: "Billing details updated successfully.",
      billingProfile: profileData,
    });
  } catch (err: any) {
    console.error("PUT Billing Profile Error:", err);
    return NextResponse.json(
      { error: "Failed to update billing details: " + (err.message || "") },
      { status: 500 }
    );
  }
}
