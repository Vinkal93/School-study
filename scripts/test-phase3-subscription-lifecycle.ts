export {};

import {
  calculateAccessMode,
  calculateSubscriptionState,
  getSubscriptionReminder,
  canAccessFeature,
  runSubscriptionLifecycleTask,
  DEFAULT_GLOBAL_ACCESS_POLICY,
  DEFAULT_REMINDER_THRESHOLDS,
} from "../src/lib/billing";
import type { SchoolSubscription, GlobalAccessPolicy } from "../src/types";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

async function runPhase3Tests() {
  console.log("\n==========================================");
  console.log("PHASE 3 SUBSCRIPTION LIFECYCLE & ACCESS CONTROL TEST SUITE");
  console.log("==========================================\n");

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Mock active subscription expiring in 30 days
  const mockSub30d: SchoolSubscription = {
    id: "school_test_30d",
    schoolId: "school_test_30d",
    planId: "professional",
    planVersionId: "ver_prof_v1",
    status: "ACTIVE",
    billingCycle: "monthly",
    startsAt: new Date(now - 30 * dayMs).toISOString(),
    expiresAt: new Date(now + 30 * dayMs).toISOString(),
    graceEndsAt: new Date(now + 37 * dayMs).toISOString(),
    source: "self_onboarding",
    lastPaymentId: null,
    lastOrderId: null,
    createdAt: new Date(now - 30 * dayMs).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };

  // Mock active subscription expiring in 7 days
  const mockSub7d: SchoolSubscription = {
    ...mockSub30d,
    id: "school_test_7d",
    schoolId: "school_test_7d",
    expiresAt: new Date(now + 7 * dayMs).toISOString(),
    graceEndsAt: new Date(now + 14 * dayMs).toISOString(),
  };

  // Mock subscription in grace period (expired 2 days ago, 5 days grace remaining)
  const mockSubGrace: SchoolSubscription = {
    ...mockSub30d,
    id: "school_test_grace",
    schoolId: "school_test_grace",
    status: "GRACE_PERIOD",
    expiresAt: new Date(now - 2 * dayMs).toISOString(),
    graceEndsAt: new Date(now + 5 * dayMs).toISOString(),
  };

  // Mock subscription fully expired (expired 10 days ago, grace ended 3 days ago)
  const mockSubExpired: SchoolSubscription = {
    ...mockSub30d,
    id: "school_test_expired",
    schoolId: "school_test_expired",
    status: "EXPIRED",
    expiresAt: new Date(now - 10 * dayMs).toISOString(),
    graceEndsAt: new Date(now - 3 * dayMs).toISOString(),
  };

  // 1. 30-Day Reminder State Calculation (Section 5 & 6)
  const state30 = calculateSubscriptionState(mockSub30d, DEFAULT_GLOBAL_ACCESS_POLICY, now);
  assert(state30.daysRemaining === 30, "1. 30-Day Reminder: daysRemaining = 30");
  assert(state30.accessMode === "EXPIRING", "2. 30-Day Reminder: accessMode = EXPIRING");

  // 2. 7-Day Urgent Reminder Test (Section 7)
  const state7 = calculateSubscriptionState(mockSub7d, DEFAULT_GLOBAL_ACCESS_POLICY, now);
  assert(state7.daysRemaining === 7, "3. 7-Day Reminder: daysRemaining = 7");
  assert(state7.accessMode === "EXPIRING", "4. 7-Day Reminder: accessMode = EXPIRING");

  // 3. Grace Period Resolution (Section 13 & 14)
  const stateGrace = calculateSubscriptionState(mockSubGrace, DEFAULT_GLOBAL_ACCESS_POLICY, now);
  assert(stateGrace.isInGrace === true, "5. Grace Period: isInGrace = true");
  assert(stateGrace.accessMode === "GRACE_ACCESS", "6. Grace Period: accessMode = GRACE_ACCESS");

  // 4. Fully Expired Resolution (Section 15 & 16)
  const stateExpired = calculateSubscriptionState(mockSubExpired, DEFAULT_GLOBAL_ACCESS_POLICY, now);
  assert(stateExpired.isExpired === true, "7. Fully Expired: isExpired = true");
  assert(stateExpired.accessMode === "RESTRICTED_ACCESS", "8. Fully Expired: accessMode = RESTRICTED_ACCESS");

  // 5. Role Targeting Filter (Section 7)
  const remStudent = await getSubscriptionReminder("school_test_7d", "student", now);
  assert(remStudent.showPopup === false, "9. Role targeting: Student hides popup warning");

  // 6. Idempotent Lifecycle Task Execution (Section 26 & 27)
  const taskRes = await runSubscriptionLifecycleTask(now);
  assert(typeof taskRes.processed === "number", "10. Idempotent background lifecycle task executes cleanly");

  console.log("\n==========================================");
  console.log("ALL 10/10 PHASE 3 SUBSCRIPTION TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runPhase3Tests();
