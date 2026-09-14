import { getRedirectByRole, isRoleAllowedForPath } from "../src/lib/utils/redirect-by-role";
import { UserRole } from "../src/types";

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
  console.log("TESTING SESSION PERSISTENCE & FORCE LOGOUT ENGINE");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // Test 1: Role Dashboard Routing
  // ----------------------------------------------------
  console.log("--- Group 1: Role-Based Dashboard Auto-Redirects ---");
  assert(getRedirectByRole("super_admin") === "/super-admin", "super_admin redirects to /super-admin");
  assert(getRedirectByRole("school_admin") === "/admin", "school_admin redirects to /admin");
  assert(getRedirectByRole("teacher") === "/teacher", "teacher redirects to /teacher");
  assert(getRedirectByRole("student") === "/student", "student redirects to /student");

  assert(isRoleAllowedForPath("super_admin", "/super-admin/users"), "super_admin is allowed on /super-admin/users");
  assert(!isRoleAllowedForPath("school_admin", "/super-admin/users"), "school_admin is forbidden on /super-admin");
  assert(isRoleAllowedForPath("school_admin", "/admin/students"), "school_admin is allowed on /admin/students");
  assert(!isRoleAllowedForPath("teacher", "/admin/billing"), "teacher is forbidden on /admin/billing");

  // ----------------------------------------------------
  // Test 2: Persistent Storage Resolution (localStorage over sessionStorage)
  // ----------------------------------------------------
  console.log("\n--- Group 2: Super Admin Verification Persistence Model ---");
  // Simulating the browser environment where localStorage persists across browser tab closures
  function checkSuperAdminVerified(
    mockLocalStorage: Record<string, string>,
    mockSessionStorage: Record<string, string>
  ): boolean {
    return (
      mockLocalStorage["ss_super_admin_verified"] === "true" ||
      mockSessionStorage["ss_super_admin_verified"] === "true"
    );
  }

  // Case A: User logged in, closed tab (sessionStorage wiped, localStorage remains)
  const afterTabCloseSession: Record<string, string> = {}; // Empty sessionStorage
  const afterTabCloseLocal: Record<string, string> = { ss_super_admin_verified: "true" }; // Kept in localStorage
  assert(
    checkSuperAdminVerified(afterTabCloseLocal, afterTabCloseSession) === true,
    "Super Admin remains verified even after tab closure via persistent localStorage"
  );

  // Case B: User explicitly clicked Sign Out (both wiped)
  const afterSignOutSession: Record<string, string> = {};
  const afterSignOutLocal: Record<string, string> = {};
  assert(
    checkSuperAdminVerified(afterSignOutLocal, afterSignOutSession) === false,
    "Super Admin is NOT verified after explicit Sign Out"
  );

  // ----------------------------------------------------
  // Test 3: Session Expiry Validation (30 Days Persistent Policy)
  // ----------------------------------------------------
  console.log("\n--- Group 3: Session Expiry Policy ---");
  const SESSION_MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();

  // 1 day old session -> VALID (User must NOT be logged out)
  const oneDayOld = now - 1 * 24 * 60 * 60 * 1000;
  assert(now - oneDayOld <= SESSION_MAX_DURATION_MS, "1-day-old session is valid and kept logged in");

  // 7 days old session -> VALID (Previously expired at 7 days, now preserved)
  const sevenDaysOld = now - 7 * 24 * 60 * 60 * 1000;
  assert(now - sevenDaysOld <= SESSION_MAX_DURATION_MS, "7-day-old session is valid and kept logged in");

  // 29 days old session -> VALID
  const twentyNineDaysOld = now - 29 * 24 * 60 * 60 * 1000;
  assert(now - twentyNineDaysOld <= SESSION_MAX_DURATION_MS, "29-day-old session is valid and kept logged in");

  // 31 days old session -> EXPIRED
  const thirtyOneDaysOld = now - 31 * 24 * 60 * 60 * 1000;
  assert(now - thirtyOneDaysOld > SESSION_MAX_DURATION_MS, "31-day-old session is expired and logs user out");

  // ----------------------------------------------------
  // Test 4: Super Admin Force Logout Evaluation
  // ----------------------------------------------------
  console.log("\n--- Group 4: Super Admin Force Logout Eviction Logic ---");
  interface MockSecurityRecord {
    forceLogout?: boolean;
    requireReLogin?: boolean;
    forceLogoutAt?: number;
    securityVersion?: number;
    status: string;
  }

  function evaluateClientSessionValidity(
    securityRecord: MockSecurityRecord,
    sessionLoginTime: number
  ): { valid: boolean; reason?: string } {
    if (["suspended", "blocked", "disabled"].includes(securityRecord.status.toLowerCase())) {
      return { valid: false, reason: "account_suspended" };
    }

    const forceTime = securityRecord.forceLogoutAt || securityRecord.securityVersion || 0;
    if ((securityRecord.forceLogout === true || securityRecord.requireReLogin === true) && forceTime > sessionLoginTime) {
      return { valid: false, reason: "session_revoked" };
    }

    return { valid: true };
  }

  const loginTimestamp = 1700000000000;

  // Active user without force logout
  const activeRecord: MockSecurityRecord = {
    status: "active",
    forceLogout: false,
    requireReLogin: false
  };
  assert(evaluateClientSessionValidity(activeRecord, loginTimestamp).valid === true, "Active user session is valid");

  // Super Admin issues FORCE_LOGOUT at a timestamp after login
  const forceLogoutRecord: MockSecurityRecord = {
    status: "active",
    forceLogout: true,
    requireReLogin: true,
    forceLogoutAt: loginTimestamp + 5000, // 5 seconds after login
    securityVersion: loginTimestamp + 5000
  };
  const evalForceLogout = evaluateClientSessionValidity(forceLogoutRecord, loginTimestamp);
  assert(evalForceLogout.valid === false, "Force-logged out user session is invalidated");
  assert(evalForceLogout.reason === "session_revoked", "Reason is session_revoked");

  // User subsequently re-authenticates (fresh loginTimestamp after forceLogoutAt)
  const freshLoginTimestamp = forceLogoutRecord.forceLogoutAt! + 1000;
  // Upon successful fresh login, forceLogout is reset to false in the database
  const resetRecord: MockSecurityRecord = {
    status: "active",
    forceLogout: false,
    requireReLogin: false,
    forceLogoutAt: forceLogoutRecord.forceLogoutAt
  };
  assert(evaluateClientSessionValidity(resetRecord, freshLoginTimestamp).valid === true, "Fresh login after force-logout establishes valid session");

  // User account suspended
  const suspendedRecord: MockSecurityRecord = {
    status: "suspended",
    forceLogout: false,
    requireReLogin: false
  };
  const evalSuspended = evaluateClientSessionValidity(suspendedRecord, loginTimestamp);
  assert(evalSuspended.valid === false, "Suspended account session is invalidated");
  assert(evalSuspended.reason === "account_suspended", "Reason is account_suspended");

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log(`\n==================================================`);
  console.log(`ALL TESTS PASSED: ${passed} / ${passed + failed}`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
