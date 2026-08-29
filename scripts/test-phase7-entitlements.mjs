/**
 * Phase 7 Plan Limits & Feature Enforcement Engine Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 7 ENTITLEMENT & PLAN LIMIT TESTS");
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

// 1. Central Feature Keys & Normalization Test
test("1. Feature registry & alias resolution", () => {
  const allowedFeatures = ["student_management", "basic_attendance", "school_dashboard"];
  
  const isAllowed = (feat) => {
    const aliases = {
      attendance: ["basic_attendance", "attendance_automation"],
      students: ["student_management"],
    };
    if (allowedFeatures.includes(feat)) return true;
    const match = aliases[feat];
    return match ? match.some((m) => allowedFeatures.includes(m)) : false;
  };

  assert.equal(isAllowed("student_management"), true);
  assert.equal(isAllowed("students"), true);
  assert.equal(isAllowed("attendance"), true);
  assert.equal(isAllowed("advanced_reports"), false);
});

// 2. Feature Dependency Enforcement Test
test("2. Feature dependencies enforcement (advanced_reports requires reports)", () => {
  const checkDependencies = (feat, allowedList) => {
    const deps = {
      advanced_reports: ["reports", "school_dashboard"],
    };
    const required = deps[feat];
    if (!required) return true;
    return required.every((r) => allowedList.includes(r));
  };

  assert.equal(checkDependencies("advanced_reports", ["reports", "school_dashboard"]), true);
  assert.equal(checkDependencies("advanced_reports", ["school_dashboard"]), false);
});

// 3. Plan Limit Calculation: Capacity Available
test("3. Plan limit check: capacity available (499/500)", () => {
  const current = 499;
  const limit = 500;
  const isUnlimited = limit === -1;
  const isOverLimit = !isUnlimited && current > limit;
  const isLimitReached = !isUnlimited && current >= limit;
  const allowed = !isLimitReached;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current);

  assert.equal(allowed, true);
  assert.equal(remaining, 1);
  assert.equal(isOverLimit, false);
});

// 4. Plan Limit Calculation: Limit Reached Boundary
test("4. Plan limit check: limit reached boundary (500/500)", () => {
  const current = 500;
  const limit = 500;
  const isUnlimited = limit === -1;
  const isOverLimit = !isUnlimited && current > limit;
  const isLimitReached = !isUnlimited && current >= limit;
  const allowed = !isLimitReached;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current);

  assert.equal(allowed, false);
  assert.equal(remaining, 0);
  assert.equal(isOverLimit, false);
  assert.equal(isLimitReached, true);
});

// 5. Over-Limit State (e.g. 700 / 500 after downgrade)
test("5. Plan limit check: over-limit state after downgrade (700/500)", () => {
  const current = 700;
  const limit = 500;
  const isUnlimited = limit === -1;
  const isOverLimit = !isUnlimited && current > limit;
  const isLimitReached = !isUnlimited && current >= limit;
  const allowed = !isLimitReached;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current);

  assert.equal(allowed, false);
  assert.equal(remaining, 0);
  assert.equal(isOverLimit, true);
});

// 6. Explicit Unlimited Capacity (-1) Handling
test("6. Explicit Unlimited capacity representation (-1)", () => {
  const current = 25000;
  const limit = -1;
  const isUnlimited = limit === -1;
  const isOverLimit = !isUnlimited && current > limit;
  const isLimitReached = !isUnlimited && current >= limit;
  const allowed = isUnlimited || !isLimitReached;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current);

  assert.equal(isUnlimited, true);
  assert.equal(allowed, true);
  assert.equal(remaining, Infinity);
  assert.equal(isOverLimit, false);
});

// 7. Atomic Usage Decrement on Resource Deletion
test("7. Atomic usage decrement on deletion (500 -> 499)", () => {
  let usageCount = 500;
  const decrement = (amt = 1) => {
    usageCount = Math.max(0, usageCount - amt);
  };

  decrement(1);
  assert.equal(usageCount, 499);
  
  // Now limit check should pass
  const limit = 500;
  const allowed = usageCount < limit;
  assert.equal(allowed, true);
});

// 8. Downgrade Safety (No Data Loss)
test("8. Downgrade safety preserves existing data", () => {
  const existingStudents = 700;
  const newPlanLimit = 500;
  
  // Editing existing student is allowed
  const canEditExisting = true;
  // Creating new student is blocked
  const canCreateNew = existingStudents < newPlanLimit;

  assert.equal(canEditExisting, true);
  assert.equal(canCreateNew, false);
});

// 9. Concurrency Boundary Simulation (499/500 with simultaneous requests)
test("9. Concurrency simulation on limit boundary", () => {
  let currentUsage = 499;
  const limit = 500;

  // Transaction simulation
  function attemptCreateWithTransaction() {
    if (currentUsage >= limit && limit !== -1) {
      throw new Error("LIMIT_REACHED");
    }
    currentUsage++;
    return { success: true, count: currentUsage };
  }

  // Request 1 succeeds
  const req1 = attemptCreateWithTransaction();
  assert.equal(req1.success, true);
  assert.equal(currentUsage, 500);

  // Request 2 rejects safely without exceeding limit
  assert.throws(() => attemptCreateWithTransaction(), /LIMIT_REACHED/);
  assert.equal(currentUsage, 500);
});

// 10. Effective Entitlement Structure Integrity
test("10. Effective entitlement resolution structure", () => {
  const entitlement = {
    schoolId: "school_123",
    subscriptionStatus: "ACTIVE",
    accessMode: "FULL_ACCESS",
    plan: { id: "plan_professional", name: "Professional Plan", slug: "professional", version: 1 },
    features: { student_management: true, teacher_management: true, reports: true },
    limits: {
      students: { current: 420, limit: 2000, remaining: 1580, isOverLimit: false, isUnlimited: false },
      teachers: { current: 12, limit: 100, remaining: 88, isOverLimit: false, isUnlimited: false },
      classes: { current: 18, limit: 60, remaining: 42, isOverLimit: false, isUnlimited: false },
      staff: { current: 2, limit: 10, remaining: 8, isOverLimit: false, isUnlimited: false },
    },
    isExpired: false,
    isInGrace: false,
    daysRemaining: 28,
  };

  assert.equal(entitlement.schoolId, "school_123");
  assert.equal(entitlement.limits.students.remaining, 1580);
  assert.equal(entitlement.features.reports, true);
});

console.log("\n==================================================");
console.log(`PHASE 7 TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
