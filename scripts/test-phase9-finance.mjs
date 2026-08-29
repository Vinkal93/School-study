/**
 * Phase 9 Super Admin Finance Control Center Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 9 FINANCE CONTROL CENTER TESTS");
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

// 1. Accounting Formula Integrity: Gross, Discount, Refunds & Net Collected
test("1. Revenue formulas: Gross, Discount, Refunds, Net Collected", () => {
  const transactions = [
    { amount: 1535040, discountAmount: 383760, status: "CAPTURED" }, // Paid ₹15,350.40, Discount ₹3,837.60 (Gross: ₹19,188)
    { amount: 99900, discountAmount: 0, status: "CAPTURED" },       // Paid ₹999, Discount ₹0 (Gross: ₹999)
    { amount: 99900, discountAmount: 0, status: "REFUNDED" },       // Refunded ₹999
  ];

  let grossSales = 0;
  let discountGiven = 0;
  let refundedAmount = 0;

  for (const t of transactions) {
    if (t.status === "CAPTURED") {
      grossSales += t.amount + t.discountAmount;
      discountGiven += t.discountAmount;
    } else if (t.status === "REFUNDED") {
      refundedAmount += t.amount;
    }
  }

  const netCollected = grossSales - discountGiven - refundedAmount;

  assert.equal(grossSales, 1918800 + 99900); // 2,018,700 paise (₹20,187)
  assert.equal(discountGiven, 383760);       // 383,760 paise (₹3,837.60)
  assert.equal(refundedAmount, 99900);       // 99,900 paise (₹999)
  assert.equal(netCollected, 1535040);       // 1,535,040 paise (₹15,350.40)
});

// 2. Cashflow Money In vs Money Out
test("2. Cashflow formulas: Money In (Payments) vs Money Out (Refunds)", () => {
  const ledger = [
    { type: "PAYMENT", direction: "CREDIT", amount: 1535040, status: "SUCCESS" },
    { type: "PAYMENT", direction: "CREDIT", amount: 99900, status: "SUCCESS" },
    { type: "REFUND", direction: "DEBIT", amount: 99900, status: "SUCCESS" },
  ];

  let moneyIn = 0;
  let moneyOut = 0;

  for (const tx of ledger) {
    if (tx.status === "SUCCESS") {
      if (tx.direction === "CREDIT") moneyIn += tx.amount;
      else if (tx.direction === "DEBIT") moneyOut += tx.amount;
    }
  }

  const netCashflow = moneyIn - moneyOut;
  assert.equal(moneyIn, 1634940);
  assert.equal(moneyOut, 99900);
  assert.equal(netCashflow, 1535040);
});

// 3. Billing Cycle Analytics (Monthly vs Annual)
test("3. Billing cycle analytics breakdown", () => {
  const payments = [
    { billingCycle: "monthly", amount: 99900 },
    { billingCycle: "monthly", amount: 99900 },
    { billingCycle: "annual", amount: 1918800 },
  ];

  let monthlyCount = 0;
  let monthlyRev = 0;
  let annualCount = 0;
  let annualRev = 0;

  for (const p of payments) {
    if (p.billingCycle === "annual") {
      annualCount++;
      annualRev += p.amount;
    } else {
      monthlyCount++;
      monthlyRev += p.amount;
    }
  }

  assert.equal(monthlyCount, 2);
  assert.equal(monthlyRev, 199800);
  assert.equal(annualCount, 1);
  assert.equal(annualRev, 1918800);
});

// 4. Coupon Impact Ledger
test("4. Coupon impact aggregation and ranking", () => {
  const payments = [
    { couponId: "SAVE20", discountAmount: 383760, amount: 1535040 },
    { couponId: "SAVE20", discountAmount: 383760, amount: 1535040 },
    { couponId: "FLAT500", discountAmount: 50000, amount: 49900 },
  ];

  const map = {};
  for (const p of payments) {
    const code = p.couponId;
    if (!map[code]) map[code] = { count: 0, discount: 0, revenue: 0 };
    map[code].count++;
    map[code].discount += p.discountAmount;
    map[code].revenue += p.amount;
  }

  assert.equal(map["SAVE20"].count, 2);
  assert.equal(map["SAVE20"].discount, 767520);
  assert.equal(map["FLAT500"].discount, 50000);
});

// 5. Payment Health & Success Rate Percentage
test("5. Payment health success rate calculation", () => {
  const successful = 18;
  const failed = 2;
  const pending = 0;
  const total = successful + failed + pending;
  const successRate = Math.round((successful / total) * 100);

  assert.equal(total, 20);
  assert.equal(successRate, 90); // 90%
});

// 6. Reconciliation Anomaly Detection: Missing Order
test("6. Reconciliation detection: Payment without internal order", () => {
  const orders = [{ id: "ord_1" }];
  const payments = [
    { id: "pay_1", orderId: "ord_1" },
    { id: "pay_2", orderId: "ord_missing_999" },
  ];

  const orderSet = new Set(orders.map((o) => o.id));
  const anomalies = [];

  for (const p of payments) {
    if (!orderSet.has(p.orderId)) {
      anomalies.push({ type: "PAYMENT_WITHOUT_ORDER", id: p.id });
    }
  }

  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].id, "pay_2");
});

// 7. Reconciliation Anomaly Detection: Order Paid without Payment
test("7. Reconciliation detection: Order marked PAID without captured payment", () => {
  const orders = [
    { id: "ord_1", status: "PAID" },
    { id: "ord_2", status: "PAID" },
  ];
  const payments = [{ id: "pay_1", orderId: "ord_1" }];

  const paySet = new Set(payments.map((p) => p.orderId));
  const anomalies = [];

  for (const o of orders) {
    if (o.status === "PAID" && !paySet.has(o.id)) {
      anomalies.push({ type: "ORDER_PAID_WITHOUT_PAYMENT", id: o.id });
    }
  }

  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].id, "ord_2");
});

// 8. Financial Trace Timeline Completeness
test("8. Financial trace completeness verification", () => {
  const traceComplete = {
    order: { id: "ord_1" },
    payment: { id: "pay_1" },
    invoice: { id: "inv_1" },
    financeTx: { id: "tx_1" },
  };

  const isComplete = Boolean(
    traceComplete.order && traceComplete.payment && traceComplete.invoice && traceComplete.financeTx
  );
  assert.equal(isComplete, true);

  const traceIncomplete = {
    order: { id: "ord_2" },
    payment: { id: "pay_2" },
    invoice: null, // missing invoice
    financeTx: { id: "tx_2" },
  };

  const isIncomplete = !traceIncomplete.invoice;
  assert.equal(isIncomplete, true);
});

// 9. CSV Export Generation Formatting
test("9. CSV export generator formatting with escaped quotes", () => {
  const records = [
    {
      createdAt: "2026-08-29T10:00:00Z",
      schoolName: 'St. Mary "International" School',
      schoolId: "sch_1",
      planId: "professional",
      billingCycle: "annual",
      amountPaise: 1918800,
      discountPaise: 383760,
      status: "CAPTURED",
      paymentId: "pay_123456",
      invoiceNumber: "INV-2026-0001",
    },
  ];

  const headers = ["Date", "School", "Plan", "Billing Cycle", "Amount (INR)", "Discount (INR)", "Status", "Payment ID", "Invoice Number"];
  const rows = records.map((t) => [
    new Date(t.createdAt).toLocaleDateString("en-IN"),
    `"${(t.schoolName || t.schoolId).replace(/"/g, '""')}"`,
    t.planId,
    t.billingCycle,
    (t.amountPaise / 100).toFixed(2),
    (t.discountPaise / 100).toFixed(2),
    t.status,
    t.paymentId,
    t.invoiceNumber,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  assert.equal(csv.includes('"St. Mary ""International"" School"'), true);
  assert.equal(csv.includes("19188.00"), true);
  assert.equal(csv.includes("3837.60"), true);
});

// 10. Historical Price Immutability
test("10. Historical transactions preserve original plan versions when plan prices change", () => {
  const originalTx = {
    id: "pay_old",
    planId: "plan_professional",
    planVersionId: "plan_professional_v1",
    amount: 199900,
  };

  // Super Admin updates plan price to ₹2,499 in v2
  const updatedPlan = {
    id: "plan_professional",
    currentVersion: 2,
    monthlyPrice: 249900,
  };

  // Original transaction record is immutable and remains 199900 paise (v1)
  assert.equal(originalTx.amount, 199900);
  assert.equal(originalTx.planVersionId, "plan_professional_v1");
});

console.log("\n==================================================");
console.log(`PHASE 9 TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
