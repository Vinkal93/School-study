import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { getActivePlanVersion } from "@/lib/billing/plans";
import { logAuditEvent } from "@/lib/services/audit.service";
import type { AuditAction, AuditTargetType } from "@/types/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;

    const body = await request.json().catch(() => ({}));
    const schoolId = String(body.schoolId || actor.user.schoolId || "");

    if (!schoolId || !ownsBillingSchool(actor.user, schoolId)) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    const schoolRef = actor.db.collection("schools").doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    // 1. Validate that the Free plan exists and is active
    const freeVersion = await getActivePlanVersion("plan_free");
    if (!freeVersion) {
      return NextResponse.json(
        { error: "Free Starter plan is currently unavailable. Please contact support." },
        { status: 503 }
      );
    }

    const subRef = actor.db.collection("schoolSubscriptions").doc(schoolId);
    const subSnap = await subRef.get();
    const existingSub = subSnap.exists ? subSnap.data() : null;

    // Idempotency: If already active on Free plan and onboarding is complete, return success
    const schoolData = schoolSnap.data()!;
    if (
      existingSub?.planId === "plan_free" &&
      existingSub?.status === "ACTIVE" &&
      schoolData.onboardingStatus === "ONBOARDING_COMPLETE"
    ) {
      return NextResponse.json({
        success: true,
        message: "Free plan is already active.",
        redirectUrl: "/admin",
      });
    }

    const now = new Date().toISOString();
    // 100 years or indefinite active period for permanent free starter tier
    const expiryDate = new Date(Date.now() + 100 * 365 * 86400000).toISOString();

    // 2. Atomically activate free subscription & update school onboarding status
    await actor.db.runTransaction(async (tx) => {
      tx.set(
        subRef,
        {
          id: schoolId,
          schoolId,
          planId: "plan_free",
          planVersionId: freeVersion.id,
          status: "ACTIVE",
          billingCycle: "monthly",
          startsAt: now,
          expiresAt: expiryDate,
          source: "free_onboarding",
          autoRenew: false,
          cancelAtPeriodEnd: false,
          updatedAt: now,
          createdAt: existingSub?.createdAt || now,
        },
        { merge: true }
      );

      tx.update(schoolRef, {
        planId: "plan_free",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: expiryDate,
        onboardingStatus: "ONBOARDING_COMPLETE",
        updatedAt: now,
      });

      // Initialize usage limits if not yet existing
      const usageRef = actor.db.collection("schoolUsage").doc(schoolId);
      tx.set(
        usageRef,
        {
          schoolId,
          students: 0,
          teachers: 0,
          classes: 0,
          staff: 1,
          lastReconciledAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    // 3. Security audit logging
    await logAuditEvent({
      actorId: actor.user.uid,
      actorName: (actor.user as any).name || "School Admin",
      actorEmail: (actor.user as any).email || "",
      actorRole: actor.user.role as any,
      actorSchoolId: schoolId,
      targetUserId: actor.user.uid,
      targetSchoolId: schoolId,
      action: "SUBSCRIPTION_ACTIVATED" as AuditAction,
      entityType: "school" as AuditTargetType,
      entityId: schoolId,
      reason: "Free Starter Plan activated during school onboarding.",
      metadata: {
        planId: "plan_free",
        planVersionId: freeVersion.id,
        source: "free_onboarding",
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Free Starter Plan activated successfully! Welcome to SchoolStudy.",
      redirectUrl: "/admin",
      planId: "plan_free",
      limits: freeVersion.limits,
    });
  } catch (error: any) {
    console.error("POST /api/billing/onboarding/free-plan error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to activate Free Starter Plan." },
      { status: 500 }
    );
  }
}
