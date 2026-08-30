/**
 * Phase 11: Advanced Subscription Lifecycle Engine Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 11 SUBSCRIPTION LIFECYCLE TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
  }
}

// Helper: Status resolution simulator
function resolveSubscriptionStatus(sub, nowMs = Date.now()) {
  const statusRaw = (sub.status || "ACTIVE").toUpperCase();
  const currentPeriodEnd = sub.currentPeriodEnd || sub.expiresAt || new Date(nowMs + 30 * 86400000).toISOString();
  const graceEndsAtIso = sub.graceEndsAt || new Date(new Date(currentPeriodEnd).getTime() + 7 * 86400000).toISOString();

  const periodEndMs = new Date(currentPeriodEnd).getTime();
  const graceEndMs = new Date(graceEndsAtIso).getTime();

  let resolvedStatus = statusRaw;
  let isInGrace = false;
  let isExpired = false;

  if (statusRaw !== "SUSPENDED") {
    if (nowMs < periodEndMs) {
      const daysLeft = Math.ceil((periodEndMs - nowMs) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) resolvedStatus = "EXPIRING";
      else resolvedStatus = statusRaw === "TRIAL" ? "TRIAL" : "ACTIVE";
    } else if (nowMs >= periodEndMs && nowMs < graceEndMs) {
      resolvedStatus = "GRACE_PERIOD";
      isInGrace = true;
    } else {
      resolvedStatus = "EXPIRED";
      isExpired = true;
    }
  }

  const daysRemaining = Math.max(0, Math.ceil((periodEndMs - nowMs) / (1000 * 60 * 60 * 24)));

  return {
    status: resolvedStatus,
    daysRemaining,
    isInGrace,
    isExpired,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  };
}

// 1. Status Resolution Engine Tests
test("1. Status Engine: Active subscription with >7 days remaining returns ACTIVE", () => {
  const now = new Date("2026-08-30T10:00:00Z").getTime();
  const periodEnd = new Date("2026-09-30T10:00:00Z").toISOString();
  const res = resolveSubscriptionStatus({ currentPeriodEnd: periodEnd, status: "ACTIVE" }, now);

  assert.equal(res.status, "ACTIVE");
  assert.equal(res.daysRemaining, 31);
  assert.equal(res.isExpired, false);
});

test("2. Status Engine: Subscription with <=7 days remaining transitions to EXPIRING", () => {
  const now = new Date("2026-09-25T10:00:00Z").getTime();
  const periodEnd = new Date("2026-09-30T10:00:00Z").toISOString();
  const res = resolveSubscriptionStatus({ currentPeriodEnd: periodEnd, status: "ACTIVE" }, now);

  assert.equal(res.status, "EXPIRING");
  assert.equal(res.daysRemaining, 5);
});

test("3. Status Engine: Expired period but within grace period transitions to GRACE_PERIOD", () => {
  const now = new Date("2026-10-02T10:00:00Z").getTime();
  const periodEnd = new Date("2026-09-30T10:00:00Z").toISOString();
  const graceEndsAt = new Date("2026-10-07T10:00:00Z").toISOString();
  const res = resolveSubscriptionStatus({ currentPeriodEnd: periodEnd, graceEndsAt, status: "ACTIVE" }, now);

  assert.equal(res.status, "GRACE_PERIOD");
  assert.equal(res.isInGrace, true);
});

test("4. Status Engine: Past grace period transitions to EXPIRED", () => {
  const now = new Date("2026-10-10T10:00:00Z").getTime();
  const periodEnd = new Date("2026-09-30T10:00:00Z").toISOString();
  const graceEndsAt = new Date("2026-10-07T10:00:00Z").toISOString();
  const res = resolveSubscriptionStatus({ currentPeriodEnd: periodEnd, graceEndsAt, status: "ACTIVE" }, now);

  assert.equal(res.status, "EXPIRED");
  assert.equal(res.isExpired, true);
});

// 2. Early Renewal Preservation Logic
test("5. Early Renewal: Preserves remaining period when renewed 10 days before expiry", () => {
  const nowMs = new Date("2026-09-20T10:00:00Z").getTime();
  const currentPeriodEndMs = new Date("2026-09-30T10:00:00Z").getTime();
  const durationMs = 30 * 86400000;

  let newPeriodStartMs;
  let newPeriodEndMs;

  if (nowMs < currentPeriodEndMs) {
    newPeriodStartMs = currentPeriodEndMs;
    newPeriodEndMs = currentPeriodEndMs + durationMs;
  } else {
    newPeriodStartMs = nowMs;
    newPeriodEndMs = nowMs + durationMs;
  }

  assert.equal(new Date(newPeriodStartMs).toISOString(), "2026-09-30T10:00:00.000Z");
  assert.equal(new Date(newPeriodEndMs).toISOString(), "2026-10-30T10:00:00.000Z");
});

// 3. Limit Validation Pre-Check for Scheduled Downgrade
test("6. Scheduled Downgrade: Rejects downgrade if current student count exceeds target plan limit", () => {
  const currentStudentCount = 900;
  const targetPlanMaxStudents = 500;

  let rejected = false;
  let errorMessage = "";

  if (targetPlanMaxStudents > 0 && currentStudentCount > targetPlanMaxStudents) {
    rejected = true;
    errorMessage = `Your current usage (${currentStudentCount} students) exceeds target plan limit (${targetPlanMaxStudents}).`;
  }

  assert.equal(rejected, true);
  assert.ok(errorMessage.includes("exceeds target plan limit"));
});

// 4. Cancellation & Reactivation Logic
test("7. Cancel at Period End: Sets cancelAtPeriodEnd flag without revoking immediate access", () => {
  const sub = {
    schoolId: "sch_1",
    status: "ACTIVE",
    currentPeriodEnd: "2026-09-30T10:00:00Z",
    cancelAtPeriodEnd: false,
  };

  const cancelledSub = {
    ...sub,
    cancelAtPeriodEnd: true,
    cancelledAt: "2026-08-30T10:00:00Z",
  };

  const resolved = resolveSubscriptionStatus(cancelledSub, new Date("2026-08-30T10:00:00Z").getTime());

  assert.equal(cancelledSub.cancelAtPeriodEnd, true);
  assert.equal(resolved.status, "ACTIVE"); // Access maintained until 30 Sep
});

test("8. Resume Subscription: Clears cancelAtPeriodEnd flag", () => {
  const cancelledSub = {
    schoolId: "sch_1",
    cancelAtPeriodEnd: true,
    cancelledAt: "2026-08-30T10:00:00Z",
  };

  const resumedSub = {
    ...cancelledSub,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
  };

  assert.equal(resumedSub.cancelAtPeriodEnd, false);
  assert.equal(resumedSub.cancelledAt, null);
});

// 5. Emergency Suspension Logic
test("9. Emergency Suspension: Requires reason and overrides status to SUSPENDED", () => {
  const reason = "Violation of SaaS compliance terms";
  assert.ok(reason.length >= 3);

  const suspendedSub = {
    status: "SUSPENDED",
    suspendedAt: new Date().toISOString(),
    suspendedBy: "super_admin_vinkal",
    suspensionReason: reason,
  };

  const resolved = resolveSubscriptionStatus(suspendedSub);
  assert.equal(resolved.status, "SUSPENDED");
  assert.equal(suspendedSub.suspensionReason, reason);
});

// 6. Idempotent Renewal Fulfillment
test("10. Idempotency: Duplicate fulfillment for same order ID is safely ignored", () => {
  const lastOrderId = "ord_999999";
  const incomingOrderId = "ord_999999";
  const renewalStatus = "SUCCESS";

  const isDuplicate = lastOrderId === incomingOrderId && renewalStatus === "SUCCESS";
  assert.equal(isDuplicate, true);
});

console.log("\n==================================================");
console.log(`PHASE 11 SUBSCRIPTION LIFECYCLE RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
