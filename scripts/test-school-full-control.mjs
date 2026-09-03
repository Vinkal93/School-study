import assert from "assert";
import { getSchoolAccess } from "../src/lib/billing/accessEngine.ts";
import { getPlanFeatures, canAccessFeature } from "../src/lib/billing/featureAccess.ts";
import { getEffectiveEntitlement } from "../src/lib/billing/entitlement.ts";
import { getSafeAdminDb } from "../src/lib/firebase/admin.ts";

async function runTest() {
  console.log("======================================================================");
  console.log("🎯 DEBUGGING FULL_CONTROL FOR TARGET SCHOOL nNuxKZJOvLi3fzDhAtag");
  console.log("======================================================================\n");

  const schoolId = "nNuxKZJOvLi3fzDhAtag";
  const adminDb = getSafeAdminDb();

  if (adminDb) {
    console.log("1. Writing controlMode = FULL_CONTROL to Firestore...");
    await adminDb.collection("schoolSubscriptions").doc(schoolId).set({
      planId: "plan_starter",
      controlMode: "FULL_CONTROL",
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also add TEMPORARY_ACCESS override doc
    await adminDb.collection("accessOverrides").doc(`ovr_test_full`).set({
      id: `ovr_test_full`,
      schoolId,
      type: "TEMPORARY_ACCESS",
      enabled: true,
      status: "ACTIVE",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
  }

  console.log("2. Testing getSchoolAccess...");
  const summary = await getSchoolAccess(schoolId);
  console.log("Summary:", { planId: summary.planId, status: summary.status, controlMode: summary.controlMode, accessMode: summary.accessMode });

  console.log("\n3. Testing getPlanFeatures...");
  const features = await getPlanFeatures(schoolId);
  console.log("class_management feature:", features["class_management"]);
  console.log("fee_management feature:", features["fee_management"]);

  console.log("\n4. Testing canAccessFeature...");
  const classAccess = await canAccessFeature(schoolId, "class_management");
  console.log("canAccessFeature(class_management):", classAccess);

  console.log("\n5. Testing getEffectiveEntitlement...");
  const entitlement = await getEffectiveEntitlement(schoolId);
  console.log("Entitlement features class_management:", entitlement.features["class_management"]);
  console.log("Entitlement limits classes:", entitlement.limits.classes);

  assert.strictEqual(features["class_management"], true, "class_management must be true under FULL_CONTROL!");
  assert.strictEqual(classAccess.allowed, true, "canAccessFeature(class_management) must be allowed under FULL_CONTROL!");

  console.log("\n✅ ALL FULL_CONTROL DEBUG CHECKS PASSED!");
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
