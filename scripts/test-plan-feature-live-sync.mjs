import assert from "assert";

console.log("======================================================================");
console.log("🎯 RUNNING PLAN FEATURE LIVE SYNCHRONIZATION TEST SUITE");
console.log("======================================================================\n");

async function runLiveSyncTests() {
  let passed = 0;
  let total = 0;

  function verify(condition, desc) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  // Mock Database & Cache Store
  const planDatabase = new Map();
  const planVersions = new Map();
  const schoolSubscriptions = new Map();

  // 1. Setup Starter Plan v1
  const starterPlanV1 = {
    id: "plan_starter",
    slug: "starter",
    name: "Starter Plan",
    version: 1,
    status: "ACTIVE",
    isArchived: false,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      fee_management: "HIDDEN",
      inquiries_portal: "HIDDEN",
      advanced_reports: "SHOWCASE",
    },
    limits: {
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
    },
  };

  planDatabase.set("plan_starter", { ...starterPlanV1 });
  planVersions.set("plan_starter_v1", {
    id: "plan_starter_v1",
    planId: "plan_starter",
    version: 1,
    features: [...starterPlanV1.features],
    featureAccess: { ...starterPlanV1.featureAccess },
    limits: { ...starterPlanV1.limits },
    status: "ACTIVE",
  });

  // School enrolled with frozen planVersionId: "plan_starter_v1"
  schoolSubscriptions.set("sch_delhi_001", {
    id: "sch_delhi_001",
    schoolId: "sch_delhi_001",
    planId: "plan_starter",
    planVersionId: "plan_starter_v1", // Historical version
    status: "ACTIVE",
  });

  // Emulate new getSchoolAccess logic (authoritative live plan document priority)
  async function simulateGetSchoolAccess(schoolId) {
    const sub = schoolSubscriptions.get(schoolId);
    let allowedFeatures = ["school_dashboard"];
    let planLimits = { maxStudents: 100, maxTeachers: 10, maxClasses: 5, maxStaffAccounts: 1 };

    // 1. Authoritative Primary: Load active live plan document
    const activePlan = planDatabase.get(sub.planId);
    if (activePlan) {
      if (Array.isArray(activePlan.features)) {
        allowedFeatures = [...activePlan.features];
      }
      if (activePlan.limits) {
        planLimits = { ...activePlan.limits };
      }
    } else if (sub.planVersionId && planVersions.has(sub.planVersionId)) {
      // 2. Fallback to version doc only if main plan doc missing
      const ver = planVersions.get(sub.planVersionId);
      if (Array.isArray(ver.features)) allowedFeatures = [...ver.features];
      if (ver.limits) planLimits = { ...ver.limits };
    }

    return {
      schoolId,
      planId: sub.planId,
      planVersionId: sub.planVersionId,
      status: sub.status,
      accessMode: "FULL_ACCESS",
      allowedFeatures,
      limits: planLimits,
    };
  }

  // Emulate getEffectiveFeatureAccessModes
  async function simulateGetFeatureAccessModes(schoolId) {
    const summary = await simulateGetSchoolAccess(schoolId);
    const plan = planDatabase.get(summary.planId);
    const featureAccess = plan?.featureAccess || {};
    const featuresList = plan?.features || summary.allowedFeatures || [];

    const modes = {};
    const allKeys = [
      "school_dashboard",
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "fee_management",
      "inquiries_portal",
      "advanced_reports",
      "timetable_bells",
    ];

    for (const key of allKeys) {
      if (featureAccess[key]) {
        modes[key] = featureAccess[key];
      } else if (featuresList.includes(key)) {
        modes[key] = "FULL_ACCESS";
      } else {
        modes[key] = "HIDDEN";
      }
    }

    return { summary, modes };
  }

  // -------------------------------------------------------------
  // Test 1: Initial State for School on Starter Plan
  // -------------------------------------------------------------
  console.log("🔹 Test 1: Initial School Entitlements on Starter Plan");
  const init = await simulateGetFeatureAccessModes("sch_delhi_001");
  verify(init.modes.student_management === "FULL_ACCESS", "student_management is FULL_ACCESS");
  verify(init.modes.fee_management === "HIDDEN", "fee_management is initially HIDDEN");
  verify(init.modes.advanced_reports === "SHOWCASE", "advanced_reports is SHOWCASE");
  verify(init.modes.inquiries_portal === "HIDDEN", "inquiries_portal is initially HIDDEN");

  // -------------------------------------------------------------
  // Test 2: Super Admin adds fee_management to FULL_ACCESS & inquiries_portal to FULL_ACCESS
  // -------------------------------------------------------------
  console.log("\n🔹 Test 2: Super Admin adds fee_management & inquiries_portal to FULL_ACCESS");
  const updatedPlan = {
    ...starterPlanV1,
    version: 2,
    features: [
      ...starterPlanV1.features,
      "fee_management",
      "inquiries_portal",
    ],
    featureAccess: {
      ...starterPlanV1.featureAccess,
      fee_management: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
    },
  };
  // Save updated plan to database (new version created, but school's sub still has planVersionId: 'plan_starter_v1')
  planDatabase.set("plan_starter", updatedPlan);
  planVersions.set("plan_starter_v2", { ...updatedPlan, id: "plan_starter_v2" });

  const afterAdd = await simulateGetFeatureAccessModes("sch_delhi_001");
  verify(
    afterAdd.modes.fee_management === "FULL_ACCESS",
    "fee_management dynamically updated to FULL_ACCESS for school (even though school was enrolled on v1)"
  );
  verify(
    afterAdd.modes.inquiries_portal === "FULL_ACCESS",
    "inquiries_portal dynamically updated to FULL_ACCESS for school"
  );
  verify(
    afterAdd.summary.allowedFeatures.includes("fee_management"),
    "summary.allowedFeatures contains fee_management"
  );
  verify(
    afterAdd.summary.allowedFeatures.includes("inquiries_portal"),
    "summary.allowedFeatures contains inquiries_portal"
  );

  // -------------------------------------------------------------
  // Test 3: Super Admin removes teacher_management (sets to HIDDEN)
  // -------------------------------------------------------------
  console.log("\n🔹 Test 3: Super Admin removes teacher_management from plan");
  const planV3 = {
    ...updatedPlan,
    version: 3,
    features: updatedPlan.features.filter((f) => f !== "teacher_management"),
    featureAccess: {
      ...updatedPlan.featureAccess,
      teacher_management: "HIDDEN",
    },
  };
  planDatabase.set("plan_starter", planV3);

  const afterRemove = await simulateGetFeatureAccessModes("sch_delhi_001");
  verify(
    afterRemove.modes.teacher_management === "HIDDEN",
    "teacher_management dynamically updated to HIDDEN for school"
  );
  verify(
    !afterRemove.summary.allowedFeatures.includes("teacher_management"),
    "teacher_management removed from summary.allowedFeatures"
  );

  // -------------------------------------------------------------
  // Test 4: Super Admin changes advanced_reports from SHOWCASE to FULL_ACCESS
  // -------------------------------------------------------------
  console.log("\n🔹 Test 4: Super Admin changes advanced_reports from SHOWCASE to FULL_ACCESS");
  const planV4 = {
    ...planV3,
    version: 4,
    features: [...planV3.features, "advanced_reports"],
    featureAccess: {
      ...planV3.featureAccess,
      advanced_reports: "FULL_ACCESS",
    },
  };
  planDatabase.set("plan_starter", planV4);

  const afterShowcaseToFull = await simulateGetFeatureAccessModes("sch_delhi_001");
  verify(
    afterShowcaseToFull.modes.advanced_reports === "FULL_ACCESS",
    "advanced_reports dynamically transitioned from SHOWCASE to FULL_ACCESS"
  );

  // -------------------------------------------------------------
  // Test 5: Super Admin changes basic_attendance to SHOWCASE
  // -------------------------------------------------------------
  console.log("\n🔹 Test 5: Super Admin changes basic_attendance to SHOWCASE (Lock in sidebar)");
  const planV5 = {
    ...planV4,
    version: 5,
    features: planV4.features.filter((f) => f !== "basic_attendance"),
    featureAccess: {
      ...planV4.featureAccess,
      basic_attendance: "SHOWCASE",
    },
  };
  planDatabase.set("plan_starter", planV5);

  const afterToLock = await simulateGetFeatureAccessModes("sch_delhi_001");
  verify(
    afterToLock.modes.basic_attendance === "SHOWCASE",
    "basic_attendance dynamically resolved to SHOWCASE (shows with lock badge in sidebar)"
  );

  console.log("\n======================================================================");
  console.log(`SUMMARY: Passed ${passed}/${total} Live Sync Verification Tests.`);
  console.log("🎉 ALL PLAN FEATURE LIVE SYNCHRONIZATION TESTS PASSED!");
  console.log("======================================================================\n");
}

runLiveSyncTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
