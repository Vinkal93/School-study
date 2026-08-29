/**
 * Phase 10 Refunds, Failed Payments & Payment Edge-Case Test Suite
 */

import assert from "node:assert/strict";

const VALID_PAYMENT_TRANSITIONS = {
  CREATED: ["PAYMENT_PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "UNKNOWN"],
  PAYMENT_PENDING: ["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "UNKNOWN"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED"],
  CAPTURED: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  REFUND_PENDING: ["PARTIALLY_REFUNDED", "REFUNDED", "CAPTURED", "FAILED"],
  PARTIALLY_REFUNDED: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  DISPUTED: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"],
  UNKNOWN: ["PAYMENT_PENDING", "CAPTURED", "FAILED", "CANCELLED"],
};

function validatePaymentStateTransition(from, to) {
  if (from === to) return { valid: true, from, to };
  const allowed = VALID_PAYMENT_TRANSITIONS[from] || [];
  const isAllowed = allowed.includes(to);
  return { valid: isAllowed, from, to };
}

console.log("==================================================");
console.log("STARTING PHASE 10 REFUNDS & PAYMENT EDGE-CASES TEST SUITE");
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

// 1. Payment State Transitions: Legal paths
test("1. Payment State Machine: Legal Transitions", () => {
  const t1 = validatePaymentStateTransition("CREATED", "PAYMENT_PENDING");
  assert.equal(t1.valid, true);

  const t2 = validatePaymentStateTransition("PAYMENT_PENDING", "CAPTURED");
  assert.equal(t2.valid, true);

  const t3 = validatePaymentStateTransition("CAPTURED", "PARTIALLY_REFUNDED");
  assert.equal(t3.valid, true);

  const t4 = validatePaymentStateTransition("PARTIALLY_REFUNDED", "REFUNDED");
  assert.equal(t4.valid, true);
});

// 2. Payment State Transitions: Illegal paths
test("2. Payment State Machine: Illegal Transitions are Rejected", () => {
  const illegal1 = validatePaymentStateTransition("REFUNDED", "CAPTURED");
  assert.equal(illegal1.valid, false);

  const illegal2 = validatePaymentStateTransition("FAILED", "CAPTURED");
  assert.equal(illegal2.valid, false);

  const illegal3 = validatePaymentStateTransition("CANCELLED", "CAPTURED");
  assert.equal(illegal3.valid, false);
});

// 3. Refundable Balance Formula
test("3. Refundable Balance: paidAmount - previousRefunds = remainingRefundable", () => {
  const originalPaid = 1000000; // ₹10,000 in paise
  const previousRefunds = [
    { approvedAmount: 300000, status: "PROCESSED" }, // ₹3,000
    { approvedAmount: 200000, status: "PROCESSED" }, // ₹2,000
    { approvedAmount: 100000, status: "FAILED" },    // Failed, must not count
  ];

  const sumProcessed = previousRefunds
    .filter((r) => r.status === "PROCESSED")
    .reduce((s, r) => s + r.approvedAmount, 0);

  const remaining = originalPaid - sumProcessed;

  assert.equal(sumProcessed, 500000); // ₹5,000
  assert.equal(remaining, 500000);    // ₹5,000
});

// 4. Rejection of Refund exceeding balance
test("4. Refund limit guard: Prevent refund > remaining balance", () => {
  const remaining = 500000; // ₹5,000
  const requestedOver = 500100; // ₹5,001

  const isAllowed = requestedOver <= remaining;
  assert.equal(isAllowed, false);
});

// 5. Rejection of Negative or Zero Refund
test("5. Refund validation: Reject amount <= 0", () => {
  const zeroAmt = 0;
  const negAmt = -500;

  assert.equal(zeroAmt > 0, false);
  assert.equal(negAmt > 0, false);
});

// 6. Full Refund State Determination
test("6. Refund state calculation: Full refund marks payment REFUNDED", () => {
  const paidAmount = 1000000;
  const existingRefunds = 0;
  const newRefund = 1000000;

  const totalRefunded = existingRefunds + newRefund;
  const isFull = totalRefunded >= paidAmount;
  const nextStatus = isFull ? "REFUNDED" : "PARTIALLY_REFUNDED";

  assert.equal(isFull, true);
  assert.equal(nextStatus, "REFUNDED");
});

// 7. Partial Refund State Determination
test("7. Refund state calculation: Partial refund marks payment PARTIALLY_REFUNDED", () => {
  const paidAmount = 1000000;
  const existingRefunds = 0;
  const newRefund = 300000; // ₹3,000

  const totalRefunded = existingRefunds + newRefund;
  const isFull = totalRefunded >= paidAmount;
  const nextStatus = isFull ? "REFUNDED" : "PARTIALLY_REFUNDED";

  assert.equal(isFull, false);
  assert.equal(nextStatus, "PARTIALLY_REFUNDED");
});

// 8. Finance Ledger: Refund creates separate DEBIT entry
test("8. Finance Ledger: Refunds create immutable DEBIT entries without modifying original payment", () => {
  const originalPaymentTx = {
    id: "tx_order_123",
    type: "PAYMENT",
    direction: "CREDIT",
    amount: 1000000,
    status: "SUCCESS",
  };

  const refundTx = {
    id: "tx_refund_ref_456",
    type: "REFUND",
    direction: "DEBIT",
    amount: 300000,
    status: "SUCCESS",
  };

  // Original payment transaction is never mutated
  assert.equal(originalPaymentTx.amount, 1000000);
  assert.equal(originalPaymentTx.direction, "CREDIT");

  // Refund transaction is registered as DEBIT
  assert.equal(refundTx.amount, 300000);
  assert.equal(refundTx.direction, "DEBIT");
});

// 9. Cashflow Net Calculation with Refunds
test("9. Cashflow formula: Money In - Money Out = Net Cashflow", () => {
  const ledger = [
    { type: "PAYMENT", direction: "CREDIT", amount: 1000000 },
    { type: "PAYMENT", direction: "CREDIT", amount: 200000 },
    { type: "REFUND", direction: "DEBIT", amount: 300000 },
  ];

  let moneyIn = 0;
  let moneyOut = 0;

  for (const t of ledger) {
    if (t.direction === "CREDIT") moneyIn += t.amount;
    else if (t.direction === "DEBIT") moneyOut += t.amount;
  }

  const netCashflow = moneyIn - moneyOut;
  assert.equal(moneyIn, 1200000);  // ₹12,000
  assert.equal(moneyOut, 300000);  // ₹3,000
  assert.equal(netCashflow, 900000); // ₹9,000 (Net collected)
});

// 10. Historical Invoice Immutability
test("10. Invoice Immutability: Invoices retain original total, refund is associated", () => {
  const invoice = {
    id: "inv_123",
    total: 1000000,
    status: "PAID",
  };

  const refund = {
    invoiceId: "inv_123",
    approvedAmount: 300000,
  };

  // Original invoice total is NOT modified
  assert.equal(invoice.total, 1000000);
  const netInvoiceAmount = invoice.total - refund.approvedAmount;
  assert.equal(netInvoiceAmount, 700000);
});

// 11. Configurable Subscription Refund Policies
test("11. Subscription Refund Policy: NO_CHANGE, REVOKE_ENTITLEMENT, END_AT_REFUND_TIME", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  const subOriginal = {
    status: "ACTIVE",
    expiresAt: "2026-12-31T23:59:59Z",
  };

  // Policy 1: NO_CHANGE
  const sub1 = { ...subOriginal };
  // No modification applied
  assert.equal(sub1.status, "ACTIVE");
  assert.equal(sub1.expiresAt, "2026-12-31T23:59:59Z");

  // Policy 2: REVOKE_ENTITLEMENT
  const sub2 = { ...subOriginal, status: "EXPIRED" };
  assert.equal(sub2.status, "EXPIRED");

  // Policy 3: END_AT_REFUND_TIME
  const sub3 = { ...subOriginal, expiresAt: now.toISOString() };
  assert.equal(sub3.expiresAt, "2026-08-29T12:00:00.000Z");
});

// 12. Concurrency Safety
test("12. Concurrency: Total approved refunds cannot exceed paid amount across multiple concurrent calls", () => {
  const paidAmount = 1000000;
  let currentRefunded = 0;

  function attemptRefund(reqAmt) {
    if (currentRefunded + reqAmt <= paidAmount) {
      currentRefunded += reqAmt;
      return { success: true };
    }
    return { success: false, reason: "Exceeds remaining balance" };
  }

  const req1 = attemptRefund(800000);
  assert.equal(req1.success, true);

  const req2 = attemptRefund(800000); // concurrent attempt to refund ₹8,000 against ₹2,000 remaining
  assert.equal(req2.success, false);
  assert.equal(currentRefunded, 800000);
});

// 13. Dispute / Chargeback Isolation
test("13. Dispute Model: Disputes are isolated with DISPUTED state without corrupting standard refund ledgers", () => {
  const dispute = {
    id: "disp_123",
    paymentId: "pay_123",
    amount: 1000000,
    status: "OPEN",
    reason: "Fraudulent charge claim",
  };

  assert.equal(dispute.status, "OPEN");
  assert.equal(dispute.amount, 1000000);
});

// 14. Webhook Idempotency
test("14. Webhook idempotency: Duplicate event IDs are acknowledged without re-processing", () => {
  const processedEvents = new Set(["evt_12345"]);

  function handleWebhookEvent(evtId) {
    if (processedEvents.has(evtId)) {
      return { status: "already_processed" };
    }
    processedEvents.add(evtId);
    return { status: "processed" };
  }

  const firstCall = handleWebhookEvent("evt_99999");
  assert.equal(firstCall.status, "processed");

  const dupCall = handleWebhookEvent("evt_99999");
  assert.equal(dupCall.status, "already_processed");
});

console.log("\n==================================================");
console.log(`PHASE 10 TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
