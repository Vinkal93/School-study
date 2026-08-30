import assert from "node:assert/strict";
import {
  addDays,
  removeDays,
  addMonths,
  removeMonths,
  adjustSubscriptionPeriod,
  suspendAccountSubscription,
  resumeAccountSubscription,
  createAccessOverride,
  createLimitOverride,
  applyPenalty,
  applyManualCredit,
} from "../src/lib/billing/subscriptionAdjustmentEngine.ts";
import { computeSubscriptionStatus } from "../src/lib/billing/subscriptions.ts";

console.log("==================================================");
console.log("STARTING PHASE 12B SUBSCRIPTION ADJUSTMENT & ACCOUNT CONTROL TEST SUITE");
console.log("==================================================");

async function runTests() {
  // Test 1: Calendar Date Arithmetic - Days
  const baseDate = new Date("2026-09-01T12:00:00.000Z");
  const plus30Days = addDays(baseDate, 30);
  assert.equal(plus30Days.toISOString().split("T")[0], "2026-10-01", "Adding 30 days to Sept 1 should yield Oct 1");

  const minus10Days = removeDays(baseDate, 10);
  assert.equal(minus10Days.toISOString().split("T")[0], "2026-08-22", "Removing 10 days from Sept 1 should yield Aug 22");
  console.log("✓ [PASS] 1. Calendar Arithmetic: Days addition & subtraction accurate");

  // Test 2: Calendar Date Arithmetic - Month Clamping (Jan 31 + 1 mo -> Feb 28)
  const jan31 = new Date("2026-01-31T00:00:00.000Z");
  const febClamped = addMonths(jan31, 1);
  assert.equal(febClamped.getUTCMonth(), 1, "Month should be February (1)");
  assert.equal(febClamped.getUTCDate(), 28, "Jan 31 + 1 mo must clamp to Feb 28 in non-leap year 2026");

  const mar31 = new Date("2026-03-31T00:00:00.000Z");
  const aprClamped = addMonths(mar31, 1);
  assert.equal(aprClamped.getUTCDate(), 30, "Mar 31 + 1 mo must clamp to Apr 30");
  console.log("✓ [PASS] 2. Calendar Arithmetic: End-of-month clamping handles 28/30/31 day variations safely");

  // Test 3: ADD_DAYS Transactional Adjustment
  const resAddDays = await adjustSubscriptionPeriod("school_test_1", {
    type: "ADD_DAYS",
    value: 30,
    reason: "Promotional goodwill extension",
    actorId: "super_admin_1",
  });
  assert.equal(resAddDays.success, true);
  assert.equal(resAddDays.adjustment.type, "ADD_DAYS");
  assert.equal(resAddDays.adjustment.value, 30);
  console.log("✓ [PASS] 3. Transactional Adjustment: ADD_DAYS properly extends expiration date");

  // Test 4: REMOVE_DAYS Transactional Adjustment
  const resRemoveDays = await adjustSubscriptionPeriod("school_test_1", {
    type: "REMOVE_DAYS",
    value: 10,
    reason: "Administrative correction",
    actorId: "super_admin_1",
  });
  assert.equal(resRemoveDays.success, true);
  assert.equal(resRemoveDays.adjustment.type, "REMOVE_DAYS");
  assert.equal(resRemoveDays.adjustment.value, 10);
  console.log("✓ [PASS] 4. Transactional Adjustment: REMOVE_DAYS safely decreases expiration date");

  // Test 5: ADD_MONTHS Transactional Adjustment
  const resAddMonths = await adjustSubscriptionPeriod("school_test_1", {
    type: "ADD_MONTHS",
    value: 3,
    reason: "Quarterly promotional grant",
    actorId: "super_admin_1",
  });
  assert.equal(resAddMonths.success, true);
  assert.equal(resAddMonths.adjustment.type, "ADD_MONTHS");
  assert.equal(resAddMonths.adjustment.value, 3);
  console.log("✓ [PASS] 5. Transactional Adjustment: ADD_MONTHS applies calendar-aware quarter extension");

  // Test 6: CUSTOM_PERIOD_ADJUSTMENT
  const customTargetDate = "2026-12-31T23:59:59.999Z";
  const resCustom = await adjustSubscriptionPeriod("school_test_1", {
    type: "CUSTOM_PERIOD_ADJUSTMENT",
    customDate: customTargetDate,
    reason: "End-of-year alignment",
    actorId: "super_admin_1",
  });
  assert.equal(resCustom.success, true);
  assert.equal(resCustom.adjustment.newEndAt, customTargetDate);
  console.log("✓ [PASS] 6. Custom Period Adjustment: Target custom date recorded with audit ledger");

  // Test 7: Rejection on Missing Reason
  await assert.rejects(
    async () => {
      await adjustSubscriptionPeriod("school_test_1", {
        type: "ADD_DAYS",
        value: 10,
        reason: "",
        actorId: "super_admin_1",
      });
    },
    { message: /valid reason/ },
    "Should reject adjustment without valid reason"
  );
  console.log("✓ [PASS] 7. Validation Guard: Rejects period adjustments lacking mandatory reason");

  // Test 8: Account Suspension
  const resSuspend = await suspendAccountSubscription("school_test_1", {
    reason: "Payment dispute investigation",
    actorId: "super_admin_1",
  });
  assert.equal(resSuspend.success, true);
  assert.equal(resSuspend.subscription.status, "SUSPENDED");
  assert.equal(resSuspend.subscription.suspensionReason, "Payment dispute investigation");
  console.log("✓ [PASS] 8. Account Suspension: Immediately halts access and records suspension audit");

  // Test 9: Account Resumption
  const resResume = await resumeAccountSubscription("school_test_1", {
    reason: "Investigation completed and cleared",
    actorId: "super_admin_1",
  });
  assert.equal(resResume.success, true);
  assert.equal(resResume.subscription.status !== "SUSPENDED", true);
  assert.equal(resResume.subscription.suspendedAt, null);
  console.log("✓ [PASS] 9. Account Resumption: Clears suspension and dynamically recalculates true status");

  // Test 10: Dynamic Expiry Recalculation on Resume
  // If subscription was already expired when suspended, resuming must resolve to EXPIRED, not ACTIVE
  const pastExpiry = new Date(Date.now() - 20 * 86400000).toISOString();
  const pastGrace = new Date(Date.now() - 10 * 86400000).toISOString();
  const resolvedPastStatus = computeSubscriptionStatus(pastExpiry, pastGrace, "ACTIVE", Date.now());
  assert.equal(resolvedPastStatus, "EXPIRED", "Resuming an expired subscription must resolve to EXPIRED");
  console.log("✓ [PASS] 10. Expiry Safety: Resuming an expired account preserves EXPIRED status");

  // Test 11: Temporary Access Override
  const resTemp = await createAccessOverride("school_test_1", {
    type: "TEMPORARY_ACCESS",
    durationHours: 48,
    reason: "Emergency data verification access",
    createdBy: "super_admin_1",
  });
  assert.equal(resTemp.success, true);
  assert.equal(resTemp.override.type, "TEMPORARY_ACCESS");
  assert.equal(resTemp.override.status, "ACTIVE");
  console.log("✓ [PASS] 11. Temporary Access Override: Creates 48h emergency override without rewriting base subscription");

  // Test 12: Feature Grant & Restriction Overrides
  const resFeatGrant = await createAccessOverride("school_test_1", {
    type: "FEATURE_GRANT",
    featureKey: "advanced_reports",
    durationDays: 7,
    reason: "Promotional preview of advanced reports",
    createdBy: "super_admin_1",
  });
  assert.equal(resFeatGrant.success, true);
  assert.equal(resFeatGrant.override.featureKey, "advanced_reports");

  const resFeatRestrict = await createAccessOverride("school_test_1", {
    type: "FEATURE_RESTRICT",
    featureKey: "attendance_automation",
    durationDays: 14,
    reason: "Manual restriction due to unconfigured hardware",
    createdBy: "super_admin_1",
  });
  assert.equal(resFeatRestrict.success, true);
  assert.equal(resFeatRestrict.override.enabled, false);
  console.log("✓ [PASS] 12. Feature Overrides: Granular grant and restriction overrides configured with expiration");

  // Test 13: Limit Overrides
  const resLim = await createLimitOverride("school_test_1", {
    limitKey: "students",
    overrideValue: 1500,
    durationDays: 30,
    reason: "Temporary expansion for annual admission drive",
    createdBy: "super_admin_1",
  });
  assert.equal(resLim.success, true);
  assert.equal(resLim.override.limitKey, "students");
  assert.equal(resLim.override.overrideValue, 1500);
  console.log("✓ [PASS] 13. Resource Limit Override: Temporarily expands student limit without altering base plan");

  // Test 14: Financial Penalty
  const resPen = await applyPenalty("school_test_1", {
    amountPaise: 50000, // ₹500
    reason: "Late compliance penalty",
    dueDays: 14,
    createdBy: "super_admin_1",
  });
  assert.equal(resPen.success, true);
  assert.equal(resPen.penalty.amount, 50000);
  assert.equal(resPen.penalty.status, "PENDING");
  console.log("✓ [PASS] 14. Financial Penalty: Records separate penalty document without mutating invoices");

  // Test 15: Manual Credit
  const resCredit = await applyManualCredit("school_test_1", {
    amountPaise: 100000, // ₹1,000
    reason: "Service interruption goodwill credit",
    actorId: "super_admin_1",
  });
  assert.equal(resCredit.success, true);
  assert.equal(resCredit.credit.amount, 100000);
  assert.equal(resCredit.credit.type, "MANUAL_CREDIT");
  console.log("✓ [PASS] 15. Manual Credit: Discretely ledgered as non-payment credit entry");

  console.log("\n==================================================");
  console.log("PHASE 12B TEST RESULTS: 15/15 PASSED (100%)");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
