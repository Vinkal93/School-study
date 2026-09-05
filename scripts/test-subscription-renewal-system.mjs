// @ts-check
/**
 * Automated Test Suite: Subscription Renewal & Responsive System
 * 
 * Verifies:
 * 1. Dynamic countdown string generation (0 days -> today, 1 day -> tomorrow, N days -> in N days)
 * 2. Super Admin configurable threshold gating (e.g. 7 days vs 10 days)
 * 3. Expired & Grace period state handling
 * 4. Lifetime and cancelled subscription bypass
 * 5. Deterministic notification idempotency keys for Super Admin global notifications
 * 6. Access policy threshold boundary validation (0 to 90 days)
 */

import assert from "node:assert/strict";

console.log("=================================================");
console.log("TEST SUITE: SUBSCRIPTION RENEWAL DYNAMICS & GATING");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. Dynamic Countdown Logic Verification
// -------------------------------------------------------------
function computeCountdownText(daysRemaining) {
  if (daysRemaining === 0) {
    return "Your School Study plan expires today. Recharge now to keep your school running smoothly.";
  } else if (daysRemaining === 1) {
    return "Your School Study plan expires tomorrow. Recharge now to keep your school running smoothly.";
  } else {
    return `Your School Study plan expires in ${daysRemaining} days. Recharge now to keep your school running smoothly.`;
  }
}

runTest("Countdown: 0 days shows 'expires today' (never hardcoded 30 days)", () => {
  const text = computeCountdownText(0);
  assert.equal(text.includes("expires today"), true);
  assert.equal(text.includes("30 days"), false);
});

runTest("Countdown: 1 day shows 'expires tomorrow'", () => {
  const text = computeCountdownText(1);
  assert.equal(text.includes("expires tomorrow"), true);
  assert.equal(text.includes("1 days"), false);
  assert.equal(text.includes("30 days"), false);
});

runTest("Countdown: 4 days shows 'expires in 4 days'", () => {
  const text = computeCountdownText(4);
  assert.equal(text.includes("expires in 4 days"), true);
  assert.equal(text.includes("30 days"), false);
});

runTest("Countdown: 12 days shows 'expires in 12 days'", () => {
  const text = computeCountdownText(12);
  assert.equal(text.includes("expires in 12 days"), true);
  assert.equal(text.includes("30 days"), false);
});

// -------------------------------------------------------------
// 2. Super Admin Configurable Threshold Gating
// -------------------------------------------------------------
function evaluateRenewalNotice(sub, policy, nowMs = Date.now()) {
  if (sub.status === "CANCELLED") {
    return { shouldRemind: true, severity: "expired", message: "Cancelled" };
  }
  if (sub.billingCycle === "lifetime" || sub.isLifetime) {
    return { shouldRemind: false, daysRemaining: 9999 };
  }

  const expiresAtMs = new Date(sub.expiresAt).getTime();
  const daysRemaining = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 86400000));
  const isExpired = expiresAtMs < nowMs;

  if (isExpired) {
    return { shouldRemind: true, severity: "expired", daysRemaining: 0 };
  }

  const configuredThreshold =
    typeof policy.renewalNoticeThresholdDays === "number"
      ? policy.renewalNoticeThresholdDays
      : policy.reminderDays && policy.reminderDays.length > 0
      ? Math.max(...policy.reminderDays)
      : 7;

  if (daysRemaining > configuredThreshold) {
    return { shouldRemind: false, daysRemaining };
  }

  return {
    shouldRemind: true,
    daysRemaining,
    message: computeCountdownText(daysRemaining),
    severity: daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "urgent" : "warning",
  };
}

runTest("Threshold Gating: When threshold is 7 days, 10 days remaining returns shouldRemind = false", () => {
  const now = Date.now();
  const sub = {
    status: "ACTIVE",
    billingCycle: "monthly",
    expiresAt: new Date(now + 10 * 86400000).toISOString(),
  };
  const policy = {
    renewalNoticeThresholdDays: 7,
    reminderDays: [7, 3, 1],
  };

  const res = evaluateRenewalNotice(sub, policy, now);
  assert.equal(res.shouldRemind, false);
  assert.equal(res.daysRemaining, 10);
});

runTest("Threshold Gating: When Super Admin increases threshold to 15 days, 10 days remaining returns shouldRemind = true", () => {
  const now = Date.now();
  const sub = {
    status: "ACTIVE",
    billingCycle: "monthly",
    expiresAt: new Date(now + 10 * 86400000).toISOString(),
  };
  const policy = {
    renewalNoticeThresholdDays: 15,
    reminderDays: [15, 7, 3, 1],
  };

  const res = evaluateRenewalNotice(sub, policy, now);
  assert.equal(res.shouldRemind, true);
  assert.equal(res.daysRemaining, 10);
  assert.equal(res.message.includes("expires in 10 days"), true);
});

runTest("Threshold Gating: When threshold is 3 days, 5 days remaining returns shouldRemind = false", () => {
  const now = Date.now();
  const sub = {
    status: "ACTIVE",
    billingCycle: "monthly",
    expiresAt: new Date(now + 5 * 86400000).toISOString(),
  };
  const policy = {
    renewalNoticeThresholdDays: 3,
  };

  const res = evaluateRenewalNotice(sub, policy, now);
  assert.equal(res.shouldRemind, false);
});

runTest("Threshold Gating: When threshold is 3 days, 2 days remaining returns shouldRemind = true with urgent severity", () => {
  const now = Date.now();
  const sub = {
    status: "ACTIVE",
    billingCycle: "monthly",
    expiresAt: new Date(now + 2 * 86400000).toISOString(),
  };
  const policy = {
    renewalNoticeThresholdDays: 3,
  };

  const res = evaluateRenewalNotice(sub, policy, now);
  assert.equal(res.shouldRemind, true);
  assert.equal(res.severity, "urgent");
  assert.equal(res.daysRemaining, 2);
  assert.equal(res.message.includes("expires in 2 days"), true);
});

// -------------------------------------------------------------
// 3. Lifetime and Cancelled Subscription Edge Cases
// -------------------------------------------------------------
runTest("Edge Case: Lifetime plans never show renewal countdowns", () => {
  const sub = {
    status: "ACTIVE",
    billingCycle: "lifetime",
    expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  };
  const policy = { renewalNoticeThresholdDays: 30 };

  const res = evaluateRenewalNotice(sub, policy);
  assert.equal(res.shouldRemind, false);
});

runTest("Edge Case: Cancelled plan immediately flags expired notice", () => {
  const sub = {
    status: "CANCELLED",
    billingCycle: "monthly",
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
  };
  const policy = { renewalNoticeThresholdDays: 7 };

  const res = evaluateRenewalNotice(sub, policy);
  assert.equal(res.shouldRemind, true);
  assert.equal(res.severity, "expired");
});

// -------------------------------------------------------------
// 4. Deterministic Super Admin Idempotency Keys
// -------------------------------------------------------------
function generateSuperAdminIdempotencyKey(schoolId, daysRemaining, expiryDateStr) {
  return `superadmin_exp_${schoolId}_${daysRemaining}d_${expiryDateStr}`;
}

runTest("Idempotency: Keys are deterministic across repeated runs on same day count and date", () => {
  const k1 = generateSuperAdminIdempotencyKey("school_abc", 5, "2026-09-10");
  const k2 = generateSuperAdminIdempotencyKey("school_abc", 5, "2026-09-10");
  assert.equal(k1, k2);
  assert.equal(k1, "superadmin_exp_school_abc_5d_2026-09-10");
});

runTest("Idempotency: Keys change when days count ticks down to next day", () => {
  const kDay5 = generateSuperAdminIdempotencyKey("school_abc", 5, "2026-09-10");
  const kDay4 = generateSuperAdminIdempotencyKey("school_abc", 4, "2026-09-10");
  assert.notEqual(kDay5, kDay4);
});

// -------------------------------------------------------------
// 5. Threshold Input Boundary Validation
// -------------------------------------------------------------
function validateThreshold(input) {
  const val = parseInt(input, 10);
  if (isNaN(val) || val < 0 || val > 90) {
    return { valid: false, error: "Renewal notice threshold must be an integer between 0 and 90 days." };
  }
  return { valid: true, value: val };
}

runTest("Validation: Valid thresholds (0, 7, 15, 30, 90) pass", () => {
  for (const t of [0, 7, 15, 30, 90]) {
    assert.equal(validateThreshold(t).valid, true);
  }
});

runTest("Validation: Out-of-range thresholds (-1, 91, 365) fail", () => {
  assert.equal(validateThreshold(-1).valid, false);
  assert.equal(validateThreshold(91).valid, false);
  assert.equal(validateThreshold(365).valid, false);
  assert.equal(validateThreshold("abc").valid, false);
});

console.log("\n=================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
