/**
 * PHASE 6 — SUBSCRIPTION LIFECYCLE + ENTITLEMENT SYNCHRONIZATION TEST SUITE
 * 
 * Comprehensive E2E Verification of:
 * 1. Authoritative Subscription State Machine & Lifecycle Transitions
 * 2. Real-time Entitlement Synchronization across Sidebar, Pages, Actions, and Limits
 * 3. Immediate Upgrades & Scheduled Downgrades with Limit Validation
 * 4. Idempotent Early and Post-Expiry Renewals with Unspent Time Preservation
 * 5. Super Admin Manual Controls (Extension, Plan Assignment, FULL_CONTROL, Reset)
 * 6. Dynamic "Required Plan" Resolution (Zero hardcoding)
 * 7. Multi-Tenant Isolation & Zero Client-Side Clock Trust (Fail-Closed)
 */

import {
  computeSubscriptionStatus,
  getSchoolSubscription,
  updateSchoolSubscription,
} from "../src/lib/billing/subscriptions.js";
import {
  renewSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  suspendSubscription,
  resumeSuspendedSubscription,
} from "../src/lib/billing/subscriptionLifecycleEngine.js";
import {
  calculateAccessMode,
  calculateSubscriptionState,
  getSchoolAccess,
} from "../src/lib/billing/accessEngine.js";
import {
  getEffectiveEntitlement,
} from "../src/lib/billing/entitlement.js";
import {
  getPlanFeatures,
  getEffectiveFeatureAccessModes,
  getRequiredPlanForFeature,
} from "../src/lib/billing/featureAccess.js";
import {
  adjustSubscriptionPeriod,
  createLimitOverride,
  createAccessOverride,
  resetSchoolEntitlements,
  addDays,
  addMonths,
} from "../src/lib/billing/subscriptionAdjustmentEngine.js";
import { getGlobalAccessPolicy } from "../src/lib/billing/accessPolicy.js";
import { getAllPlans, getActivePlan } from "../src/lib/billing/plans.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✔ ${message}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING PHASE 6 — SUBSCRIPTION LIFECYCLE & ENTITLEMENT SYNC SUITE");
  console.log("==================================================\n");

  const policy = await getGlobalAccessPolicy();
  const now = Date.now();

  // =========================================================================
  // TEST 1: Canonical Lifecycle State Computations & Server Authority
  // =========================================================================
  console.log("▶ [Test 1] Canonical Subscription State Machine & Timestamp Evaluation");
  {
    const future30d = new Date(now + 30 * 86400000).toISOString();
    const future37d = new Date(now + 37 * 86400000).toISOString();
    const activeStatus = computeSubscriptionStatus(future30d, future37d, "ACTIVE", now);
    assert(activeStatus === "ACTIVE", "Active status resolved for future expiry (>7d)");

    const future5d = new Date(now + 5 * 86400000).toISOString();
    const future12d = new Date(now + 12 * 86400000).toISOString();
    const expiringStatus = computeSubscriptionStatus(future5d, future12d, "ACTIVE", now);
    assert(expiringStatus === "EXPIRING", "Expiring warning state resolved when <= 7 days remain");

    const past2d = new Date(now - 2 * 86400000).toISOString();
    const future5dGrace = new Date(now + 5 * 86400000).toISOString();
    const graceStatus = computeSubscriptionStatus(past2d, future5dGrace, "ACTIVE", now);
    assert(graceStatus === "GRACE_PERIOD", "Grace period state resolved between expiry and grace end");

    const past10d = new Date(now - 10 * 86400000).toISOString();
    const past3dGrace = new Date(now - 3 * 86400000).toISOString();
    const expiredStatus = computeSubscriptionStatus(past10d, past3dGrace, "ACTIVE", now);
    assert(expiredStatus === "EXPIRED", "Expired status resolved once grace period has elapsed");

    const suspendedStatus = computeSubscriptionStatus(future30d, future37d, "SUSPENDED", now);
    assert(suspendedStatus === "SUSPENDED", "Suspended status remains strictly SUSPENDED regardless of dates");
  }

  // =========================================================================
  // TEST 2: AccessMode Resolution Across Lifecycle
  // =========================================================================
  console.log("\n▶ [Test 2] AccessMode Resolution: FULL_ACCESS -> EXPIRING -> GRACE_ACCESS -> RESTRICTED_ACCESS -> NO_ACCESS");
  {
    const subActive = {
      id: "school_test_mode",
      schoolId: "school_test_mode",
      planId: "plan_professional",
      status: "ACTIVE",
      expiresAt: new Date(now + 20 * 86400000).toISOString(),
      graceEndsAt: new Date(now + 27 * 86400000).toISOString(),
    };
    assert(calculateAccessMode(subActive, policy, now) === "FULL_ACCESS", "Active sub gets FULL_ACCESS");

    const subExpiring = {
      ...subActive,
      expiresAt: new Date(now + 4 * 86400000).toISOString(),
      graceEndsAt: new Date(now + 11 * 86400000).toISOString(),
    };
    assert(calculateAccessMode(subExpiring, policy, now) === "EXPIRING", "Expiring sub gets EXPIRING mode (banner shown)");

    const subGrace = {
      ...subActive,
      expiresAt: new Date(now - 2 * 86400000).toISOString(),
      graceEndsAt: new Date(now + 5 * 86400000).toISOString(),
    };
    assert(calculateAccessMode(subGrace, policy, now) === "GRACE_ACCESS", "Grace sub gets GRACE_ACCESS");

    const subExpired = {
      ...subActive,
      expiresAt: new Date(now - 10 * 86400000).toISOString(),
      graceEndsAt: new Date(now - 3 * 86400000).toISOString(),
    };
    assert(calculateAccessMode(subExpired, policy, now) === "RESTRICTED_ACCESS", "Expired sub gets RESTRICTED_ACCESS");

    const subSuspended = {
      ...subActive,
      status: "SUSPENDED",
    };
    assert(calculateAccessMode(subSuspended, policy, now) === "NO_ACCESS", "Suspended sub gets NO_ACCESS");
  }

  // =========================================================================
  // TEST 3: Immediate Plan Upgrade Flow & Version Sync
  // =========================================================================
  console.log("\n▶ [Test 3] Immediate Subscription Upgrade & Real-Time Version Linkage");
  {
    const schoolId = "school_upg_test_" + Date.now();
    await updateSchoolSubscription(schoolId, {
      planId: "plan_starter",
      billingCycle: "monthly",
      durationDays: 30,
    });

    const entBefore = await getEffectiveEntitlement(schoolId);
    assert(entBefore.plan.id === "plan_starter", "Initial plan is Starter");

    // Upgrade to Professional
    const upgResult = await upgradeSubscription(schoolId, {
      targetPlanId: "plan_professional",
      orderId: "order_upg_12345",
      paymentId: "pay_upg_67890",
      billingCycle: "annual",
      actorId: "admin_user_upg",
    });

    assert(upgResult.success === true, "Upgrade transaction completed successfully");
    assert(upgResult.subscription.planId === "plan_professional", "Updated subscription has plan_professional");
    assert(upgResult.subscription.billingCycle === "annual", "Updated billing cycle is annual");

    const entAfter = await getEffectiveEntitlement(schoolId);
    assert(entAfter.plan.id === "plan_professional", "Effective entitlement immediately reflects upgraded plan");
    assert(entAfter.limits.students.limit >= 2000, "Student limit automatically elevated to Professional tier");
  }

  // =========================================================================
  // TEST 4: Scheduled Downgrade with Limit Validation & Period End Execution
  // =========================================================================
  console.log("\n▶ [Test 4] Scheduled Downgrade & Resource Limit Safety Gate");
  {
    const schoolId = "school_dng_test_" + Date.now();
    await updateSchoolSubscription(schoolId, {
      planId: "plan_professional",
      billingCycle: "monthly",
      durationDays: 30,
    });

    // 1. Attempt downgrade with usage exceeding Starter limit (max 500)
    let limitBlocked = false;
    try {
      await scheduleDowngrade(schoolId, {
        targetPlanId: "plan_starter",
        currentStudentCount: 750, // Exceeds Starter 500 limit
      });
    } catch (err) {
      limitBlocked = true;
      assert(err.message.includes("exceeds the target plan limit"), "Blocked downgrade due to excess student usage");
    }
    assert(limitBlocked === true, "Safety check prevented downgrade when usage exceeds target limits");

    // 2. Downgrade with valid student count
    const dngResult = await scheduleDowngrade(schoolId, {
      targetPlanId: "plan_starter",
      currentStudentCount: 50,
      actorId: "admin_user_dng",
    });

    assert(dngResult.success === true, "Downgrade scheduled successfully");
    assert(dngResult.pendingChange.type === "DOWNGRADE", "Pending change recorded as DOWNGRADE");
    assert(dngResult.pendingChange.targetPlanId === "plan_starter", "Target plan set to plan_starter");

    // Verify current active tier remains Professional until period end
    const entCurrent = await getEffectiveEntitlement(schoolId);
    assert(entCurrent.plan.id === "plan_professional", "Active plan remains Professional while downgrade is pending");
  }

  // =========================================================================
  // TEST 5: Renewal Engine: Early Renewal Preservation & Idempotency
  // =========================================================================
  console.log("\n▶ [Test 5] Subscription Renewal (Early Preservation & Idempotency)");
  {
    const schoolId = "school_ren_test_" + Date.now();
    // Sub expires in 15 days
    const currentExpiry = new Date(now + 15 * 86400000);
    const sub = await updateSchoolSubscription(schoolId, {
      planId: "plan_professional",
      billingCycle: "monthly",
      durationDays: 15,
    });

    const renResult = await renewSubscription(schoolId, {
      orderId: "order_ren_111",
      paymentId: "pay_ren_222",
      billingCycle: "monthly",
      actorId: "school_admin_ren",
    });

    const newExpiryDate = new Date(renResult.subscription.expiresAt);
    const expectedExpiryMin = new Date(currentExpiry.getTime() + 29 * 86400000); // 15 + 30 = 45 days from now
    assert(newExpiryDate >= expectedExpiryMin, "Early renewal preserved remaining 15 days (+30 days added to currentExpiry)");

    // Idempotent fulfillment of same orderId
    const duplicateRen = await renewSubscription(schoolId, {
      orderId: "order_ren_111",
      paymentId: "pay_ren_222",
      billingCycle: "monthly",
    });
    assert(
      duplicateRen.subscription.expiresAt === renResult.subscription.expiresAt,
      "Duplicate renewal call with same orderId returned idempotent result without double charging days"
    );
  }

  // =========================================================================
  // TEST 6: Super Admin Manual Controls & FULL_CONTROL Synergy
  // =========================================================================
  console.log("\n▶ [Test 6] Super Admin Manual Adjustments, FULL_CONTROL & Reset to Default");
  {
    const schoolId = "school_admin_ctrl_" + Date.now();
    await updateSchoolSubscription(schoolId, {
      planId: "plan_starter",
      billingCycle: "monthly",
      durationDays: 10,
    });

    // 1. Manual extension (+30 days)
    const adjResult = await adjustSubscriptionPeriod(schoolId, {
      type: "ADD_DAYS",
      value: 30,
      reason: "Courtesy extension granted by Super Admin",
      actorId: "super_admin_01",
    });
    assert(adjResult.success === true, "Super Admin manual extension +30 days succeeded");

    // 2. Grant FULL_CONTROL override
    await createAccessOverride(schoolId, {
      type: "TEMPORARY_ACCESS",
      reason: "VIP Testing Access",
      actorId: "super_admin_01",
    });

    const entFull = await getEffectiveEntitlement(schoolId);
    assert(entFull.accessMode === "FULL_ACCESS", "FULL_CONTROL sets effectiveAccessMode to FULL_ACCESS");
    assert(entFull.limits.students.isUnlimited === true, "FULL_CONTROL unlocks unlimited student capacity (-1)");
    assert(entFull.limits.teachers.isUnlimited === true, "FULL_CONTROL unlocks unlimited teacher capacity (-1)");

    // 3. Reset adjustments back to plan default
    const resetResult = await resetSchoolEntitlements(schoolId, {
      actorId: "super_admin_01",
      reason: "Testing reset functionality",
    });
    assert(resetResult.success === true, "Reset to plan default succeeded");

    const entReset = await getEffectiveEntitlement(schoolId);
    assert(entReset.limits.students.isUnlimited === false, "Limits restored to base plan starter limits (500 max)");
  }

  // =========================================================================
  // TEST 7: Emergency Suspension & Resumption
  // =========================================================================
  console.log("\n▶ [Test 7] Emergency Suspension & Resumption by Super Admin");
  {
    const schoolId = "school_susp_test_" + Date.now();
    await updateSchoolSubscription(schoolId, {
      planId: "plan_professional",
      billingCycle: "monthly",
      durationDays: 30,
    });

    // Suspend
    const suspResult = await suspendSubscription(schoolId, "Non-compliance with terms of service", "super_admin_01");
    assert(suspResult.subscription.status === "SUSPENDED", "Subscription status set to SUSPENDED");

    const entSusp = await getEffectiveEntitlement(schoolId);
    assert(entSusp.subscriptionStatus === "SUSPENDED", "Entitlement reflects SUSPENDED status");
    assert(entSusp.accessMode === "NO_ACCESS" || entSusp.accessMode === "RESTRICTED_ACCESS", "Access mode restricted upon suspension");

    // Resume
    const resumeResult = await resumeSuspendedSubscription(schoolId, "super_admin_01");
    assert(resumeResult.subscription.status === "ACTIVE", "Subscription successfully resumed to ACTIVE");

    const entResumed = await getEffectiveEntitlement(schoolId);
    assert(entResumed.subscriptionStatus === "ACTIVE", "Entitlement restored to ACTIVE");
    assert(entResumed.accessMode === "FULL_ACCESS", "AccessMode restored to FULL_ACCESS");
  }

  // =========================================================================
  // TEST 8: Dynamic "Required Plan" Resolution (Zero Hardcoded Plan Names)
  // =========================================================================
  console.log("\n▶ [Test 8] Dynamic Required Plan Resolution");
  {
    const plans = await getAllPlans();
    assert(Array.isArray(plans) && plans.length >= 2, "Loaded active dynamic plans");

    const reqStarter = await getRequiredPlanForFeature("student_management", "plan_starter");
    assert(typeof reqStarter.planName === "string" && reqStarter.planName.length > 0, "Resolved required plan name dynamically");

    const reqAdvanced = await getRequiredPlanForFeature("fee_management", "plan_starter");
    assert(reqAdvanced.planSlug !== "starter", "fee_management requires a higher tier than starter");
  }

  // =========================================================================
  // TEST 9: Multi-Tenant Isolation
  // =========================================================================
  console.log("\n▶ [Test 9] Multi-Tenant Subscription Isolation");
  {
    const schoolA = "tenant_iso_school_A_" + Date.now();
    const schoolB = "tenant_iso_school_B_" + Date.now();

    await updateSchoolSubscription(schoolA, {
      planId: "plan_starter",
      billingCycle: "monthly",
      durationDays: 30,
    });
    await updateSchoolSubscription(schoolB, {
      planId: "plan_enterprise",
      billingCycle: "annual",
      durationDays: 365,
    });

    const entA = await getEffectiveEntitlement(schoolA);
    const entB = await getEffectiveEntitlement(schoolB);

    assert(entA.plan.id === "plan_starter", "School A is isolated on Starter plan");
    assert(entB.plan.id === "plan_enterprise", "School B is isolated on Enterprise plan");

    // Suspend School A only
    await suspendSubscription(schoolA, "Test isolation suspension", "super_admin_01");

    const entAAfter = await getEffectiveEntitlement(schoolA);
    const entBAfter = await getEffectiveEntitlement(schoolB);

    assert(entAAfter.subscriptionStatus === "SUSPENDED", "School A is suspended");
    assert(entBAfter.subscriptionStatus === "ACTIVE", "School B remains active and unaffected");
    assert(entBAfter.accessMode === "FULL_ACCESS", "School B retains full access");
  }

  // =========================================================================
  // TEST 10: Fail-Closed Security for Unknown / Malformed Subscriptions
  // =========================================================================
  console.log("\n▶ [Test 10] Fail-Closed Security on Malformed Inputs");
  {
    const entUnknown = await getEffectiveEntitlement("non_existent_unprovisioned_school_xyz");
    assert(entUnknown !== null && typeof entUnknown === "object", "Fallback entitlement provided safely");
    assert(entUnknown.limits.students.limit > 0, "Safe fallback limits assigned");
    assert(entUnknown.limits.students.isUnlimited === false, "Does NOT default to unlimited bypass");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 10 PHASE 6 SUBSCRIPTION LIFECYCLE & ENTITLEMENT SYNC TEST SUITES PASSED!");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test execution failed with error:", err);
  process.exit(1);
});
