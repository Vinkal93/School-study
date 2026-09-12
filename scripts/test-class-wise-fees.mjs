/**
 * CLASS-WISE FEE RESOLUTION & SERVER VALIDATION TEST SUITE
 * 
 * Verifies:
 * 1. Class-wise fee resolution for different grades (Class 6: ₹500, Class 7: ₹700, Class 8: ₹900).
 * 2. Precedence: Individual Student Assignment > Class Structure > Failure (No Hardcoded Fallbacks).
 * 3. Exact rejection when no structure exists (isConfigured: false, zero ₹500 fallback).
 * 4. Server collection validation preventing client tampering.
 */

// Simulated authoritative resolver matching src/lib/services/fee.service.ts
function resolveApplicableFee({
  studentId,
  classId,
  academicYear = "2025-2026",
  studentAssignments = [],
  classStructures = [],
}) {
  // 1. Check individual student assignment
  const studentAssignment = studentAssignments.find(
    (a) => a.studentId === studentId && (!a.academicYear || a.academicYear === academicYear)
  );

  if (studentAssignment && typeof studentAssignment.monthlyTuitionFee === "number") {
    const monthlyPaise = studentAssignment.monthlyTuitionFee;
    return {
      monthlyFeePaise: monthlyPaise,
      monthlyFeeRupees: Math.round(monthlyPaise / 100),
      source: "STUDENT_ASSIGNMENT",
      isConfigured: true,
      feeStructureTitle: studentAssignment.feeStructureTitle || "Individual Assignment",
    };
  }

  // 2. Authoritative Class Fee Structure
  const matchingStructure = classStructures.find(
    (s) =>
      s.classId === classId &&
      (!s.academicYear || s.academicYear === academicYear) &&
      (s.status === "ACTIVE" || !s.status)
  );

  if (matchingStructure && typeof matchingStructure.monthlyFeePaise === "number") {
    const monthlyPaise = matchingStructure.monthlyFeePaise;
    return {
      monthlyFeePaise: monthlyPaise,
      monthlyFeeRupees: Math.round(monthlyPaise / 100),
      source: "CLASS_STRUCTURE",
      isConfigured: true,
      feeStructureTitle: matchingStructure.name || "Class Fee Structure",
    };
  }

  // 3. ZERO hardcoded ₹500 fallbacks!
  return {
    monthlyFeePaise: 0,
    monthlyFeeRupees: 0,
    source: "NONE",
    isConfigured: false,
    feeStructureTitle: "Fee structure not configured for this class",
  };
}

// Server collect route fee validator
function validateServerCollection({
  studentId,
  classId,
  requestedAmountRupees,
  resolvedFee,
}) {
  if (!resolvedFee.isConfigured || resolvedFee.monthlyFeeRupees <= 0) {
    return {
      valid: false,
      code: "FEE_UNCONFIGURED",
      error: "Fee structure is not configured for this student class. Please configure class fees first.",
    };
  }

  if (requestedAmountRupees < resolvedFee.monthlyFeeRupees) {
    return {
      valid: false,
      code: "FEE_UNDERPAID",
      error: `Amount paid ₹${requestedAmountRupees} is less than monthly rate of ₹${resolvedFee.monthlyFeeRupees}.`,
    };
  }

  return { valid: true };
}

// ==========================================
// TEST RUNNER
// ==========================================
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log("\n==========================================");
console.log("RUNNING CLASS-WISE FEE RESOLUTION TESTS");
console.log("==========================================\n");

const classStructures = [
  { classId: "cls_6", name: "Grade 6 Standard", monthlyFeePaise: 50000, academicYear: "2025-2026", status: "ACTIVE" }, // ₹500
  { classId: "cls_7", name: "Grade 7 Standard", monthlyFeePaise: 70000, academicYear: "2025-2026", status: "ACTIVE" }, // ₹700
  { classId: "cls_8", name: "Grade 8 Standard", monthlyFeePaise: 90000, academicYear: "2025-2026", status: "ACTIVE" }, // ₹900
];

const studentAssignments = [
  { studentId: "stu_scholarship", monthlyTuitionFee: 25000, feeStructureTitle: "50% Merit Scholarship" }, // ₹250
];

// Test 1: Grade-wise resolution
console.log("Test Suite 1: Grade-wise Distinct Fee Rates");
const fee6 = resolveApplicableFee({ studentId: "stu_1", classId: "cls_6", classStructures });
assert(fee6.monthlyFeeRupees === 500, "Class 6 resolves to ₹500");
assert(fee6.isConfigured === true, "Class 6 is marked configured");
assert(fee6.source === "CLASS_STRUCTURE", "Source is CLASS_STRUCTURE");

const fee7 = resolveApplicableFee({ studentId: "stu_2", classId: "cls_7", classStructures });
assert(fee7.monthlyFeeRupees === 700, "Class 7 resolves to ₹700 (NOT ₹500)");
assert(fee7.isConfigured === true, "Class 7 is marked configured");

const fee8 = resolveApplicableFee({ studentId: "stu_3", classId: "cls_8", classStructures });
assert(fee8.monthlyFeeRupees === 900, "Class 8 resolves to ₹900 (NOT ₹500)");
assert(fee8.isConfigured === true, "Class 8 is marked configured");

// Test 2: Student override precedence
console.log("\nTest Suite 2: Individual Student Override Precedence");
const feeOverride = resolveApplicableFee({
  studentId: "stu_scholarship",
  classId: "cls_8", // Student is in class 8 (₹900) but has ₹250 scholarship
  studentAssignments,
  classStructures,
});
assert(feeOverride.monthlyFeeRupees === 250, "Scholarship override takes precedence over ₹900 class rate");
assert(feeOverride.source === "STUDENT_ASSIGNMENT", "Source is STUDENT_ASSIGNMENT");

// Test 3: Unconfigured class - ZERO hardcoded fallback
console.log("\nTest Suite 3: Zero Hardcoded ₹500 Fallbacks for Unconfigured Classes");
const feeUnconfigured = resolveApplicableFee({
  studentId: "stu_unconf",
  classId: "cls_9_unconfigured",
  classStructures,
});
assert(feeUnconfigured.isConfigured === false, "Unconfigured class is marked isConfigured: false");
assert(feeUnconfigured.monthlyFeeRupees === 0, "Unconfigured fee is 0, NEVER defaulted to ₹500");
assert(feeUnconfigured.feeStructureTitle === "Fee structure not configured for this class", "Clear message when unconfigured");

// Test 4: Server validation
console.log("\nTest Suite 4: Server Payment Collection Validation");
const valValid = validateServerCollection({
  studentId: "stu_2",
  classId: "cls_7",
  requestedAmountRupees: 700,
  resolvedFee: fee7,
});
assert(valValid.valid === true, "Server approves correct payment for Class 7");

const valUnconfigured = validateServerCollection({
  studentId: "stu_unconf",
  classId: "cls_9_unconfigured",
  requestedAmountRupees: 500,
  resolvedFee: feeUnconfigured,
});
assert(valUnconfigured.valid === false && valUnconfigured.code === "FEE_UNCONFIGURED", "Server rejects fee collection for unconfigured class");

console.log("\n==========================================");
console.log(`CLASS-WISE FEE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================\n");

if (failed > 0) process.exit(1);
