import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import { calculateServerBillingPrice } from "@/lib/billing/gstCouponsEngine";
import { createRazorpayOrder, loadRazorpayCredentials } from "@/lib/payments/razorpay";
import type { InternalOrder } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const { db, user } = actor;
    const body = await request.json();
    const schoolId = String(body.schoolId || user.schoolId || "");
    if (!schoolId || !ownsBillingSchool(user, schoolId)) return NextResponse.json({ error: "School billing access denied." }, { status: 403 });
    if (!["monthly", "annual"].includes(body.billingCycle)) return NextResponse.json({ error: "Choose monthly or annual billing." }, { status: 400 });
    const planId = String(body.planId || "");
    const [school, plan, versions] = await Promise.all([db.collection("schools").doc(schoolId).get(), db.collection(BILLING_COLLECTIONS.PLANS).doc(planId).get(), db.collection(BILLING_COLLECTIONS.PLAN_VERSIONS).where("planId", "==", planId).where("status", "==", "ACTIVE").get()]);
    if (!school.exists || !plan.exists || plan.data()?.status !== "ACTIVE" || versions.empty) return NextResponse.json({ error: "School or active plan not found." }, { status: 404 });
    const { resolveEmergencyAccess } = await import("@/lib/emergency/emergencyResolver");
    const emergency = await resolveEmergencyAccess({ schoolId, userId: user.uid, moduleKey: "payments", action: "create_order", httpMethod: "POST" });
    if (!emergency.allowed) return NextResponse.json({ error: emergency.message }, { status: emergency.status || 503 });
    let offer: any = null;
    if (body.offerId) {
      const offerSnap = await db.collection("customOffers").doc(String(body.offerId)).get();
      offer = offerSnap.data();
      if (offer?.durationDays !== undefined && (!Number.isSafeInteger(offer.durationDays) || offer.durationDays <= 0)) return NextResponse.json({error:"Invalid offer duration."},{status:400});
      if (!offer || !["ACTIVE","PUBLISHED"].includes(offer.status) || ![schoolId,"global"].includes(offer.schoolId) || offer.offerPlanId !== planId || (offer.billingCycle && offer.billingCycle !== body.billingCycle) || !Number.isFinite(Date.parse(offer.validUntil || offer.expiresAt)) || Date.parse(offer.validUntil || offer.expiresAt) <= Date.now() || (offer.validFrom && Date.parse(offer.validFrom) > Date.now()) || (offer.maxRedemptions !== -1 && Number(offer.redeemedCount || 0) >= (offer.maxRedemptions ?? 1))) return NextResponse.json({error:"Offer is unavailable for this school and plan."},{status:400});
    }
    const calc = await calculateServerBillingPrice({ planId, billingCycle: body.billingCycle, couponCode: body.couponCode || null, customOfferPricePaise:offer?.customPricePaise ?? null });
    if (!Number.isSafeInteger(calc.finalAmountPaise) || calc.finalAmountPaise <= 0) return NextResponse.json({ error: "This plan has no payable checkout amount. Ask the administrator to assign the free plan." }, { status: 400 });
    const credentials = await loadRazorpayCredentials();
    if (!credentials.keyId || !credentials.keySecret) return NextResponse.json({ error: "Razorpay server keys are not configured." }, { status: 503 });
    const id = `ord_${randomUUID().replace(/-/g, "")}`;
    const now = new Date().toISOString();
    const internal: InternalOrder = { id, schoolId, userId: user.uid, planId, planVersionId: calc.planVersionId, billingCycle: body.billingCycle, baseAmount: calc.baseAmountPaise, discountAmount: calc.discountAmountPaise, taxAmount: calc.gstAmountPaise, finalAmount: calc.finalAmountPaise, currency: "INR", couponId: calc.couponCode, status: "PAYMENT_PENDING", razorpayOrderId: "", createdAt: now, expiresAt: new Date(Date.now()+86400000).toISOString() };
    if (offer) { internal.customOfferId = String(body.offerId); if (offer.durationDays) internal.durationDays = offer.durationDays; }
    // Persist first; a failed database write must never launch checkout.
    const ref = db.collection(BILLING_COLLECTIONS.ORDERS).doc(id);
    await ref.set(internal);
    const razorpay = await createRazorpayOrder({ amount: internal.finalAmount, currency: "INR", receipt: id, notes: { schoolId, userId: user.uid, planId, billingCycle: body.billingCycle } });
    if (Number(razorpay.amount) !== internal.finalAmount || razorpay.currency !== "INR") throw new Error("Gateway order amount mismatch.");
    await ref.update({ status: "CREATED", razorpayOrderId: razorpay.id, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, orderId: id, razorpayOrderId: razorpay.id, amount: internal.finalAmount, currency: "INR", key: credentials.keyId, planName: plan.data()?.name, billingCycle: body.billingCycle });
  } catch (error) {
    console.error("Billing order creation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout unavailable." }, { status: 503 });
  }
}
