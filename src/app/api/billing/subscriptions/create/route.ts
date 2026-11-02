import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { calculateServerBillingPrice } from "@/lib/billing/gstCouponsEngine";
import { createRazorpayPlan, createRazorpaySubscription, loadRazorpayCredentials } from "@/lib/payments/razorpay";
export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    const schoolId = String(body.schoolId || actor.user.schoolId || "");
    if (!schoolId || !ownsBillingSchool(actor.user, schoolId)) return NextResponse.json({ error: "School access denied." }, { status: 403 });
    if (!["monthly", "annual"].includes(body.billingCycle)) return NextResponse.json({ error: "Choose monthly or annual billing." }, { status: 400 });
    if (!(await actor.db.collection("schools").doc(schoolId).get()).exists) return NextResponse.json({ error: "School not found." }, { status: 404 });
    if (body.offerId) return NextResponse.json({ error: "Use one-time checkout for an offer; recurring pricing must use the published plan." }, { status: 400 });
    const price = await calculateServerBillingPrice({ planId: body.planId, billingCycle: body.billingCycle });
    if (!Number.isSafeInteger(price.finalAmountPaise) || price.finalAmountPaise <= 0) return NextResponse.json({ error: "A payable published plan is required." }, { status: 400 });
    const credentials = await loadRazorpayCredentials();
    if (!credentials.keyId || !credentials.keySecret || !credentials.webhookSecret) return NextResponse.json({ error: "Razorpay keys and webhook secret are required for recurring billing." }, { status: 503 });
    const plan = await createRazorpayPlan({ period: body.billingCycle === "annual" ? "yearly" : "monthly", interval: 1, name: price.planName, amountPaise: price.finalAmountPaise, currency: "INR" });
    const subscription = await createRazorpaySubscription({ planId: plan.id, totalCount: body.billingCycle === "annual" ? 10 : 120, customerNotify: true, notes: { schoolId, planId: body.planId, actorId: actor.user.uid } });
    await actor.db.collection("razorpaySubscriptions").doc(subscription.id).set({ schoolId, userId: actor.user.uid, planId: body.planId, planVersionId: price.planVersionId, billingCycle: body.billingCycle, razorpayPlanId: plan.id, amountPaise: price.finalAmountPaise, baseAmount: price.baseAmountPaise, discountAmount: price.discountAmountPaise, taxAmount: price.gstAmountPaise, status: "PENDING", createdAt: new Date().toISOString() });
    // Keep existing paid access intact; only a verified charge activates the new plan.
    return NextResponse.json({ success: true, subscriptionId: subscription.id, razorpaySubscriptionId: subscription.id, razorpayPlanId: plan.id, amountPaise: price.finalAmountPaise, amountRupees: price.finalAmountPaise / 100, currency: "INR", keyId: credentials.keyId, plan: { id: body.planId, name: price.planName, billingCycle: body.billingCycle } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Recurring checkout unavailable." }, { status: 503 }); }
}
