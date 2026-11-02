import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "./server-access";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import { getRazorpayClientAsync } from "./razorpay/razorpayClient";
import { clearSubscriptionCache } from "@/lib/billing/subscriptions";

export async function updateRenewal(request: Request, action: "toggle" | "cancel" | "resume") {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    const schoolId = String(body.schoolId || actor.user.schoolId || "");
    if (!schoolId || !ownsBillingSchool(actor.user, schoolId)) return NextResponse.json({error:"School billing access denied."},{status:403});
    if (action === "toggle" && typeof body.autoRenew !== "boolean") return NextResponse.json({error:"autoRenew must be a boolean."},{status:400});
    const ref = actor.db.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({error:"Subscription not found."},{status:404});
    const current = snap.data()!;
    const enable = action === "resume" || (action === "toggle" && body.autoRenew);
    const mandateId = current.razorpaySubscriptionId;
    let autoRenew = false;
    if (mandateId) {
      const gateway = await getRazorpayClientAsync();
      const mandate = await gateway.subscriptions.fetch(mandateId);
      const mapping = await actor.db.collection("razorpaySubscriptions").doc(mandateId).get();
      if (!mapping.exists || mapping.data()?.schoolId !== schoolId) throw new Error("Recurring mandate ownership could not be verified.");
      if (enable) {
        if ((mandate.status as string) === "paused") await gateway.subscriptions.resume(mandateId, {resume_at:"now"});
        else if (mandate.status !== "active" || mandate.has_scheduled_changes || current.cancelAtPeriodEnd) return NextResponse.json({error:"Complete a new recurring checkout to enable autopay; a cancelled mandate cannot be resumed."},{status:409});
        autoRenew = true;
      } else if (!["cancelled","completed","expired"].includes(mandate.status)) await gateway.subscriptions.cancel(mandateId, true);
    } else if (action === "toggle" && enable) return NextResponse.json({error:"Complete recurring checkout before enabling automatic renewal."},{status:409});
    const updatedAt = new Date().toISOString();
    await actor.db.runTransaction(async tx => {
      const latest = await tx.get(ref);
      if (latest.data()?.razorpaySubscriptionId !== mandateId) throw new Error("Subscription changed. Refresh and retry.");
      tx.update(ref,{autoRenew,cancelAtPeriodEnd:!enable,updatedAt});
      tx.set(actor.db.collection(BILLING_COLLECTIONS.AUDIT_LOGS).doc(),{actorId:actor.user.uid,actorType:actor.user.role,action:"AUTO_RENEWAL_TOGGLED",entityType:"schoolSubscription",entityId:schoolId,schoolId,metadata:{autoRenew,cancelAtPeriodEnd:!enable},createdAt:updatedAt});
    });
    clearSubscriptionCache(schoolId);
    return NextResponse.json({success:true,autoRenew,cancelAtPeriodEnd:!enable,subscription:{...current,autoRenew,cancelAtPeriodEnd:!enable,updatedAt},message:enable ? (autoRenew ? "Automatic renewal enabled." : "Cancellation preference removed. Renew manually before expiry.") : "Renewal cancelled. Paid access remains until expiry."});
  } catch(error) {return NextResponse.json({error:error instanceof Error ? error.message : "Renewal could not be updated."},{status:503});}
}
