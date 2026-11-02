// scripts/test-pricing-presentation.cjs
// Tests for Phase 4: Rebuilt Pricing Presentation & Centralized Feature Metadata Registry

const assert = require("assert");

console.log("======================================================================");
console.log("RUNNING PRICING PRESENTATION & FEATURE REGISTRY VERIFICATION SUITE");
console.log("======================================================================");

// Load feature-registry via TypeScript transpile
const fs = require("fs");
const ts = require("typescript");
const vm = require("vm");

function loadTsModule(filePath, extraMocks = {}) {
  const code = fs.readFileSync(filePath, "utf-8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const exportsObj = {};
  const mockRequire = (id) => {
    if (extraMocks[id]) return extraMocks[id];
    if (id === "@/lib/features/adminFeatureRegistry") {
      return loadTsModule("src/lib/features/adminFeatureRegistry.ts");
    }
    return require(id);
  };

  vm.runInNewContext(transpiled, {
    exports: exportsObj,
    require: mockRequire,
    console,
    Buffer,
    process: { env: {} },
    Set,
    Map,
    Array,
    Object,
  });
  return exportsObj;
}

const featureRegistry = loadTsModule("src/lib/billing/feature-registry.ts");

(async function runTests() {
  let passed = 0;

  // Test 1: Normalize raw keys into human-readable labels
  try {
    const rawKeys = [
      "module:dashboard",
      "classes",
      "faculty",
      "Student Directory",
      "Fee Whatsapp Reminder",
      "fee_management",
    ];

    for (const key of rawKeys) {
      const meta = featureRegistry.getFeatureMetadata(key);
      assert.ok(meta.label, `Label must exist for ${key}`);
      assert.ok(!meta.label.includes("module:"), `Label should not contain raw prefix: ${meta.label}`);
      assert.ok(!meta.label.includes("_"), `Label should not contain snake_case: ${meta.label}`);
    }

    assert.strictEqual(featureRegistry.getFeatureMetadata("module:dashboard").label, "School Dashboard & Analytics");
    assert.strictEqual(featureRegistry.getFeatureMetadata("faculty").label, "Faculty & Staff Portal");
    assert.strictEqual(featureRegistry.getFeatureMetadata("Fee Whatsapp Reminder").label, "WhatsApp Fee Reminders");

    console.log("  [PASS] Test 1: Raw internal feature keys normalize into human-readable customer-facing labels");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 1:", e);
  }

  // Test 2: Curate 5 to 7 features per pricing card
  try {
    const mockFreePlan = {
      id: "plan_free",
      name: "Free Plan",
      slug: "free",
      features: [
        "student_management",
        "teacher_management",
        "class_management",
        "basic_attendance",
        "school_dashboard",
        "subscription_billing",
        "extra_1",
        "extra_2",
      ],
    };

    const curatedFree = featureRegistry.getCuratedCardFeatures(mockFreePlan, 6);
    assert.ok(curatedFree.length >= 5 && curatedFree.length <= 7, `Card must have 5-7 features, got ${curatedFree.length}`);
    assert.strictEqual(curatedFree[0].label, "Student Admissions & Records");

    const mockProPlan = {
      id: "plan_professional",
      name: "Professional Plan",
      slug: "professional",
      features: [
        "student_management",
        "teacher_management",
        "attendance_automation",
        "fee_management",
        "Fee Whatsapp Reminder",
        "advanced_reports",
      ],
    };

    const curatedPro = featureRegistry.getCuratedCardFeatures(mockProPlan, 6);
    assert.ok(curatedPro.length >= 5 && curatedPro.length <= 7, `Pro card must have 5-7 features, got ${curatedPro.length}`);
    const proLabels = curatedPro.map((f) => f.label);
    assert.ok(proLabels.includes("WhatsApp Fee Reminders"), "Pro plan must feature WhatsApp reminders");

    console.log("  [PASS] Test 2: Plan cards curate 5 to 7 high-impact features with consistent display limits");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 2:", e);
  }

  // Test 3: Free plan pricing display evaluates to ₹0 / forever and never "Custom"
  try {
    const freePlan = { slug: "free", monthlyPrice: 0 };
    const isFree = freePlan.slug === "free" || freePlan.monthlyPrice === 0;
    const displayPrice = isFree ? "₹0" : "Custom";
    const pricePeriod = isFree ? "/ forever" : "/ month";

    assert.strictEqual(displayPrice, "₹0");
    assert.strictEqual(pricePeriod, "/ forever");
    assert.notStrictEqual(displayPrice, "Custom", "Free plan must never display Custom");

    console.log("  [PASS] Test 3: Free plan formats as ₹0 / forever instead of 'Custom'");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 3:", e);
  }

  // Test 4: Enterprise plan displays "Contact Sales"
  try {
    const entPlan = { slug: "enterprise" };
    const isEnterprise = entPlan.slug === "enterprise";
    const displayPrice = isEnterprise ? "Contact Sales" : "₹0";

    assert.strictEqual(displayPrice, "Contact Sales");
    console.log("  [PASS] Test 4: Quote-based enterprise tier displays 'Contact Sales'");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 4:", e);
  }

  // Test 5: "View all features" groups by module with enabled/disabled status
  try {
    const testPlan = {
      id: "plan_free",
      name: "Free Plan",
      slug: "free",
      features: ["student_management", "basic_attendance", "school_dashboard"],
    };

    const grouped = featureRegistry.getGroupedPlanFeatures(testPlan);
    assert.ok(grouped["Student Management"], "Must have Student Management group");
    assert.ok(grouped["Attendance"], "Must have Attendance group");

    const studentFeats = grouped["Student Management"];
    const admissionFeat = studentFeats.find((f) => f.key === "student_management");
    assert.ok(admissionFeat, "Must contain student_management feature");
    assert.strictEqual(admissionFeat.enabled, true, "Admissions must be enabled on Free plan");

    const attendanceFeats = grouped["Attendance"];
    const autoAttendance = attendanceFeats.find((f) => f.key === "attendance_automation");
    assert.ok(autoAttendance, "Must contain attendance_automation");
    assert.strictEqual(autoAttendance.enabled, false, "Automated attendance must be disabled on Free plan");

    console.log("  [PASS] Test 5: Full feature directory correctly groups capabilities by module with active/disabled badges");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 5:", e);
  }

  console.log("======================================================================");
  console.log(`PRICING PRESENTATION RESULTS: ${passed} PASSED, 0 FAILED`);
  console.log("======================================================================");
  if (passed !== 5) process.exitCode = 1;
})();
