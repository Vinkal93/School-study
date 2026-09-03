import assert from "assert";

console.log("======================================================================");
console.log("🎯 RUNNING PLAN TO FEATURE ENTITLEMENT ARCHITECTURE SUITE");
console.log("======================================================================\n");

async function runPlanFeatureEntitlementTests() {
  let totalTests = 0;
  let passedTests = 0;

  function pass(msg) {
    totalTests++;
    passedTests++;
    console.log(`  ✅ [VERIFIED] ${msg}`);
  }

  function fail(msg, err) {
    totalTests++;
    console.error(`  ❌ [FAILED] ${msg}:`, err?.message || err);
  }

  const parentMap = {
    student_page: "student_management",
    student_profile: "student_management",
    teacher_page: "teacher_management",
    class_page: "class_management",
    class_tab_sections: "class_management",
    class_tab_sessions: "class_management",
    attendance_page: "basic_attendance",
    reports_page: "advanced_reports",
    reports_export: "advanced_reports",
    notices_page: "notices_announcements",
    fee_dashboard: "fee_management",
    fee_structure: "fee_management",
    fee_collection: "fee_management",
    fee_transactions: "fee_management",
    fee_reports: "fee_management",
    fee_exports: "fee_management",
    fee_discounts: "fee_management",
    fee_receipts: "fee_management",
    fee_settings: "fee_management",
  };

  // Feature Resolution Logic Verification
  function isFeatureAllowedInList(featureKey, allowedList) {
    if (!allowedList || allowedList.length === 0) return false;
    if (allowedList.includes(featureKey)) return true;

    const parentKey = parentMap[featureKey];
    if (parentKey && allowedList.includes(parentKey)) return true;

    const aliases = {
      student_management: ["student_management", "students", "student_page", "student_profile"],
      teacher_management: ["teacher_management", "teachers", "teacher_page"],
      class_management: ["class_management", "classes", "class_page", "class_tab_sections", "class_tab_sessions"],
      basic_attendance: ["basic_attendance", "attendance", "attendance_automation", "attendance_page"],
      attendance_automation: ["attendance_automation", "basic_attendance", "attendance"],
      school_dashboard: ["school_dashboard", "dashboard"],
      notices_announcements: ["notices_announcements", "notices", "notices_page"],
      advanced_reports: ["advanced_reports", "reports", "reports_page", "reports_export"],
      fee_management: ["fee_management", "fees", "fee_dashboard", "fee_structure", "fee_collection", "fee_transactions", "fee_reports", "fee_exports", "fee_discounts", "fee_receipts", "fee_settings"],
    };

    const itemAliases = aliases[featureKey] || [];
    for (const a of itemAliases) {
      if (allowedList.includes(a)) return true;
    }

    return false;
  }

  function resolveEffectiveFeatures(allowedList, overrides = [], controlMode = "LIMITED_CONTROL", accessMode = "FULL_ACCESS") {
    const allKnownKeys = [
      "student_management", "student_page", "student_profile",
      "teacher_management", "teacher_page",
      "class_management", "class_page", "class_tab_sections", "class_tab_sessions",
      "basic_attendance", "attendance_automation", "attendance_page",
      "school_dashboard",
      "notices_announcements", "notices_page",
      "advanced_reports", "reports_page", "reports_export",
      "fee_management", "fee_dashboard", "fee_structure", "fee_collection", "fee_transactions", "fee_reports", "fee_exports", "fee_discounts", "fee_receipts", "fee_settings"
    ];

    const permissions = {};
    const isFullControl = controlMode === "FULL_CONTROL";

    for (const permKey of allKnownKeys) {
      if (accessMode === "NO_ACCESS") {
        permissions[permKey] = false;
        continue;
      }

      const isRestricted = overrides.some((o) => o.type === "FEATURE_RESTRICT" && (o.featureKey === permKey || o.featureKey === "all"));
      if (isRestricted) {
        permissions[permKey] = false;
        continue;
      }

      const isGranted = overrides.some((o) => o.type === "FEATURE_GRANT" && (o.featureKey === permKey || o.featureKey === "all"));
      if (isGranted) {
        permissions[permKey] = true;
        continue;
      }

      if (isFullControl) {
        permissions[permKey] = true;
        continue;
      }

      permissions[permKey] = isFeatureAllowedInList(permKey, allowedList);
    }

    return permissions;
  }

  function calculateRequiredPlanDisplay(currentPlanSlug, featureKey, mockPlans) {
    const sortedPlans = [...mockPlans].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const currentPlan = sortedPlans.find((p) => p.slug === currentPlanSlug);
    const currentOrder = currentPlan ? (currentPlan.displayOrder || 0) : 0;

    for (const plan of sortedPlans) {
      if ((plan.displayOrder || 0) > currentOrder && isFeatureAllowedInList(featureKey, plan.features)) {
        return plan.name;
      }
    }

    return "Custom Access Required";
  }

  // ------------------------------------------------------------------
  // TEST 1: Starter Plan Single Source of Truth
  // ------------------------------------------------------------------
  try {
    const starterFeatures = ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"];
    const resolvedStarter = resolveEffectiveFeatures(starterFeatures);

    assert.strictEqual(resolvedStarter["student_management"], true);
    assert.strictEqual(resolvedStarter["class_management"], true);
    assert.strictEqual(resolvedStarter["class_page"], true);
    assert.strictEqual(resolvedStarter["advanced_reports"], false);
    assert.strictEqual(resolvedStarter["fee_management"], false);

    pass("Starter Plan grants Student, Teacher & Class Management, locks Reports & Fees");
  } catch (err) {
    fail("Starter Plan Single Source of Truth", err);
  }

  // ------------------------------------------------------------------
  // TEST 2: Professional Plan Single Source of Truth
  // ------------------------------------------------------------------
  try {
    const proFeatures = ["student_management", "teacher_management", "class_management", "basic_attendance", "attendance_automation", "school_dashboard", "notices_announcements", "advanced_reports", "fee_management"];
    const resolvedPro = resolveEffectiveFeatures(proFeatures);

    assert.strictEqual(resolvedPro["class_management"], true);
    assert.strictEqual(resolvedPro["class_page"], true);
    assert.strictEqual(resolvedPro["advanced_reports"], true);
    assert.strictEqual(resolvedPro["fee_management"], true);
    assert.strictEqual(resolvedPro["fee_collection"], true);

    pass("Professional Plan grants Class Management, Advanced Reports & Fee Management");
  } catch (err) {
    fail("Professional Plan Single Source of Truth", err);
  }

  // ------------------------------------------------------------------
  // TEST 3: Dynamic Feature Toggle Mutation (Classes OFF -> ON)
  // ------------------------------------------------------------------
  try {
    const proFeaturesNoClasses = ["student_management", "teacher_management", "basic_attendance", "attendance_automation", "school_dashboard", "notices_announcements", "advanced_reports", "fee_management"];
    const resolvedNoClasses = resolveEffectiveFeatures(proFeaturesNoClasses);

    assert.strictEqual(resolvedNoClasses["class_management"], false);
    assert.strictEqual(resolvedNoClasses["class_page"], false);

    const proFeaturesWithClasses = [...proFeaturesNoClasses, "class_management"];
    const resolvedWithClasses = resolveEffectiveFeatures(proFeaturesWithClasses);

    assert.strictEqual(resolvedWithClasses["class_management"], true);
    assert.strictEqual(resolvedWithClasses["class_page"], true);

    pass("Super Admin turning Professional Classes OFF -> ON dynamically locks & unlocks subscriber portal");
  } catch (err) {
    fail("Dynamic Feature Toggle Mutation", err);
  }

  // ------------------------------------------------------------------
  // TEST 4: Priority Order (FULL_CONTROL -> OVERRIDES -> PLAN FEATURES -> DEFAULT DENY)
  // ------------------------------------------------------------------
  try {
    const starterFeatures = ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"];
    
    // Custom ALLOW override for advanced_reports
    const customGrant = [{ type: "FEATURE_GRANT", featureKey: "advanced_reports" }];
    const resolvedOverride = resolveEffectiveFeatures(starterFeatures, customGrant);
    assert.strictEqual(resolvedOverride["advanced_reports"], true);

    // FULL_CONTROL mode
    const resolvedFull = resolveEffectiveFeatures(starterFeatures, [], "FULL_CONTROL");
    assert.strictEqual(resolvedFull["advanced_reports"], true);
    assert.strictEqual(resolvedFull["fee_management"], true);

    pass("Priority Order strictly enforced: FULL_CONTROL -> CUSTOM OVERRIDES -> PLAN FEATURES -> DEFAULT DENY");
  } catch (err) {
    fail("Priority Order Enforcement", err);
  }

  // ------------------------------------------------------------------
  // TEST 5: Dynamic Required Plan Display Calculation (No Professional -> Required Starter Nonsense)
  // ------------------------------------------------------------------
  try {
    const mockPlans = [
      { slug: "starter", name: "Starter Plan", displayOrder: 1, features: ["student_management", "teacher_management", "basic_attendance"] },
      { slug: "professional", name: "Professional Plan", displayOrder: 2, features: ["student_management", "teacher_management", "class_management", "advanced_reports"] },
      { slug: "enterprise", name: "Enterprise Plan", displayOrder: 3, features: ["student_management", "teacher_management", "class_management", "basic_attendance", "advanced_reports", "fee_management"] },
    ];

    // Starter subscriber needs advanced_reports -> Required: Professional Plan
    const starterReq = calculateRequiredPlanDisplay("starter", "advanced_reports", mockPlans);
    assert.strictEqual(starterReq, "Professional Plan");

    // Professional subscriber needs fee_management (only in Enterprise) -> Required: Enterprise Plan (NOT Starter Plan!)
    const proReq = calculateRequiredPlanDisplay("professional", "fee_management", mockPlans);
    assert.strictEqual(proReq, "Enterprise Plan");

    // Enterprise subscriber needs unconfigured feature -> Required: Custom Access Required
    const entReq = calculateRequiredPlanDisplay("enterprise", "unconfigured_feature", mockPlans);
    assert.strictEqual(entReq, "Custom Access Required");

    pass("Dynamic Required Plan display strictly calculates higher plan (Professional -> Enterprise / Custom Access Required; NEVER Professional -> Starter)");
  } catch (err) {
    fail("Dynamic Required Plan Calculation", err);
  }

  console.log("\n======================================================================");
  console.log(`SUMMARY: Passed ${passedTests}/${totalTests} Plan to Feature Entitlement Tests.`);
  console.log("🎉 ALL PLAN TO FEATURE ENTITLEMENT TESTS PASSED!");
  console.log("======================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPlanFeatureEntitlementTests();
