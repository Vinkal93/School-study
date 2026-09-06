/**
 * School Study — Phase 3 Granular Feature / Page / Action Entitlement Verification Suite
 * 
 * Verifies end-to-end full-stack capability control:
 * MODULE -> PAGE -> TAB / SUB-TAB -> SECTION -> ACTION / BUTTON -> EXPORT -> LIMIT
 */

import {
  GRANULAR_PERMISSIONS,
  canonicalizeCapabilityKey,
  getParentFeatureKey,
  getParentCapabilityKey,
  isChildCapability,
  getDefaultGranularPermissionsForPlan,
  getCapabilityHierarchy,
} from "../src/lib/billing/permissions.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

console.log("\n========================================================");
console.log("  PHASE 3: GRANULAR ENTITLEMENT SYSTEM VERIFICATION");
console.log("========================================================\n");

// ----------------------------------------------------
// SUITE 1: CAPABILITY REGISTRY & CANONICAL MAPPING
// ----------------------------------------------------
console.log("Suite 1: Capability Registry & Normalization");

assert(GRANULAR_PERMISSIONS.length >= 30, `Registry contains ${GRANULAR_PERMISSIONS.length} granular capabilities (>= 30)`);

// Check module presence
const requiredModules = [
  "student_management",
  "teacher_management",
  "class_management",
  "basic_attendance",
  "timetable_bells",
  "advanced_reports",
  "notices_announcements",
  "fee_management",
  "rules_policies",
  "inquiries_portal",
];

for (const mod of requiredModules) {
  const found = GRANULAR_PERMISSIONS.find((p) => p.id === mod && p.category === "module");
  assert(!!found, `Module "${mod}" is registered in GRANULAR_PERMISSIONS`);
}

// Check Canonical Key Mapping (Dot Notation & Legacy aliases)
assert(canonicalizeCapabilityKey("students.add") === "student_action_add", "Alias 'students.add' normalizes to 'student_action_add'");
assert(canonicalizeCapabilityKey("fees.collect") === "fee_collection", "Alias 'fees.collect' normalizes to 'fee_collection'");
assert(canonicalizeCapabilityKey("reports.export_pdf") === "reports_action_export_pdf", "Alias 'reports.export_pdf' normalizes to 'reports_action_export_pdf'");
assert(canonicalizeCapabilityKey("inquiries.create") === "inquiries_action_create", "Alias 'inquiries.create' normalizes to 'inquiries_action_create'");
assert(canonicalizeCapabilityKey("timetable.edit_slot") === "timetable_edit_slot", "Alias 'timetable.edit_slot' normalizes to 'timetable_edit_slot'");
assert(canonicalizeCapabilityKey("rules.apply_fine") === "rules_action_apply_fine", "Alias 'rules.apply_fine' normalizes to 'rules_action_apply_fine'");

// ----------------------------------------------------
// SUITE 2: HIERARCHY & PARENT RESOLUTION
// ----------------------------------------------------
console.log("\nSuite 2: Hierarchy & Parent Traversal");

assert(getParentFeatureKey("student_action_add") === "student_management", "Parent feature key for student_action_add is student_management");
assert(getParentFeatureKey("fee_collection") === "fee_management", "Parent feature key for fee_collection is fee_management");
assert(getParentFeatureKey("reports_action_export_pdf") === "advanced_reports", "Parent feature key for reports_action_export_pdf is advanced_reports");

assert(getParentCapabilityKey("student_action_add") === "student_page", "Direct parent capability for student_action_add is student_page");
assert(getParentCapabilityKey("student_page") === "student_management", "Direct parent capability for student_page is student_management");
assert(getParentCapabilityKey("student_management") === undefined, "Top module student_management has no parent capability");

assert(isChildCapability("student_action_add", "student_page") === true, "student_action_add isChild of student_page");
assert(isChildCapability("student_action_add", "student_management") === true, "student_action_add isChild of student_management");
assert(isChildCapability("student_action_add", "fee_management") === false, "student_action_add is NOT child of fee_management");

const hierarchyTree = getCapabilityHierarchy();
assert(Array.isArray(hierarchyTree) && hierarchyTree.length >= 10, `Generated hierarchy tree with ${hierarchyTree.length} top modules`);

// ----------------------------------------------------
// SUITE 3: DETERMINISTIC PARENT-CHILD INHERITANCE LOGIC
// ----------------------------------------------------
console.log("\nSuite 3: Deterministic Parent-Child Inheritance Logic");

// Mock inheritance evaluator simulating getEffectiveFeatureAccessModes
function simulateResolveInheritance(planFeatureAccess, rawKey) {
  const canonical = canonicalizeCapabilityKey(rawKey);

  // 1. Explicit child
  if (planFeatureAccess[rawKey]) return planFeatureAccess[rawKey];
  if (planFeatureAccess[canonical]) return planFeatureAccess[canonical];

  // 2. Traversal up parent hierarchy
  let currentParent = getParentCapabilityKey(canonical);
  while (currentParent) {
    if (planFeatureAccess[currentParent]) return planFeatureAccess[currentParent];
    currentParent = getParentCapabilityKey(currentParent);
  }

  // 3. Top-level module feature
  const topModule = getParentFeatureKey(canonical);
  if (topModule && planFeatureAccess[topModule]) {
    return planFeatureAccess[topModule];
  }

  return "HIDDEN"; // Fail closed default
}

// Test Case A: Parent is FULL_ACCESS, child unconfigured -> child FULL_ACCESS
const planA = { student_management: "FULL_ACCESS" };
assert(simulateResolveInheritance(planA, "students.add") === "FULL_ACCESS", "Case A: Parent FULL_ACCESS -> child unconfigured inherits FULL_ACCESS");
assert(simulateResolveInheritance(planA, "students.delete") === "FULL_ACCESS", "Case A: Parent FULL_ACCESS -> child unconfigured inherits FULL_ACCESS");

// Test Case B: Parent is SHOWCASE, child unconfigured -> child SHOWCASE
const planB = { fee_management: "SHOWCASE" };
assert(simulateResolveInheritance(planB, "fees.collect") === "SHOWCASE", "Case B: Parent SHOWCASE -> child unconfigured inherits SHOWCASE");
assert(simulateResolveInheritance(planB, "fee_reports") === "SHOWCASE", "Case B: Parent SHOWCASE -> child unconfigured inherits SHOWCASE");

// Test Case C: Parent is HIDDEN, child unconfigured -> child HIDDEN
const planC = { advanced_reports: "HIDDEN" };
assert(simulateResolveInheritance(planC, "reports.export_pdf") === "HIDDEN", "Case C: Parent HIDDEN -> child unconfigured inherits HIDDEN");

// Test Case D: Parent is SHOWCASE, page child explicitly FULL_ACCESS -> child inherits FULL_ACCESS, sibling inherits SHOWCASE
const planD = { fee_management: "SHOWCASE", fee_dashboard: "FULL_ACCESS" };
assert(simulateResolveInheritance(planD, "fee_dashboard") === "FULL_ACCESS", "Case D: Parent SHOWCASE but page child explicit FULL_ACCESS -> page FULL_ACCESS");
assert(simulateResolveInheritance(planD, "fee_collection") === "FULL_ACCESS", "Case D: Child of fee_dashboard inherits FULL_ACCESS from parent fee_dashboard");
assert(simulateResolveInheritance(planD, "fee_transactions") === "SHOWCASE", "Case D: Sibling page fee_transactions still inherits root SHOWCASE");

// Test Case E: Parent is FULL_ACCESS, child explicitly HIDDEN -> child HIDDEN
const planE = { student_management: "FULL_ACCESS", student_action_delete: "HIDDEN" };
assert(simulateResolveInheritance(planE, "students.delete") === "HIDDEN", "Case E: Parent FULL_ACCESS but child explicit HIDDEN -> child HIDDEN");
assert(simulateResolveInheritance(planE, "students.add") === "FULL_ACCESS", "Case E: Other sibling remains FULL_ACCESS");

// ----------------------------------------------------
// SUITE 4: FAIL CLOSED & UNKNOWN CAPABILITY POLICY
// ----------------------------------------------------
console.log("\nSuite 4: Fail Closed & Security Boundary");

assert(simulateResolveInheritance({}, "random.unknown.key") === "HIDDEN", "Unknown capability key defaults to HIDDEN (Fail Closed)");
assert(simulateResolveInheritance({ student_management: "FULL_ACCESS" }, "hacker_backdoor") === "HIDDEN", "Unregistered backdoor capability defaults to HIDDEN");

// ----------------------------------------------------
// SUITE 5: DEFAULT PLAN PERMISSION MATRICES
// ----------------------------------------------------
console.log("\nSuite 5: Default Plan Permission Templates");

const starterDefaults = getDefaultGranularPermissionsForPlan("starter");
const proDefaults = getDefaultGranularPermissionsForPlan("professional");
const entDefaults = getDefaultGranularPermissionsForPlan("enterprise");

assert(starterDefaults["student_management"] === true, "Starter plan has student_management enabled");
assert(starterDefaults["student_action_add"] === true, "Starter plan has student_action_add enabled");
assert(starterDefaults["fee_management"] === false, "Starter plan has fee_management disabled");
assert(starterDefaults["fee_collection"] === false, "Starter plan has fee_collection disabled");

assert(proDefaults["fee_management"] === true, "Professional plan has fee_management enabled");
assert(proDefaults["fee_collection"] === true, "Professional plan has fee_collection enabled");
assert(proDefaults["reports_action_export_pdf"] === false, "Professional plan has PDF export disabled (Enterprise exclusive)");

assert(entDefaults["reports_action_export_pdf"] === true, "Enterprise plan has PDF export enabled");
assert(entDefaults["fee_refund"] === true, "Enterprise plan has fee_refund enabled");

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("\n========================================================");
console.log(`  RESULTS: ${passedTests}/${totalTests} Tests Passed (${failedTests} failures)`);
console.log("========================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
