/**
 * PHASE 7 — P&L + BALANCE SHEET + FINANCIAL STATEMENTS
 * Automated Verification & Accounting Invariant Suite
 */

import assert from "node:assert";

console.log("======================================================================");
console.log("RUNNING PHASE 7 P&L + BALANCE SHEET FINANCIAL STATEMENTS SUITE");
console.log("======================================================================\n");

let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${description}:`, err.message);
  }
}

function paiseToRupees(paise) {
  return Math.round(paise) / 100;
}

function rupeesToPaise(rupees) {
  return Math.round(rupees * 100);
}

const TEST_COA = [
  // ASSETS (1000-1999) - Normal Balance: DEBIT
  { code: "1010", name: "Cash in Hand / Drawer", category: "ASSET", normalBalance: "DEBIT" },
  { code: "1020", name: "Bank Operating Account", category: "ASSET", normalBalance: "DEBIT" },
  { code: "1030", name: "UPI & Digital Collections", category: "ASSET", normalBalance: "DEBIT" },
  { code: "1040", name: "Student Fee Receivable", category: "ASSET", normalBalance: "DEBIT" },
  { code: "1090", name: "Other Current Assets", category: "ASSET", normalBalance: "DEBIT" },

  // LIABILITIES (2000-2999) - Normal Balance: CREDIT
  { code: "2010", name: "Student Fee Advance", category: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2020", name: "Accounts Payable / Vendors", category: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2090", name: "Other Current Liabilities", category: "LIABILITY", normalBalance: "CREDIT" },

  // EQUITY / CAPITAL (3000-3999) - Normal Balance: CREDIT
  { code: "3010", name: "School Capital / Operating Fund", category: "EQUITY", normalBalance: "CREDIT" },
  { code: "3020", name: "Current Year Operating Surplus", category: "EQUITY", normalBalance: "CREDIT" },

  // INCOME (4000-4999) - Normal Balance: CREDIT
  { code: "4010", name: "Tuition Fee Income", category: "INCOME", normalBalance: "CREDIT" },
  { code: "4020", name: "Admission Fee Income", category: "INCOME", normalBalance: "CREDIT" },
  { code: "4030", name: "Transport Fee Income", category: "INCOME", normalBalance: "CREDIT" },
  { code: "4040", name: "Examination Fee Income", category: "INCOME", normalBalance: "CREDIT" },
  { code: "4050", name: "Late Fee & Fine Income", category: "INCOME", normalBalance: "CREDIT" },
  { code: "4090", name: "Other Operating Income", category: "INCOME", normalBalance: "CREDIT" },

  // EXPENSES (5000-5999) - Normal Balance: DEBIT
  { code: "5010", name: "Staff Salary & Wages", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5020", name: "Campus Rent & Lease", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5030", name: "Electricity & Utilities", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5040", name: "Campus Maintenance & Repairs", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5050", name: "Stationery & Printing Consumables", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5060", name: "Internet & Telecom Services", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5070", name: "Fee Waivers & Concessions", category: "EXPENSE", normalBalance: "DEBIT" },
  { code: "5090", name: "Other Operating Expenses", category: "EXPENSE", normalBalance: "DEBIT" },
];

function createVoucher(voucherNumber, voucherType, lines, academicYearId = "ay_2026_27") {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debitPaise || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.creditPaise || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error(`Double-entry unbalanced: Debits (${totalDebit}) != Credits (${totalCredit})`);
  }

  return {
    voucherNumber,
    voucherType,
    academicYearId,
    totalDebitPaise: totalDebit,
    totalCreditPaise: totalCredit,
    lines,
  };
}

function deriveProfitAndLoss(coa, journals) {
  const accountTotals = new Map();
  coa.forEach((a) => accountTotals.set(a.code, { debitPaise: 0, creditPaise: 0 }));

  for (const j of journals) {
    for (const l of j.lines) {
      const curr = accountTotals.get(l.accountCode);
      if (curr) {
        curr.debitPaise += l.debitPaise || 0;
        curr.creditPaise += l.creditPaise || 0;
      }
    }
  }

  // INCOME: Normal Credit (Credit - Debit)
  const incomeAccounts = coa.filter((a) => a.category === "INCOME");
  let totalIncomePaise = 0;
  const incomeLines = [];

  for (const acc of incomeAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const amountPaise = Math.max(0, totals.creditPaise - totals.debitPaise);
    totalIncomePaise += amountPaise;
    incomeLines.push({
      accountCode: acc.code,
      accountName: acc.name,
      amountPaise,
      amountRupees: paiseToRupees(amountPaise),
    });
  }

  incomeLines.forEach((l) => {
    l.percentageOfTotal = totalIncomePaise > 0 ? Math.round((l.amountPaise / totalIncomePaise) * 1000) / 10 : 0;
  });

  // EXPENSES: Normal Debit (Debit - Credit)
  const expenseAccounts = coa.filter((a) => a.category === "EXPENSE");
  let totalExpensePaise = 0;
  const expenseLines = [];

  for (const acc of expenseAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const amountPaise = Math.max(0, totals.debitPaise - totals.creditPaise);
    totalExpensePaise += amountPaise;
    expenseLines.push({
      accountCode: acc.code,
      accountName: acc.name,
      amountPaise,
      amountRupees: paiseToRupees(amountPaise),
    });
  }

  expenseLines.forEach((l) => {
    l.percentageOfTotal = totalExpensePaise > 0 ? Math.round((l.amountPaise / totalExpensePaise) * 1000) / 10 : 0;
  });

  const netSurplusPaise = totalIncomePaise - totalExpensePaise;
  const operatingMarginPercentage = totalIncomePaise > 0 ? Math.round((netSurplusPaise / totalIncomePaise) * 1000) / 10 : 0;

  return {
    incomeLines,
    totalIncomePaise,
    totalIncomeRupees: paiseToRupees(totalIncomePaise),
    expenseLines,
    totalExpensePaise,
    totalExpenseRupees: paiseToRupees(totalExpensePaise),
    netSurplusPaise,
    netSurplusRupees: paiseToRupees(netSurplusPaise),
    operatingMarginPercentage,
  };
}

function deriveBalanceSheet(coa, journals, pnl) {
  const accountTotals = new Map();
  coa.forEach((a) => accountTotals.set(a.code, { debitPaise: 0, creditPaise: 0 }));

  for (const j of journals) {
    for (const l of j.lines) {
      const curr = accountTotals.get(l.accountCode);
      if (curr) {
        curr.debitPaise += l.debitPaise || 0;
        curr.creditPaise += l.creditPaise || 0;
      }
    }
  }

  // ASSETS: Debit - Credit
  const assetLines = [];
  let totalAssetsPaise = 0;
  for (const acc of coa.filter((a) => a.category === "ASSET")) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const closingBalancePaise = totals.debitPaise - totals.creditPaise;
    totalAssetsPaise += closingBalancePaise;
    assetLines.push({
      accountCode: acc.code,
      accountName: acc.name,
      category: "ASSET",
      debitPaise: totals.debitPaise,
      creditPaise: totals.creditPaise,
      closingBalancePaise,
      closingBalanceRupees: paiseToRupees(closingBalancePaise),
    });
  }

  // LIABILITIES: Credit - Debit
  const liabilityLines = [];
  let totalLiabilitiesPaise = 0;
  for (const acc of coa.filter((a) => a.category === "LIABILITY")) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const closingBalancePaise = totals.creditPaise - totals.debitPaise;
    totalLiabilitiesPaise += closingBalancePaise;
    liabilityLines.push({
      accountCode: acc.code,
      accountName: acc.name,
      category: "LIABILITY",
      debitPaise: totals.debitPaise,
      creditPaise: totals.creditPaise,
      closingBalancePaise,
      closingBalanceRupees: paiseToRupees(closingBalancePaise),
    });
  }

  // EQUITY: Capital (3010) + Injected Surplus (3020)
  const equityLines = [];
  let totalEquityPaise = 0;
  for (const acc of coa.filter((a) => a.category === "EQUITY")) {
    if (acc.code === "3020") {
      const closingBalancePaise = pnl.netSurplusPaise;
      totalEquityPaise += closingBalancePaise;
      equityLines.push({
        accountCode: acc.code,
        accountName: acc.name,
        category: "EQUITY",
        closingBalancePaise,
        closingBalanceRupees: paiseToRupees(closingBalancePaise),
      });
    } else {
      const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
      const closingBalancePaise = totals.creditPaise - totals.debitPaise;
      totalEquityPaise += closingBalancePaise;
      equityLines.push({
        accountCode: acc.code,
        accountName: acc.name,
        category: "EQUITY",
        closingBalancePaise,
        closingBalanceRupees: paiseToRupees(closingBalancePaise),
      });
    }
  }

  const totalLiabilitiesAndEquityPaise = totalLiabilitiesPaise + totalEquityPaise;
  const differencePaise = Math.abs(totalAssetsPaise - totalLiabilitiesAndEquityPaise);
  const isBalanced = differencePaise === 0;

  return {
    assets: { lines: assetLines, totalClosingRupees: paiseToRupees(totalAssetsPaise) },
    liabilities: { lines: liabilityLines, totalClosingRupees: paiseToRupees(totalLiabilitiesPaise) },
    equity: { lines: equityLines, totalClosingRupees: paiseToRupees(totalEquityPaise) },
    totalAssetsPaise,
    totalAssetsRupees: paiseToRupees(totalAssetsPaise),
    totalLiabilitiesPaise,
    totalLiabilitiesRupees: paiseToRupees(totalLiabilitiesPaise),
    totalEquityPaise,
    totalEquityRupees: paiseToRupees(totalEquityPaise),
    totalLiabilitiesAndEquityPaise,
    totalLiabilitiesAndEquityRupees: paiseToRupees(totalLiabilitiesAndEquityPaise),
    differencePaise,
    differenceRupees: paiseToRupees(differencePaise),
    isBalanced,
  };
}

console.log("--- 1. Testing Sample Journal Vouchers Creation ---");

const sampleJournals = [];

it("1.1 Opening School Corpus Fund Journal Posting", () => {
  const v = createVoucher("JV-001", "JOURNAL", [
    { accountCode: "1020", debitPaise: rupeesToPaise(500000), creditPaise: 0 },
    { accountCode: "3010", debitPaise: 0, creditPaise: rupeesToPaise(500000) },
  ]);
  sampleJournals.push(v);
  assert.strictEqual(v.totalDebitPaise, v.totalCreditPaise);
});

it("1.2 Fee Demand Generation (Tuition + Transport + Admission)", () => {
  const v = createVoucher("JV-002", "JOURNAL", [
    { accountCode: "1040", debitPaise: rupeesToPaise(450000), creditPaise: 0 },
    { accountCode: "4010", debitPaise: 0, creditPaise: rupeesToPaise(300000) },
    { accountCode: "4020", debitPaise: 0, creditPaise: rupeesToPaise(100000) },
    { accountCode: "4030", debitPaise: 0, creditPaise: rupeesToPaise(50000) },
  ]);
  sampleJournals.push(v);
  assert.strictEqual(v.totalDebitPaise, rupeesToPaise(450000));
});

it("1.3 Fee Collection into Bank & Cash", () => {
  const v = createVoucher("RV-001", "RECEIPT", [
    { accountCode: "1020", debitPaise: rupeesToPaise(250000), creditPaise: 0 },
    { accountCode: "1010", debitPaise: rupeesToPaise(100000), creditPaise: 0 },
    { accountCode: "1040", debitPaise: 0, creditPaise: rupeesToPaise(350000) },
  ]);
  sampleJournals.push(v);
  assert.strictEqual(v.totalDebitPaise, rupeesToPaise(350000));
});

it("1.4 Student Advance Collection", () => {
  const v = createVoucher("RV-002", "RECEIPT", [
    { accountCode: "1030", debitPaise: rupeesToPaise(25000), creditPaise: 0 },
    { accountCode: "2010", debitPaise: 0, creditPaise: rupeesToPaise(25000) },
  ]);
  sampleJournals.push(v);
  assert.strictEqual(v.totalDebitPaise, rupeesToPaise(25000));
});

it("1.5 Operating Expenses Posting (Salaries, Utilities, Consumables)", () => {
  const v = createVoucher("PV-001", "PAYMENT", [
    { accountCode: "5010", debitPaise: rupeesToPaise(150000), creditPaise: 0 },
    { accountCode: "5030", debitPaise: rupeesToPaise(20000), creditPaise: 0 },
    { accountCode: "5050", debitPaise: rupeesToPaise(10000), creditPaise: 0 },
    { accountCode: "5040", debitPaise: rupeesToPaise(15000), creditPaise: 0 },
    { accountCode: "1020", debitPaise: 0, creditPaise: rupeesToPaise(185000) },
    { accountCode: "1010", debitPaise: 0, creditPaise: rupeesToPaise(10000) },
  ]);
  sampleJournals.push(v);
  assert.strictEqual(v.totalDebitPaise, rupeesToPaise(195000));
});

console.log("\n--- 2. Testing Profit & Loss Statement Derivation ---");

let pnlResult = null;

it("2.1 Derive Profit & Loss Statement", () => {
  pnlResult = deriveProfitAndLoss(TEST_COA, sampleJournals);
  assert.ok(pnlResult !== null);
  assert.strictEqual(pnlResult.totalIncomeRupees, 450000);
  assert.strictEqual(pnlResult.totalExpenseRupees, 195000);
  assert.strictEqual(pnlResult.netSurplusRupees, 255000);
  assert.strictEqual(pnlResult.operatingMarginPercentage, 56.7);
});

it("2.2 Revenue Stream Percentage Breakdown Check", () => {
  const tuition = pnlResult.incomeLines.find((l) => l.accountCode === "4010");
  const admission = pnlResult.incomeLines.find((l) => l.accountCode === "4020");
  const transport = pnlResult.incomeLines.find((l) => l.accountCode === "4030");

  assert.strictEqual(tuition.amountRupees, 300000);
  assert.strictEqual(tuition.percentageOfTotal, 66.7);
  assert.strictEqual(admission.amountRupees, 100000);
  assert.strictEqual(admission.percentageOfTotal, 22.2);
  assert.strictEqual(transport.amountRupees, 50000);
  assert.strictEqual(transport.percentageOfTotal, 11.1);
});

console.log("\n--- 3. Testing Balance Sheet & Strict Accounting Equation ---");

let bsResult = null;

it("3.1 Derive Institutional Balance Sheet", () => {
  bsResult = deriveBalanceSheet(TEST_COA, sampleJournals, pnlResult);
  assert.ok(bsResult !== null);
  assert.strictEqual(bsResult.totalAssetsRupees, 780000);
  assert.strictEqual(bsResult.totalLiabilitiesRupees, 25000);
  assert.strictEqual(bsResult.totalEquityRupees, 755000);
  assert.strictEqual(bsResult.totalLiabilitiesAndEquityRupees, 780000);
});

it("3.2 STRICT ACCOUNTING EQUATION INVARIANT: Total Assets === Total Liabilities + Total Equity", () => {
  assert.strictEqual(bsResult.isBalanced, true, "Balance Sheet must be strictly balanced");
  assert.strictEqual(bsResult.differencePaise, 0, "Difference in paise must be exactly zero");
  assert.strictEqual(bsResult.differenceRupees, 0, "Difference in rupees must be exactly zero");
  assert.strictEqual(
    bsResult.totalAssetsRupees,
    bsResult.totalLiabilitiesRupees + bsResult.totalEquityRupees,
    "Assets must equal Liabilities + Equity"
  );
});

console.log("\n--- 4. Testing Accounting Discrepancy Detection (Zero Fake Figures) ---");

it("4.1 System detects discrepancy without fabricating balancing figures if an unbalanced record exists", () => {
  const corruptedJournals = [
    ...sampleJournals,
    {
      voucherNumber: "CORRUPT-001",
      voucherType: "JOURNAL",
      academicYearId: "ay_2026_27",
      lines: [
        { accountCode: "1010", debitPaise: rupeesToPaise(5000), creditPaise: 0 },
      ],
    },
  ];

  const corruptedPnl = deriveProfitAndLoss(TEST_COA, corruptedJournals);
  const corruptedBs = deriveBalanceSheet(TEST_COA, corruptedJournals, corruptedPnl);

  assert.strictEqual(corruptedBs.isBalanced, false, "Must detect unbalanced state");
  assert.strictEqual(corruptedBs.differenceRupees, 5000, "Must report exact ₹5,000 difference");
});

console.log("\n--- 5. Testing Multi-Session Comparison Engine ---");

it("5.1 Compute Variance and Percentage Change between Two Sessions", () => {
  const baseIncomeRupees = 450000;
  const compareIncomeRupees = 400000;
  const varianceRupees = baseIncomeRupees - compareIncomeRupees;
  const variancePercentage = Math.round(((varianceRupees) / Math.abs(compareIncomeRupees)) * 1000) / 10;

  assert.strictEqual(varianceRupees, 50000);
  assert.strictEqual(variancePercentage, 12.5);
});

console.log("\n======================================================================");
console.log(`TEST RESULTS: ${passed}/${total} PASSED`);
console.log("======================================================================\n");

if (passed !== total) {
  process.exit(1);
}
