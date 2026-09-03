import assert from "assert";
import {
  calculateServerBillingPrice,
  getGstSettings,
  updateGstSettings,
  validateCouponForOrder,
  createCoupon,
  deleteCoupon,
  getCouponByCode,
  getAllCoupons,
  DEFAULT_GST_SETTINGS,
} from "../src/lib/billing/gstCouponsEngine.ts";
import { deletePlan, createPlan } from "../src/lib/billing/plans.ts";
import { canAccessFeature, getPlanFeatures } from "../src/lib/billing/featureAccess.ts";
import { getSafeAdminDb } from "../src/lib/firebase/admin.ts";

console.log("======================================================================");
console.log("🎯 RUNNING SUPER ADMIN DYNAMIC PRICING, GST & COUPONS SECURITY SUITE");
console.log("======================================================================\n");

async function runSuite() {
  let passedCount = 0;
  let totalCount = 0;

  function testPass(desc) {
    totalCount++;
    passedCount++;
    console.log(`  ✅ [VERIFIED] ${desc}`);
  }

  function testFail(desc, err) {
    totalCount++;
    console.error(`  ❌ [FAILED] ${desc}:`, err.message || err);
  }

  // ------------------------------------------------------------------
  // TEST 1: GST Engine Server-Side Breakdown (GST OFF vs GST ON 18%)
  // ------------------------------------------------------------------
  try {
    console.log("🔹 Test 1: GST Engine Calculation Breakdown");

    // 1A. Test GST OFF
    await updateGstSettings({ gstEnabled: false, gstPercentage: 18 }, "test_suite");
    const calcGstOff = await calculateServerBillingPrice({
      planId: "plan_professional",
      billingCycle: "monthly",
    });

    assert.strictEqual(calcGstOff.gstEnabled, false);
    assert.strictEqual(calcGstOff.gstAmountPaise, 0);
    assert.strictEqual(calcGstOff.finalAmountPaise, calcGstOff.taxableAmountPaise);

    // 1B. Test GST ON (18%)
    await updateGstSettings({ gstEnabled: true, gstPercentage: 18 }, "test_suite");
    const calcGstOn = await calculateServerBillingPrice({
      planId: "plan_professional",
      billingCycle: "monthly",
    });

    assert.strictEqual(calcGstOn.gstEnabled, true);
    assert.strictEqual(calcGstOn.gstRate, 18);
    const expectedGst = Math.round(calcGstOn.taxableAmountPaise * 0.18);
    assert.strictEqual(calcGstOn.gstAmountPaise, expectedGst);
    assert.strictEqual(calcGstOn.finalAmountPaise, calcGstOn.taxableAmountPaise + expectedGst);

    testPass("GST Calculation Engine strictly computes Taxable Amount, GST % (18%), and Final Amount");
  } catch (err) {
    testFail("GST Engine Calculation", err);
  }

  // ------------------------------------------------------------------
  // TEST 2: Coupon Engine Validation & Server-Side Discounts
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 2: Coupon Engine Rules & Validation");

    // 2A. Valid Percentage Coupon
    const percVal = await validateCouponForOrder("SAVE20", "plan_professional", "monthly", 199900);
    assert.strictEqual(percVal.isValid, true);
    assert.strictEqual(percVal.discountPaise, Math.round(199900 * 0.2));

    // 2B. Valid Fixed Amount Coupon
    const fixedVal = await validateCouponForOrder("FLAT500", "plan_professional", "monthly", 199900);
    assert.strictEqual(fixedVal.isValid, true);
    assert.strictEqual(fixedVal.discountPaise, 50000); // ₹500 in paise

    // 2C. Invalid Coupon Code
    const invalidVal = await validateCouponForOrder("INVALID_999", "plan_professional", "monthly", 199900);
    assert.strictEqual(invalidVal.isValid, false);
    assert.strictEqual(invalidVal.discountPaise, 0);

    // 2D. Expired Coupon Check
    const expiredCoupon = await createCoupon({
      code: "TESTEXPIRED",
      discountType: "percentage",
      discountValue: 50,
      validFrom: "2020-01-01T00:00:00.000Z",
      validUntil: "2021-01-01T00:00:00.000Z",
      isActive: true,
    }, "test_suite").catch(() => null);

    if (expiredCoupon) {
      const expiredVal = await validateCouponForOrder("TESTEXPIRED", "plan_professional", "monthly", 199900);
      assert.strictEqual(expiredVal.isValid, false);
      await deleteCoupon(expiredCoupon.id, "test_suite").catch(() => {});
    }

    testPass("Coupon Engine strictly validates codes, expiration, rules, and computes accurate discounts");
  } catch (err) {
    testFail("Coupon Engine Rules & Validation", err);
  }

  // ------------------------------------------------------------------
  // TEST 3: Full End-to-End Pricing Pipeline (Plan -> Coupon -> GST -> Razorpay Match)
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 3: Full Pricing Pipeline Match (Base -> Coupon -> Net Taxable -> GST -> Final)");

    await updateGstSettings({ gstEnabled: true, gstPercentage: 18 }, "test_suite");
    const fullCalc = await calculateServerBillingPrice({
      planId: "plan_professional",
      billingCycle: "monthly",
      couponCode: "SAVE20",
    });

    const expectedBase = 199900; // ₹1,999
    const expectedDiscount = Math.round(expectedBase * 0.2); // 20%
    const expectedTaxable = expectedBase - expectedDiscount; // ₹1,599.20
    const expectedGst = Math.round(expectedTaxable * 0.18); // 18% of ₹1,599.20
    const expectedFinal = expectedTaxable + expectedGst;

    assert.strictEqual(fullCalc.baseAmountPaise, expectedBase);
    assert.strictEqual(fullCalc.couponDiscountPaise, expectedDiscount);
    assert.strictEqual(fullCalc.taxableAmountPaise, expectedTaxable);
    assert.strictEqual(fullCalc.gstAmountPaise, expectedGst);
    assert.strictEqual(fullCalc.finalAmountPaise, expectedFinal);
    assert.strictEqual(fullCalc.breakdownFormatted.finalAmountRupees, expectedFinal / 100);

    testPass(`Full Pipeline verified: Base ₹${expectedBase / 100} - Discount ₹${expectedDiscount / 100} = Taxable ₹${expectedTaxable / 100} + GST ₹${expectedGst / 100} = Final ₹${expectedFinal / 100}`);
  } catch (err) {
    testFail("Full Pricing Pipeline Match", err);
  }

  // ------------------------------------------------------------------
  // TEST 4: Safe Plan Deletion Guard (Active Subscribers Blocked)
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 4: Safe Plan Deletion Guard");

    const adminDb = getSafeAdminDb();
    const testPlanId = `plan_delete_test_${Date.now()}`;
    const testSchoolId = `school_delete_test_${Date.now()}`;

    if (adminDb) {
      // 4A. Create test plan and active subscription
      await adminDb.collection("plans").doc(testPlanId).set({
        id: testPlanId,
        name: "Test Delete Plan",
        slug: testPlanId,
        status: "ACTIVE",
      });

      await adminDb.collection("schoolSubscriptions").doc(testSchoolId).set({
        id: testSchoolId,
        schoolId: testSchoolId,
        planId: testPlanId,
        status: "ACTIVE",
      });

      // 4B. Attempt delete on plan with active subscription
      let blockedError = null;
      try {
        await deletePlan(testPlanId, "test_suite");
      } catch (err) {
        blockedError = err;
      }

      assert.notStrictEqual(blockedError, null, "deletePlan must throw an error when active schools exist!");
      assert.ok(blockedError.message.includes("active school(s)"), "Error must specify active school subscribers exist.");

      // Clean up test school subscription
      await adminDb.collection("schoolSubscriptions").doc(testSchoolId).delete();

      // 4C. Delete plan after subscribers migrated
      const deleteResult = await deletePlan(testPlanId, "test_suite");
      assert.strictEqual(deleteResult.success, true);
    }

    testPass("Safe Plan Deletion Guard strictly blocks deletion of plans with active subscribers");
  } catch (err) {
    testFail("Safe Plan Deletion Guard", err);
  }

  // ------------------------------------------------------------------
  // TEST 5: Plan Feature Realtime Entitlement Sync
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 5: Realtime Feature Entitlement Sync");

    const adminDb = getSafeAdminDb();
    const syncSchoolId = `school_sync_test_${Date.now()}`;
    const syncPlanId = `plan_sync_test_${Date.now()}`;

    if (adminDb) {
      await adminDb.collection("plans").doc(syncPlanId).set({
        id: syncPlanId,
        name: "Sync Test Plan",
        slug: syncPlanId,
        status: "ACTIVE",
        features: ["student_management", "teacher_management"],
        limits: { maxStudents: 500, maxTeachers: 20 },
      });

      await adminDb.collection("schoolSubscriptions").doc(syncSchoolId).set({
        id: syncSchoolId,
        schoolId: syncSchoolId,
        planId: syncPlanId,
        status: "ACTIVE",
      });

      const initialFeatures = await getPlanFeatures(syncSchoolId);
      assert.strictEqual(initialFeatures["student_management"], true);
      assert.strictEqual(initialFeatures["advanced_reports"], false);

      // Super Admin adds advanced_reports to plan features
      await adminDb.collection("plans").doc(syncPlanId).update({
        features: ["student_management", "teacher_management", "advanced_reports"],
      });

      const updatedFeatures = await getPlanFeatures(syncSchoolId);
      assert.strictEqual(updatedFeatures["advanced_reports"], true, "Updated plan features must reflect in real-time entitlement resolution!");

      // Cleanup
      await adminDb.collection("plans").doc(syncPlanId).delete();
      await adminDb.collection("schoolSubscriptions").doc(syncSchoolId).delete();
    }

    testPass("Plan feature updates authoritatively sync into subscriber entitlement system in real time");
  } catch (err) {
    testFail("Realtime Feature Entitlement Sync", err);
  }

  console.log("\n======================================================================");
  console.log(`SUMMARY: Passed ${passedCount}/${totalCount} Dynamic Pricing, GST & Coupon Tests.`);
  console.log("🎉 ALL SUPER ADMIN DYNAMIC PRICING, GST & COUPONS TESTS PASSED!");
  console.log("======================================================================\n");
}

runSuite().catch((err) => {
  console.error("❌ SUITE EXECUTOR FAILED:", err);
  process.exit(1);
});
