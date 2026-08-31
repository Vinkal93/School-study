import { NextResponse } from "next/server";
import {
  adjustSubscriptionPeriod,
  suspendAccountSubscription,
  resumeAccountSubscription,
  createAccessOverride,
  revokeAccessOverride,
  createLimitOverride,
  revokeLimitOverride,
  applyPenalty,
  waivePenalty,
  applyManualCredit,
} from "@/lib/billing/subscriptionAdjustmentEngine";
import type { SubscriptionAdjustmentType } from "@/types";

/**
 * POST /api/super-admin/subscriptions/[subscriptionId]/adjust
 * Super Admin Action Control Engine: Executes transactional subscription, access, limit, penalty and credit adjustments.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required." }, { status: 400 });
    }

    const { requireSuperAdmin } = await import("@/lib/auth/serverAuth");
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const actorId = auth.user!.uid;
    const actorRole = auth.user!.role;
    const {
      action,
      type,
      value,
      customDate,
      reason,
      requestId,
      // Overrides & Penalties fields
      featureKey,
      durationHours,
      durationDays,
      limitKey,
      overrideValue,
      amountPaise,
      overrideId,
      penaltyId,
      reference,
    } = body;

    const actionType = action || type;

    if (!actionType) {
      return NextResponse.json({ error: "Adjustment action/type is required." }, { status: 400 });
    }

    // 1. Subscription Period Adjustments
    if (
      actionType === "ADD_DAYS" ||
      actionType === "REMOVE_DAYS" ||
      actionType === "ADD_MONTHS" ||
      actionType === "REMOVE_MONTHS" ||
      actionType === "CUSTOM_PERIOD_ADJUSTMENT"
    ) {
      const result = await adjustSubscriptionPeriod(subscriptionId, {
        type: actionType as SubscriptionAdjustmentType,
        value: typeof value === "number" ? value : undefined,
        customDate,
        reason: reason || `Super Admin ${actionType.replace(/_/g, " ")} adjustment`,
        actorId,
        actorRole,
        requestId,
      });
      return NextResponse.json({
        ...result,
        message: `Subscription successfully adjusted via ${actionType.replace(/_/g, " ")}.`,
      });
    }

    // 2. Account Suspension
    if (actionType === "SUSPEND" || actionType === "SUSPENSION") {
      const result = await suspendAccountSubscription(subscriptionId, {
        reason: reason || "Account suspended by Super Admin.",
        actorId,
        actorRole,
      });
      return NextResponse.json({
        ...result,
        message: "School subscription successfully suspended.",
      });
    }

    // 3. Account Resumption
    if (actionType === "RESUME" || actionType === "RESTORE_ACCESS") {
      const result = await resumeAccountSubscription(subscriptionId, {
        reason: reason || "Suspension removed by Super Admin.",
        actorId,
        actorRole,
      });
      return NextResponse.json({
        ...result,
        message: "School subscription successfully resumed.",
      });
    }

    // 4. Temporary Access / Feature Grant / Feature Restriction Overrides
    if (
      actionType === "TEMPORARY_ACCESS" ||
      actionType === "FEATURE_GRANT" ||
      actionType === "FEATURE_RESTRICT"
    ) {
      const result = await createAccessOverride(subscriptionId, {
        type: actionType,
        featureKey,
        durationHours: typeof durationHours === "number" ? durationHours : undefined,
        durationDays: typeof durationDays === "number" ? durationDays : undefined,
        customEndAt: customDate,
        reason: reason || `Super Admin manual ${actionType.replace(/_/g, " ")}`,
        createdBy: actorId,
      });
      return NextResponse.json({
        ...result,
        message: `Access override (${actionType}) successfully created.`,
      });
    }

    // 5. Revoke Access Override
    if (actionType === "REVOKE_ACCESS_OVERRIDE") {
      if (!overrideId) return NextResponse.json({ error: "overrideId is required to revoke override." }, { status: 400 });
      await revokeAccessOverride(overrideId, subscriptionId, actorId);
      return NextResponse.json({
        success: true,
        message: "Access override revoked successfully.",
      });
    }

    // 6. Limit Overrides
    if (actionType === "LIMIT_OVERRIDE") {
      if (!limitKey || typeof overrideValue !== "number") {
        return NextResponse.json({ error: "limitKey and overrideValue are required." }, { status: 400 });
      }
      const result = await createLimitOverride(subscriptionId, {
        limitKey,
        overrideValue,
        durationDays: durationDays || 30,
        reason: reason || "Super Admin limit override",
        createdBy: actorId,
      });
      return NextResponse.json({
        ...result,
        message: `Resource limit override for ${limitKey} created successfully.`,
      });
    }

    if (actionType === "REVOKE_LIMIT_OVERRIDE") {
      if (!overrideId) return NextResponse.json({ error: "overrideId is required." }, { status: 400 });
      await revokeLimitOverride(overrideId, subscriptionId, actorId);
      return NextResponse.json({
        success: true,
        message: "Limit override revoked successfully.",
      });
    }

    // 7. Penalties
    if (actionType === "PENALTY") {
      if (typeof amountPaise !== "number" || amountPaise <= 0) {
        return NextResponse.json({ error: "A positive penalty amount in paise is required." }, { status: 400 });
      }
      const result = await applyPenalty(subscriptionId, {
        amountPaise,
        reason: reason || "Late payment or administrative penalty",
        dueDays: durationDays || 14,
        createdBy: actorId,
      });
      return NextResponse.json({
        ...result,
        message: "Penalty recorded successfully.",
      });
    }

    if (actionType === "WAIVE_PENALTY") {
      if (!penaltyId) return NextResponse.json({ error: "penaltyId is required to waive penalty." }, { status: 400 });
      await waivePenalty(penaltyId, subscriptionId, reason || "Waived by Super Admin", actorId);
      return NextResponse.json({
        success: true,
        message: "Penalty waived successfully.",
      });
    }

    // 8. Manual Credit
    if (actionType === "MANUAL_CREDIT") {
      if (typeof amountPaise !== "number" || amountPaise <= 0) {
        return NextResponse.json({ error: "A positive credit amount in paise is required." }, { status: 400 });
      }
      const result = await applyManualCredit(subscriptionId, {
        amountPaise,
        reason: reason || "Promotional or adjustment credit",
        actorId,
        reference,
      });
      return NextResponse.json({
        ...result,
        message: "Manual credit applied successfully.",
      });
    }

    return NextResponse.json({ error: `Unsupported action type: ${actionType}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST Subscription Adjustment Error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to apply subscription adjustment." },
      { status: 500 }
    );
  }
}
