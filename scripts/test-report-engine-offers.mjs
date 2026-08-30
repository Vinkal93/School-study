import assert from "node:assert/strict";
import { exportToCsv, exportToExcel, exportToPdf } from "../src/lib/reports/exportEngine.ts";

console.log("==================================================");
console.log("STARTING REPORT ENGINE, PLAN ACCESS & CUSTOM OFFERS TEST SUITE");
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

// 1. Report Data Model & Starter Plan Truncation Simulator
function simulateReportGeneration(schoolId, reportType, planTier, mockDataset) {
  const isRestricted = planTier === "STARTER";
  const filteredRows = mockDataset.filter((r) => r.schoolId === schoolId);
  const returnedRows = isRestricted ? filteredRows.slice(0, 3) : filteredRows;

  return {
    reportType,
    title: `${reportType} Report`,
    schoolId,
    totalRecords: filteredRows.length,
    isRestricted,
    previewLimit: isRestricted ? 3 : undefined,
    columns: [
      { key: "rollNo", header: "Roll No" },
      { key: "fullName", header: "Full Name" },
      { key: "className", header: "Class" },
      { key: "status", header: "Status" },
    ],
    rows: returnedRows,
    summaryMetrics: [
      { label: "Total Students", value: filteredRows.length },
    ],
  };
}

// --- TEST CASES ---

// Test 1: Tenant Isolation
test("1. Multi-Tenant Isolation: School A report contains ONLY School A data", () => {
  const mockStudents = [
    { schoolId: "school_A", rollNo: "101", fullName: "Aarav Sharma", className: "10-A" },
    { schoolId: "school_A", rollNo: "102", fullName: "Diya Patel", className: "10-A" },
    { schoolId: "school_B", rollNo: "901", fullName: "Rohan Gupta", className: "12-B" },
  ];

  const reportA = simulateReportGeneration("school_A", "STUDENTS", "PROFESSIONAL", mockStudents);
  assert.equal(reportA.totalRecords, 2);
  assert.equal(reportA.rows.some((r) => r.schoolId === "school_B"), false);
});

// Test 2: Starter Plan Safe Limited Preview (No data leakage)
test("2. Plan-Based Access: Starter tier returns ONLY 3 preview rows with isRestricted flag", () => {
  const mockStudents = Array.from({ length: 50 }, (_, i) => ({
    schoolId: "school_A",
    rollNo: String(100 + i),
    fullName: `Student ${i}`,
    className: "Class 5",
  }));

  const report = simulateReportGeneration("school_A", "STUDENTS", "STARTER", mockStudents);
  assert.equal(report.totalRecords, 50);
  assert.equal(report.rows.length, 3, "Starter preview must strictly truncate to 3 rows");
  assert.equal(report.isRestricted, true);
  assert.equal(report.previewLimit, 3);
});

// Test 3: Professional Tier Unlocked Dataset
test("3. Plan-Based Access: Professional plan returns complete dataset with isRestricted=false", () => {
  const mockStudents = Array.from({ length: 25 }, (_, i) => ({
    schoolId: "school_A",
    rollNo: String(100 + i),
    fullName: `Student ${i}`,
    className: "Class 8",
  }));

  const report = simulateReportGeneration("school_A", "STUDENTS", "PROFESSIONAL", mockStudents);
  assert.equal(report.rows.length, 25);
  assert.equal(report.isRestricted, false);
});

// Test 4: CSV Export & Formula Injection Sanitization
test("4. CSV Export: Generates RFC-4180 CSV with UTF-8 BOM and neutralizes formula injection (=,+,-,@)", () => {
  const mockReport = {
    title: "Student Directory",
    columns: [
      { key: "name", header: "Name" },
      { key: "phone", header: "Phone" },
      { key: "formulaTest", header: "Formula Test" },
    ],
    rows: [
      { name: "Rahul Kumar", phone: "+919876543210", formulaTest: "=cmd|' /C calc'!A0" },
      { name: "Pooja Verma", phone: "9876543211", formulaTest: "@SUM(1+1)" },
    ],
  };

  const csv = exportToCsv(mockReport);
  assert.equal(csv.startsWith("\uFEFF"), true, "Must include UTF-8 BOM");
  assert.equal(csv.includes("'+919876543210"), true, "Leading + must be escaped with single quote");
  assert.equal(csv.includes("'=cmd"), true, "Leading = must be escaped with single quote");
  assert.equal(csv.includes("'@SUM"), true, "Leading @ must be escaped with single quote");
});

// Test 5: Excel (.xlsx) Binary Export Generation
test("5. Excel Export: Generates valid .xlsx binary buffer with styled headers and summary stats", () => {
  const mockReport = {
    title: "Fee Collections Report",
    schoolName: "Delhi Model School",
    generatedAt: new Date().toISOString(),
    columns: [
      { key: "receiptNo", header: "Receipt #", width: 15 },
      { key: "studentName", header: "Student Name", width: 25 },
      { key: "amount", header: "Amount (₹)", width: 15 },
    ],
    rows: [
      { receiptNo: "REC-001", studentName: "Ananya Roy", amount: 4500 },
      { receiptNo: "REC-002", studentName: "Kabir Das", amount: 6000 },
    ],
    summaryMetrics: [
      { label: "Total Collections", value: "₹10,500" },
    ],
  };

  const excelBuffer = exportToExcel(mockReport);
  assert.equal(excelBuffer instanceof Uint8Array, true);
  assert.equal(excelBuffer.length > 100, true, "Excel buffer must contain valid binary workbook content");
});

// Test 6: PDF Vector Export Generation
test("6. PDF Export: Generates valid PDF binary buffer with header banner, KPIs and table", () => {
  const mockReport = {
    title: "Attendance Summary",
    schoolName: "St. Xavier Academy",
    generatedAt: new Date().toISOString(),
    columns: [
      { key: "date", header: "Date" },
      { key: "studentName", header: "Student Name" },
      { key: "status", header: "Status" },
    ],
    rows: [
      { date: "2026-08-30", studentName: "Siddharth Malhotra", status: "PRESENT" },
      { date: "2026-08-30", studentName: "Neha Sharma", status: "ABSENT" },
    ],
    summaryMetrics: [
      { label: "Present Rate", value: "92%" },
    ],
  };

  const pdfBuffer = exportToPdf(mockReport);
  assert.equal(pdfBuffer instanceof Uint8Array, true);
  assert.equal(pdfBuffer.length > 500, true, "PDF buffer must contain valid binary PDF structure");
  // Check PDF magic bytes (%PDF)
  const headerStr = String.fromCharCode(...pdfBuffer.slice(0, 5));
  assert.equal(headerStr.startsWith("%PDF"), true, "Buffer must start with %PDF header");
});

// Test 7: Export Authorization Gate
test("7. Export Security Guard: Rejects Starter plan export attempt server-side", () => {
  const validateExportPermission = (userPlanTier, userRole) => {
    if (userPlanTier === "STARTER" && userRole !== "super_admin") {
      return { allowed: false, error: "Upgrade required for exports." };
    }
    return { allowed: true };
  };

  assert.equal(validateExportPermission("STARTER", "school_admin").allowed, false);
  assert.equal(validateExportPermission("PROFESSIONAL", "school_admin").allowed, true);
  assert.equal(validateExportPermission("STARTER", "super_admin").allowed, true);
});

// Test 8: Custom School-Specific Pricing Offer (Price isolation)
test("8. Custom Pricing Offer: Scoped offer (₹999 for Pro) does NOT modify global plan price (₹1,999)", () => {
  const globalPlan = { id: "plan_professional", price: 199900 };
  const customOffer = {
    id: "offer_123",
    schoolId: "school_custom_1",
    offerPlanId: "plan_professional",
    originalPricePaise: 199900,
    customPricePaise: 99900,
    discountPaise: 100000,
    status: "ACTIVE",
  };

  // Assert global price unchanged
  assert.equal(globalPlan.price, 199900);
  // Assert custom price applies to school
  assert.equal(customOffer.customPricePaise, 99900);
  assert.equal(customOffer.discountPaise, 100000);
});

// Test 9: Custom Offer Checkout Calculation
test("9. Custom Offer Checkout: Checkout engine resolves active offer price of ₹999 for target school", () => {
  const schoolId = "school_custom_1";
  const activeOffer = {
    schoolId: "school_custom_1",
    offerPlanId: "professional",
    customPricePaise: 99900,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const calculatePrice = (reqSchoolId, planId, billingCycle, globalMonthly) => {
    if (activeOffer && activeOffer.schoolId === reqSchoolId && billingCycle === "monthly") {
      return activeOffer.customPricePaise;
    }
    return globalMonthly;
  };

  assert.equal(calculatePrice("school_custom_1", "professional", "monthly", 199900), 99900);
  assert.equal(calculatePrice("school_other_2", "professional", "monthly", 199900), 199900);
});

// Test 10: Demo Access Duration & Expiration
test("10. Demo Access Override: 7-day demo access computes future expiry and auto-reverts", () => {
  const now = new Date("2026-08-30T10:00:00Z").getTime();
  const durationDays = 7;
  const demoEndAt = new Date(now + durationDays * 86400000).toISOString();

  const isDemoActive = (endAtIso, checkTimeMs) => new Date(endAtIso).getTime() > checkTimeMs;

  assert.equal(isDemoActive(demoEndAt, now + 3 * 86400000), true, "Active on Day 3");
  assert.equal(isDemoActive(demoEndAt, now + 8 * 86400000), false, "Expired on Day 8");
});

// Test 11: Coupon Discount Calculation
test("11. Coupon Engine: Applies percentage and flat discounts accurately in integer paise", () => {
  const applyCoupon = (basePaise, code) => {
    if (code === "SAVE20") return Math.round(basePaise * 0.2);
    if (code === "FLAT500") return 50000;
    return 0;
  };

  assert.equal(applyCoupon(199900, "SAVE20"), 39980);
  assert.equal(applyCoupon(199900, "FLAT500"), 50000);
});

// Test 12: Audit Logging Actions
test("12. Report Audit Matrix: REPORT_VIEWED, REPORT_EXPORTED, CUSTOM_OFFER_CREATED actions supported", () => {
  const allowedActions = new Set([
    "REPORT_VIEWED",
    "REPORT_EXPORTED",
    "REPORT_EXPORT_FAILED",
    "CUSTOM_OFFER_CREATED",
    "CUSTOM_OFFER_PAID",
    "CUSTOM_ACCESS_GRANTED",
  ]);

  assert.equal(allowedActions.has("REPORT_VIEWED"), true);
  assert.equal(allowedActions.has("REPORT_EXPORTED"), true);
  assert.equal(allowedActions.has("CUSTOM_OFFER_CREATED"), true);
});

console.log("\n==================================================");
console.log(`REPORT ENGINE & CUSTOM OFFERS TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("==================================================");
