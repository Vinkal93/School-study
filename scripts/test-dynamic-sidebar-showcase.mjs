/**
 * Phase 2 — Dynamic Sidebar Access & Showcase System Test Suite
 */

const FEATURE_REGISTRY = [
  { key: "school_dashboard", name: "School Admin Dashboard", category: "core" },
  { key: "student_management", name: "Student Management", category: "core" },
  { key: "teacher_management", name: "Teacher Management", category: "core" },
  { key: "class_management", name: "Class and Section Management", category: "academic" },
  { key: "timetable_bells", name: "Timetable and Bell Automation", category: "academic" },
  { key: "basic_attendance", name: "Daily Attendance Marking", category: "academic" },
  { key: "advanced_reports", name: "Advanced Reports and Data Exports", category: "analytics" },
  { key: "notices_announcements", name: "Notices and Broadcast Announcements", category: "academic" },
  { key: "rules_policies", name: "Rules, Policies and Fines/Rewards", category: "security" },
  { key: "fee_management", name: "Fee Collection and Dues Management", category: "financial" },
  { key: "inquiries_portal", name: "Admission and Parent Inquiries 2.0", category: "core" },
];

function getRequiredPlanForFeature(featureKey, plans, currentPlanSlug) {
  const sorted = [...plans].filter(p => p.status === "ACTIVE").sort((a, b) => a.displayOrder - b.displayOrder);
  let currentOrder = -1;
  if (currentPlanSlug) {
    const current = sorted.find(p => p.slug === currentPlanSlug);
    if (current) currentOrder = current.displayOrder;
  }

  const checkPlanGivesFull = (p) => {
    if (p.featureAccess && p.featureAccess[featureKey] === "FULL_ACCESS") return true;
    if (Array.isArray(p.features) && p.features.includes(featureKey)) return true;
    return false;
  };

  if (currentOrder >= 0) {
    for (const p of sorted) {
      if (p.displayOrder > currentOrder && checkPlanGivesFull(p)) {
        return { planName: p.name, planSlug: p.slug, isCustomAccess: false };
      }
    }
  }

  for (const p of sorted) {
    if (checkPlanGivesFull(p)) {
      return { planName: p.name, planSlug: p.slug, isCustomAccess: false };
    }
  }

  return { planName: "Upgrade / Contact Administrator", planSlug: "custom", isCustomAccess: true };
}

function resolveFeatureAccessModes(plan, overrides = [], isSuspended = false, isFullControl = false) {
  const result = {};
  for (const feat of FEATURE_REGISTRY) {
    const permKey = feat.key;
    const isRestricted = overrides.some(o => o.type === "FEATURE_RESTRICT" && (o.featureKey === permKey || o.featureKey === "all"));
    if (isRestricted) { result[permKey] = "HIDDEN"; continue; }
    const isGranted = overrides.some(o => o.type === "FEATURE_GRANT" && (o.featureKey === permKey || o.featureKey === "all"));
    if (isGranted) { result[permKey] = "FULL_ACCESS"; continue; }
    if (isFullControl && !isSuspended) { result[permKey] = "FULL_ACCESS"; continue; }
    if (isSuspended) {
      const explicit = plan.featureAccess?.[permKey];
      result[permKey] = explicit === "HIDDEN" ? "HIDDEN" : "SHOWCASE";
      continue;
    }
    if (plan.featureAccess?.[permKey]) {
      result[permKey] = plan.featureAccess[permKey];
      continue;
    }
    result[permKey] = plan.features?.includes(permKey) ? "FULL_ACCESS" : "HIDDEN";
  }
  return result;
}

function filterSidebarNavItems(navItems, featureAccessModes) {
  return navItems.filter(item => {
    if (!item.featureKey) return true;
    const mode = featureAccessModes[item.featureKey] || "FULL_ACCESS";
    return mode !== "HIDDEN";
  }).map(item => {
    if (!item.featureKey) return { ...item, isShowcase: false };
    const mode = featureAccessModes[item.featureKey] || "FULL_ACCESS";
    return { ...item, isShowcase: mode === "SHOWCASE" };
  });
}

let passed = 0;
let total = 0;
function assert(cond, msg) {
  total++;
  if (cond) { passed++; console.log(`[PASS] ${msg}`); }
  else { console.error(`[FAIL] ${msg}`); }
}

console.log("==================================================================");
console.log("PHASE 2: DYNAMIC SIDEBAR ACCESS + SHOWCASE SYSTEM TEST SUITE");
console.log("==================================================================\n");

const plans = [
  {
    id: "plan_standard",
    name: "Standard Plan",
    slug: "standard",
    status: "ACTIVE",
    displayOrder: 1,
    features: ["student_management", "teacher_management", "class_management"],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "SHOWCASE",
      advanced_reports: "SHOWCASE",
      fee_management: "HIDDEN",
    }
  },
  {
    id: "plan_pro",
    name: "Professional Plan",
    slug: "professional",
    status: "ACTIVE",
    displayOrder: 2,
    features: ["student_management", "teacher_management", "class_management", "basic_attendance", "advanced_reports", "fee_management"],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      advanced_reports: "FULL_ACCESS",
      fee_management: "FULL_ACCESS",
    }
  }
];

// 1. Canonical Registry
assert(FEATURE_REGISTRY.length >= 10, "Canonical feature registry contains 10+ registered modules");

// 2. Standard Plan 3-Way Modes
const standardModes = resolveFeatureAccessModes(plans[0]);
assert(standardModes.teacher_management === "FULL_ACCESS", "Standard Plan resolves Teachers as FULL_ACCESS");
assert(standardModes.basic_attendance === "SHOWCASE", "Standard Plan resolves Attendance as SHOWCASE");
assert(standardModes.advanced_reports === "SHOWCASE", "Standard Plan resolves Reports as SHOWCASE");
assert(standardModes.fee_management === "HIDDEN", "Standard Plan resolves Fee Management as HIDDEN");

// 3. Dynamic Required Plan Resolution (No hardcoded strings)
const feeReq = getRequiredPlanForFeature("fee_management", plans, "standard");
assert(feeReq.planName === "Professional Plan", `Dynamic required plan for fee_management resolved to: ${feeReq.planName}`);

const attendanceReq = getRequiredPlanForFeature("basic_attendance", plans, "standard");
assert(attendanceReq.planName === "Professional Plan", `Dynamic required plan for basic_attendance resolved to: ${attendanceReq.planName}`);

// 4. Sidebar Navigation Dynamic Filtering
const mockNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Teachers", href: "/admin/teachers", featureKey: "teacher_management" },
  { label: "Attendance", href: "/admin/attendance", featureKey: "basic_attendance" },
  { label: "Reports", href: "/admin/reports", featureKey: "advanced_reports" },
  { label: "Fees", href: "/admin/fees", featureKey: "fee_management" },
];

const standardNav = filterSidebarNavItems(mockNavItems, standardModes);
assert(!standardNav.some(n => n.featureKey === "fee_management"), "Standard sidebar strictly hides HIDDEN modules (Fees omitted)");
assert(standardNav.find(n => n.featureKey === "basic_attendance")?.isShowcase === true, "Standard sidebar badges SHOWCASE modules with Lock (Attendance)");
assert(standardNav.find(n => n.featureKey === "teacher_management")?.isShowcase === false, "Standard sidebar shows FULL_ACCESS modules as unlocked (Teachers)");

// 5. Pro Plan Sidebar
const proModes = resolveFeatureAccessModes(plans[1]);
const proNav = filterSidebarNavItems(mockNavItems, proModes);
assert(proNav.some(n => n.featureKey === "fee_management"), "Pro sidebar displays fee_management");
assert(proNav.find(n => n.featureKey === "fee_management")?.isShowcase === false, "Pro sidebar displays fee_management as unlocked FULL_ACCESS");

// 6. School Overrides
const restrictedModes = resolveFeatureAccessModes(plans[1], [{ type: "FEATURE_RESTRICT", featureKey: "fee_management" }]);
assert(restrictedModes.fee_management === "HIDDEN", "FEATURE_RESTRICT override forces module to HIDDEN");

const grantedModes = resolveFeatureAccessModes(plans[0], [{ type: "FEATURE_GRANT", featureKey: "fee_management" }]);
assert(grantedModes.fee_management === "FULL_ACCESS", "FEATURE_GRANT override upgrades HIDDEN module to FULL_ACCESS");

// 7. Super Admin FULL_CONTROL Mode
const fullControlModes = resolveFeatureAccessModes(plans[0], [], false, true);
assert(fullControlModes.fee_management === "FULL_ACCESS" && fullControlModes.basic_attendance === "FULL_ACCESS", "FULL_CONTROL mode gives FULL_ACCESS to all modules");

// 8. Suspended State
const suspendedModes = resolveFeatureAccessModes(plans[1], [], true, false);
assert(suspendedModes.student_management === "SHOWCASE", "Suspended school locks active modules into SHOWCASE");

console.log(`\n==================================================================`);
console.log(`[RESULTS] ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log(`==================================================================\n`);

if (passed === total) process.exit(0); else process.exit(1);
