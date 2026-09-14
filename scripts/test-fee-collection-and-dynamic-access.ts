import { canAccessFeature, getEffectiveFeatureAccessModes } from "../src/lib/billing/featureAccess";
import { DEFAULT_STATIC_PLANS, DEFAULT_STATIC_PLAN_VERSIONS } from "../src/lib/billing/plans";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${name}`);
    failed++;
    throw new Error(name);
  } else {
    console.log(`✓ PASSED: ${name}`);
    passed++;
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("TESTING FEE COLLECTION & DYNAMIC FEATURE ACCESS");
  console.log("==================================================\n");

  // Test 1: Base Plan features in static defaults
  const basePlan = DEFAULT_STATIC_PLANS.find((p) => p.id === "plan_base");
  assert(!!basePlan, "plan_base exists in DEFAULT_STATIC_PLANS");
  assert(Boolean(basePlan && basePlan.features.includes("fee_management")), "plan_base features includes fee_management");
  assert(Boolean(basePlan && basePlan.featureAccess && basePlan.featureAccess["fee_management"] === "FULL_ACCESS"), "plan_base featureAccess fee_management is FULL_ACCESS");

  // Test 2: Base Plan Version features
  const basePlanVersion = DEFAULT_STATIC_PLAN_VERSIONS["plan_base"];
  assert(!!basePlanVersion, "plan_base exists in DEFAULT_STATIC_PLAN_VERSIONS");
  if (basePlanVersion) {
    assert(basePlanVersion.id === "plan_base_v1", "plan_base version id is plan_base_v1");
    assert(basePlanVersion.features.includes("fee_management"), "plan_base version features includes fee_management");
  }

  // Test 3: getEffectiveFeatureAccessModes for system / root
  const systemModes = await getEffectiveFeatureAccessModes("system");
  assert(systemModes["fee_management"] === "FULL_ACCESS", "fee_management is FULL_ACCESS for system");
  assert(systemModes["fee_collection"] === "FULL_ACCESS", "fee_collection is FULL_ACCESS for system");
  assert(systemModes["fees.collect"] === "FULL_ACCESS", "fees.collect is FULL_ACCESS for system");

  // Test 4: canAccessFeature with fee_collection and fees.collect
  const canCollect = await canAccessFeature("system", "fee_collection");
  assert(canCollect.allowed === true, "canAccessFeature for fee_collection is allowed");
  assert(canCollect.code === "ALLOWED", "canAccessFeature code is ALLOWED");

  const canCollectSub = await canAccessFeature("system", "fees.collect");
  assert(canCollectSub.allowed === true, "canAccessFeature for fees.collect is allowed");
  assert(canCollectSub.code === "ALLOWED", "canAccessFeature code is ALLOWED");

  const canFeeMgmt = await canAccessFeature("system", "fee_management");
  assert(canFeeMgmt.allowed === true, "canAccessFeature for fee_management is allowed");
  assert(canFeeMgmt.code === "ALLOWED", "canAccessFeature code is ALLOWED");

  console.log(`\n==================================================`);
  console.log(`ALL TESTS PASSED: ${passed} / ${passed + failed}`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
