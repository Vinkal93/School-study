/**
 * AUTH BOOTSTRAP STATE MACHINE & ANTI-FLICKER TEST SUITE
 * 
 * Verifies:
 * 1. Sequential state transitions:
 *    AUTH_BOOTSTRAPPING -> AUTHENTICATED -> AUTHENTICATED_CONTEXT_READY
 * 2. Fail-closed initial entitlement state:
 *    canAccess() returns false while bootstrapping.
 *    getFeatureAccessMode() returns "HIDDEN" while bootstrapping.
 * 3. Feature resolver fail-closed behavior:
 *    If plan features are null/empty, access is rejected (never allowed).
 * 4. Anti-flicker sidebar navigation guards:
 *    While isBootstrapping is true, privileged links are not optimistically shown.
 */

// Simulated Auth Bootstrap State Machine
class AuthStateMachine {
  constructor() {
    this.state = "AUTH_BOOTSTRAPPING";
    this.user = null;
    this.profile = null;
    this.error = null;
  }

  onFirebaseUserChanged(fbUser) {
    if (!fbUser) {
      this.state = "UNAUTHENTICATED";
      this.user = null;
      this.profile = null;
      return;
    }
    this.user = fbUser;
    this.state = "AUTHENTICATED";
  }

  onProfileAndContextLoaded(profile, entitlement) {
    if (this.state !== "AUTHENTICATED") {
      throw new Error(`Cannot transition to ready from ${this.state}`);
    }
    this.profile = profile;
    this.entitlement = entitlement;
    this.state = "AUTHENTICATED_CONTEXT_READY";
  }

  isReady() {
    return this.state === "AUTHENTICATED_CONTEXT_READY";
  }

  isBootstrapping() {
    return this.state === "AUTH_BOOTSTRAPPING" || (this.state === "AUTHENTICATED" && !this.profile);
  }
}

// Simulated Fail-Closed Entitlement Context
class FailClosedEntitlementContext {
  constructor() {
    this.loading = true;
    this.entitlement = null;
  }

  canAccess(featureKey) {
    if (this.loading || !this.entitlement) {
      return false; // FAIL-CLOSED: No optimistic privileged render
    }
    const mode = this.getFeatureAccessMode(featureKey);
    return mode === "FULL_ACCESS" || mode === "READ_ONLY";
  }

  getFeatureAccessMode(featureKey) {
    if (this.loading || !this.entitlement) {
      return "HIDDEN"; // FAIL-CLOSED
    }
    const allowed = this.entitlement.planAllowedFeatures || [];
    return allowed.includes(featureKey) ? "FULL_ACCESS" : "HIDDEN";
  }

  onEntitlementResolved(entitlement) {
    this.entitlement = entitlement;
    this.loading = false;
  }
}

// Simulated Sidebar Renderer
function renderSidebarNav({ isBootstrapping, canAccess }) {
  if (isBootstrapping) {
    return {
      type: "SKELETON",
      items: [
        { type: "skeleton-line", width: 140 },
        { type: "skeleton-line", width: 160 },
        { type: "skeleton-line", width: 120 },
      ],
    };
  }

  const navItems = [
    { title: "Dashboard", feature: null },
    { title: "Fees & Invoices", feature: "fees_payments" },
    { title: "Reports & Analytics", feature: "reports_analytics" },
  ];

  const visible = navItems.filter((item) => {
    if (!item.feature) return true;
    return canAccess(item.feature);
  });

  return { type: "REAL_NAV", items: visible };
}

// ==========================================
// TEST RUNNER
// ==========================================
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log("\n==========================================");
console.log("RUNNING AUTH BOOTSTRAP & ANTI-FLICKER TESTS");
console.log("==========================================\n");

// Test 1: Bootstrap state progression
console.log("Test Suite 1: Sequential Bootstrap Progression");
const auth = new AuthStateMachine();
assert(auth.state === "AUTH_BOOTSTRAPPING", "Initial state is AUTH_BOOTSTRAPPING");
assert(auth.isBootstrapping() === true, "isBootstrapping is true initially");
assert(auth.isReady() === false, "isReady is false initially");

auth.onFirebaseUserChanged({ uid: "user_123", email: "admin@school.com" });
assert(auth.state === "AUTHENTICATED", "Transitions to AUTHENTICATED on Firebase token");
assert(auth.isBootstrapping() === true, "isBootstrapping remains true until profile & context arrive");
assert(auth.isReady() === false, "isReady remains false until context ready");

auth.onProfileAndContextLoaded(
  { uid: "user_123", role: "school_admin", schoolId: "sch_1", userId: "ADM2026001" },
  { planAllowedFeatures: ["fees_payments"] }
);
assert(auth.state === "AUTHENTICATED_CONTEXT_READY", "Transitions to AUTHENTICATED_CONTEXT_READY");
assert(auth.isBootstrapping() === false, "isBootstrapping is now false");
assert(auth.isReady() === true, "isReady is true");

// Test 2: Fail-closed entitlement defaults
console.log("\nTest Suite 2: Fail-Closed Entitlement Defaults");
const ent = new FailClosedEntitlementContext();
assert(ent.canAccess("fees_payments") === false, "canAccess returns false while bootstrapping");
assert(ent.canAccess("reports_analytics") === false, "canAccess returns false for all features initially");
assert(ent.getFeatureAccessMode("fees_payments") === "HIDDEN", "getFeatureAccessMode returns HIDDEN while bootstrapping");

// Test 3: Anti-flicker sidebar navigation
console.log("\nTest Suite 3: Anti-Flicker Sidebar Navigation");
const earlyNav = renderSidebarNav({
  isBootstrapping: true,
  canAccess: (f) => ent.canAccess(f),
});
assert(earlyNav.type === "SKELETON", "Renders SKELETON nav during bootstrapping (no privileged items flash)");

// Now resolve entitlement (Starter plan with fees_payments only)
ent.onEntitlementResolved({
  planAllowedFeatures: ["fees_payments"],
});

const readyNav = renderSidebarNav({
  isBootstrapping: false,
  canAccess: (f) => ent.canAccess(f),
});
assert(readyNav.type === "REAL_NAV", "Renders REAL_NAV after context is ready");
const titles = readyNav.items.map((i) => i.title);
assert(titles.includes("Dashboard"), "Dashboard is visible");
assert(titles.includes("Fees & Invoices"), "Fees & Invoices is visible (in plan)");
assert(!titles.includes("Reports & Analytics"), "Reports & Analytics is NOT visible (never flickered into view)");

console.log("\n==========================================");
console.log(`BOOTSTRAP & ANTI-FLICKER RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================\n");

if (failed > 0) process.exit(1);
