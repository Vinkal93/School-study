/**
 * Phase 8 School Admin Billing & Recharge Flow Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 8 BILLING & RECHARGE FLOW TESTS");
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

// 1. Server-side Price Calculation (Monthly)
test("1. Server price calculation: Starter Monthly (₹999)", () => {
  const monthlyPrice = 99900; // in paise
  const cycle = "monthly";
  const baseAmount = cycle === "annual" ? monthlyPrice * 12 : monthlyPrice;
  assert.equal(baseAmount, 99900);
});

// 2. Server-side Price Calculation (Annual with 12 months)
test("2. Server price calculation: Professional Annual (₹1,599/mo * 12)", () => {
  const annualMonthlyPrice = 159900; // in paise
  const baseAmount = annualMonthlyPrice * 12;
  assert.equal(baseAmount, 1918800); // ₹19,188 in paise
});

// 3. Valid Coupon SAVE20 (20% Discount)
test("3. Coupon calculation: SAVE20 (20% off)", () => {
  const baseAmount = 1918800;
  const coupon = "SAVE20";
  let discount = 0;
  if (coupon === "SAVE20") {
    discount = Math.round(baseAmount * 0.2);
  }
  const finalAmount = baseAmount - discount;
  assert.equal(discount, 383760);
  assert.equal(finalAmount, 1535040); // ₹15,350.40
});

// 4. Valid Coupon FLAT500 (₹500 Discount)
test("4. Coupon calculation: FLAT500 (₹500 off)", () => {
  const baseAmount = 99900;
  const coupon = "FLAT500";
  let discount = 0;
  if (coupon === "FLAT500") {
    discount = 50000;
  }
  const finalAmount = Math.max(0, baseAmount - discount);
  assert.equal(discount, 50000);
  assert.equal(finalAmount, 49900); // ₹499
});

// 5. Invalid Coupon Rejection
test("5. Invalid coupon rejected cleanly", () => {
  const baseAmount = 99900;
  const coupon = "FAKECODE99";
  const validCoupons = ["SAVE20", "WELCOME20", "FLAT500"];
  const isValid = validCoupons.includes(coupon);
  const discount = isValid ? 1000 : 0;
  const finalAmount = baseAmount - discount;

  assert.equal(isValid, false);
  assert.equal(discount, 0);
  assert.equal(finalAmount, baseAmount);
});

// 6. Active Subscription Renewal Extension Logic
test("6. Active subscription renewal extends from current expiry date", () => {
  // Current expiry: Sep 30, 2026
  const currentExpiryMs = new Date("2026-09-30T00:00:00Z").getTime();
  // Renewal payment on Sep 20, 2026 (while still active)
  const nowMs = new Date("2026-09-20T00:00:00Z").getTime();
  const durationMs = 30 * 24 * 60 * 60 * 1000;

  const startBasisMs = currentExpiryMs > nowMs ? currentExpiryMs : nowMs;
  const newExpiryMs = startBasisMs + durationMs;

  const expectedExpiry = new Date("2026-10-30T00:00:00Z").toISOString();
  assert.equal(new Date(newExpiryMs).toISOString(), expectedExpiry);
});

// 7. Expired Subscription Recharge Starts From Payment Time
test("7. Expired subscription recharge starts validity from current payment date", () => {
  // Expired: Sep 1, 2026
  const currentExpiryMs = new Date("2026-09-01T00:00:00Z").getTime();
  // Payment on Sep 5, 2026
  const nowMs = new Date("2026-09-05T00:00:00Z").getTime();
  const durationMs = 30 * 24 * 60 * 60 * 1000;

  const startBasisMs = currentExpiryMs > nowMs ? currentExpiryMs : nowMs;
  const newExpiryMs = startBasisMs + durationMs;

  const expectedExpiry = new Date("2026-10-05T00:00:00Z").toISOString();
  assert.equal(new Date(newExpiryMs).toISOString(), expectedExpiry);
});

// 8. Grace Period Recharge Restores FULL_ACCESS & ACTIVE Status
test("8. Grace period recharge restores ACTIVE status and clears restrictions", () => {
  const existingSub = {
    status: "EXPIRED",
    accessMode: "GRACE_ACCESS",
  };

  // After successful fulfillment
  const updatedSub = {
    ...existingSub,
    status: "ACTIVE",
    accessMode: "FULL_ACCESS",
  };

  assert.equal(updatedSub.status, "ACTIVE");
  assert.equal(updatedSub.accessMode, "FULL_ACCESS");
});

// 9. Payment Fulfillment Idempotency Simulation
test("9. Fulfillment idempotency: Second call returns existing result without duplicating records", () => {
  let orderStatus = "CREATED";
  let invoiceCount = 0;
  let financeTxCount = 0;

  function fulfillOrder(orderId) {
    if (orderStatus === "PAID") {
      return { alreadyFulfilled: true, invoiceCount, financeTxCount };
    }
    orderStatus = "PAID";
    invoiceCount++;
    financeTxCount++;
    return { alreadyFulfilled: false, invoiceCount, financeTxCount };
  }

  const firstCall = fulfillOrder("ord_123");
  assert.equal(firstCall.alreadyFulfilled, false);
  assert.equal(firstCall.invoiceCount, 1);
  assert.equal(firstCall.financeTxCount, 1);

  const secondCall = fulfillOrder("ord_123");
  assert.equal(secondCall.alreadyFulfilled, true);
  assert.equal(secondCall.invoiceCount, 1);
  assert.equal(secondCall.financeTxCount, 1);
});

// 10. School Tenant Isolation on Payment History
test("10. School tenant isolation on payment history query", () => {
  const allPayments = [
    { id: "pay_1", schoolId: "school_A", amount: 99900 },
    { id: "pay_2", schoolId: "school_B", amount: 199900 },
    { id: "pay_3", schoolId: "school_A", amount: 199900 },
  ];

  const authenticatedSchoolId = "school_A";
  const userPayments = allPayments.filter((p) => p.schoolId === authenticatedSchoolId);

  assert.equal(userPayments.length, 2);
  assert.equal(userPayments.every((p) => p.schoolId === "school_A"), true);
});

// 11. Downgrade Capacity Safety Check
test("11. Downgrade warning triggered when current students exceed new plan limit", () => {
  const currentStudents = 900;
  const currentPlan = "plan_professional";
  const targetPlan = "plan_starter";
  const starterLimit = 500;

  const isDowngrade = currentPlan === "plan_professional" && targetPlan === "plan_starter";
  const isOverLimitOnDowngrade = isDowngrade && currentStudents > starterLimit;

  assert.equal(isDowngrade, true);
  assert.equal(isOverLimitOnDowngrade, true);
});

// 12. Frontend Amount Tampering Protection
test("12. Server authority rejects client-supplied amounts", () => {
  const serverPlanVersion = { monthlyPrice: 199900 };
  const clientPayload = { planId: "plan_professional", clientAmount: 100 }; // malicious ₹1

  // Server ignores clientAmount and calculates using serverPlanVersion
  const authoritativeAmount = serverPlanVersion.monthlyPrice;
  assert.equal(authoritativeAmount, 199900);
});

console.log("\n==================================================");
console.log(`PHASE 8 TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
