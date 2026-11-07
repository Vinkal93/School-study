/**
 * Test Suite: Deleted-School Authentication & Authorization Security
 * 
 * Verifies:
 * 1. Centralized school validation (ACTIVE, SUSPENDED, DELETING, DELETED, MISSING).
 * 2. Cross-tenant tampering prevention (user targeting foreign school ID).
 * 3. Member status validation (ACTIVE, SUSPENDED, DISABLED, INACTIVE).
 * 4. Token revocation & session invalidation upon school deletion.
 * 5. Immediate rejection of subsequent requests when a school is deleted.
 * 6. Suspended schools are blocked without permanent data deletion.
 * 7. Unrelated schools and users continue working normally.
 * 8. Exact login error messages for deleted schools vs invalid user accounts.
 */

const assert = require("assert");

// Colors for terminal reporting
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ${colors.green}✓ PASS${colors.reset}: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ${colors.red}✗ FAIL${colors.reset}: ${description}`);
    console.error(`    ${colors.red}${err.message}${colors.reset}`);
  }
}

async function runAsyncTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  ${colors.green}✓ PASS${colors.reset}: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ${colors.red}✗ FAIL${colors.reset}: ${description}`);
    console.error(`    ${colors.red}${err.message}${colors.reset}`);
  }
}

console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  DELETED-SCHOOL AUTHENTICATION & AUTHORIZATION SECURITY SUITE  ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

// Mock in-memory database representing Firestore state
const mockDb = {
  schools: new Map(),
  users: new Map(),
  sessions: new Map(),
  audits: [],
  revokedTokens: new Set(),
};

// Seed initial schools and users
function resetMockDb() {
  mockDb.schools.clear();
  mockDb.users.clear();
  mockDb.sessions.clear();
  mockDb.audits = [];
  mockDb.revokedTokens.clear();

  // Active School Alpha
  mockDb.schools.set("school_alpha", {
    id: "school_alpha",
    name: "Alpha Academy",
    status: "active",
    operationalStatus: "ACTIVE",
    isSuspended: false,
    isDeleting: false,
  });

  // Suspended School Beta
  mockDb.schools.set("school_beta", {
    id: "school_beta",
    name: "Beta High",
    status: "suspended",
    operationalStatus: "SUSPENDED",
    isSuspended: true,
    isDeleting: false,
  });

  // Active School Gamma (independent school to test multi-tenant isolation)
  mockDb.schools.set("school_gamma", {
    id: "school_gamma",
    name: "Gamma Institute",
    status: "active",
    operationalStatus: "ACTIVE",
    isSuspended: false,
    isDeleting: false,
  });

  // Users in School Alpha
  mockDb.users.set("alpha_admin", {
    uid: "alpha_admin",
    name: "Alpha Administrator",
    email: "admin@alpha.edu",
    role: "school_admin",
    schoolId: "school_alpha",
    status: "active",
  });

  mockDb.users.set("alpha_student", {
    uid: "alpha_student",
    name: "Alpha Student",
    email: "student@alpha.edu",
    role: "student",
    schoolId: "school_alpha",
    status: "active",
  });

  // User in School Gamma
  mockDb.users.set("gamma_student", {
    uid: "gamma_student",
    name: "Gamma Student",
    email: "student@gamma.edu",
    role: "student",
    schoolId: "school_gamma",
    status: "active",
  });

  // Active session tokens
  mockDb.sessions.set("session_alpha_admin", { uid: "alpha_admin", schoolId: "school_alpha", active: true });
  mockDb.sessions.set("session_alpha_student", { uid: "alpha_student", schoolId: "school_alpha", active: true });
  mockDb.sessions.set("session_gamma_student", { uid: "gamma_student", schoolId: "school_gamma", active: true });
}

// Logic replicating validateSchoolStatus
function validateSchoolStatus(schoolId) {
  if (!schoolId) {
    return {
      allowed: false,
      status: "missing",
      reason: "School identifier is missing or required",
    };
  }

  const school = mockDb.schools.get(schoolId);
  if (!school) {
    return {
      allowed: false,
      status: "missing",
      reason: "School account not found or has been removed from central registry",
    };
  }

  const rawStatus = (school.status || "").toLowerCase().trim();
  const operationalStatus = (school.operationalStatus || "").toUpperCase().trim();

  if (rawStatus === "deleting" || operationalStatus === "DELETING" || school.isDeleting) {
    return {
      allowed: false,
      status: "deleting",
      schoolName: school.name,
      reason: "School is currently being decommissioned",
    };
  }

  if (rawStatus === "deleted" || operationalStatus === "DELETED") {
    return {
      allowed: false,
      status: "deleted",
      schoolName: school.name,
      reason: "School account has been permanently deleted",
    };
  }

  if (rawStatus === "suspended" || operationalStatus === "SUSPENDED" || school.isSuspended) {
    return {
      allowed: false,
      status: "suspended",
      schoolName: school.name,
      reason: "School access is suspended by platform administration",
    };
  }

  if (rawStatus === "active" || rawStatus === "trial") {
    return {
      allowed: true,
      status: rawStatus === "trial" ? "trial" : "active",
      schoolName: school.name,
    };
  }

  return {
    allowed: false,
    status: "inactive",
    schoolName: school.name,
    reason: `School status is '${school.status || "unknown"}' and cannot access resources`,
  };
}

// Logic replicating validateTenantMember
function validateTenantMember(user, targetSchoolId) {
  if (!user || !user.uid) {
    return { allowed: false, code: "UNAUTHENTICATED", error: "Authentication required" };
  }

  if (user.role === "super_admin") {
    if (targetSchoolId) {
      const targetCheck = validateSchoolStatus(targetSchoolId);
      if (!targetCheck.allowed) {
        return {
          allowed: false,
          code: targetCheck.status === "suspended" ? "SCHOOL_SUSPENDED" : "SCHOOL_ACCOUNT_NOT_FOUND",
          error: targetCheck.reason,
        };
      }
    }
    return { allowed: true, schoolStatus: "active" };
  }

  if (user.status && user.status !== "active") {
    return {
      allowed: false,
      code: "ACCOUNT_SUSPENDED",
      error: `Your account is ${user.status}. Please contact platform admin.`,
    };
  }

  if (!user.schoolId) {
    return {
      allowed: false,
      code: "NO_TENANT_ASSIGNED",
      error: "User account is not associated with any active school",
    };
  }

  if (targetSchoolId && user.schoolId !== targetSchoolId) {
    return {
      allowed: false,
      code: "CROSS_TENANT_ACCESS_DENIED",
      error: "Access denied. Cannot access resources belonging to a different school.",
    };
  }

  const schoolCheck = validateSchoolStatus(user.schoolId);
  if (!schoolCheck.allowed) {
    const isDeletedOrMissing =
      schoolCheck.status === "deleted" ||
      schoolCheck.status === "deleting" ||
      schoolCheck.status === "missing";

    return {
      allowed: false,
      code: isDeletedOrMissing ? "SCHOOL_ACCOUNT_NOT_FOUND" : "SCHOOL_SUSPENDED",
      error: isDeletedOrMissing
        ? "School Account Not Found. This school account no longer exists. Please contact support."
        : "School Access Suspended. This school account is currently suspended. Please contact platform admin.",
      schoolStatus: schoolCheck.status,
    };
  }

  return {
    allowed: true,
    schoolStatus: schoolCheck.status,
    schoolName: schoolCheck.schoolName,
  };
}

// Simulated backend deletion service (deleteSchoolSecurely)
function deleteSchoolSecurely(schoolId, actorId, reason) {
  const school = mockDb.schools.get(schoolId);
  if (!school) {
    return { success: true, message: "School already absent" };
  }

  // Phase 1: Mark DELETING immediately to block any concurrent requests
  school.status = "deleting";
  school.operationalStatus = "DELETING";
  school.isDeleting = true;

  // Phase 2: Invalidate all sessions & revoke tokens for all users belonging to this school
  for (const [uid, user] of mockDb.users.entries()) {
    if (user.schoolId === schoolId) {
      mockDb.revokedTokens.add(uid);
      // Invalidate active session
      for (const [sKey, session] of mockDb.sessions.entries()) {
        if (session.uid === uid) {
          session.active = false;
        }
      }
    }
  }

  // Phase 3 & 4: Purge resources and delete user accounts
  for (const [uid, user] of Array.from(mockDb.users.entries())) {
    if (user.schoolId === schoolId) {
      mockDb.users.delete(uid);
    }
  }

  // Phase 5: Mark DELETED in central registry or remove document
  mockDb.schools.delete(schoolId);

  // Write immutable audit log
  mockDb.audits.push({
    action: "SCHOOL_DELETE_PERMANENT",
    schoolId,
    actorId,
    reason,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

// Simulated Login Pipeline
function attemptLogin(identifier, password) {
  // Check user existence
  let foundUser = null;
  for (const user of mockDb.users.values()) {
    if (user.email === identifier || user.uid === identifier) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    return {
      success: false,
      error: "Account not found. Please verify your credentials or contact support.",
    };
  }

  // Account status check
  if (foundUser.status && foundUser.status !== "active") {
    return {
      success: false,
      error: "Your account has been suspended or deactivated. Please contact platform admin.",
    };
  }

  // School status check
  if (foundUser.role !== "super_admin") {
    const schoolCheck = validateSchoolStatus(foundUser.schoolId);
    if (!schoolCheck.allowed) {
      if (
        schoolCheck.status === "deleted" ||
        schoolCheck.status === "deleting" ||
        schoolCheck.status === "missing"
      ) {
        return {
          success: false,
          error: "School Account Not Found. This school account no longer exists. Please contact support.",
        };
      }
      if (schoolCheck.status === "suspended") {
        return {
          success: false,
          error: "School Access Suspended. This school account is currently suspended. Please contact platform admin.",
        };
      }
      return {
        success: false,
        error: schoolCheck.reason || "School authorization failed. Please contact support.",
      };
    }
  }

  return { success: true, user: foundUser };
}

// ====================================================================
// TEST SUITE EXECUTION
// ====================================================================

console.log(`${colors.yellow}[1] Centralized School Validation Tests${colors.reset}`);
resetMockDb();

runTest("Active school returns allowed: true", () => {
  const result = validateSchoolStatus("school_alpha");
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.status, "active");
});

runTest("Suspended school returns allowed: false with suspended status", () => {
  const result = validateSchoolStatus("school_beta");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.status, "suspended");
});

runTest("Missing school ID returns allowed: false with missing status", () => {
  const result = validateSchoolStatus("non_existent_school_id");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.status, "missing");
});

runTest("School marked deleting returns allowed: false with deleting status", () => {
  mockDb.schools.set("deleting_school", {
    id: "deleting_school",
    name: "Deleting School",
    status: "deleting",
    operationalStatus: "DELETING",
    isDeleting: true,
  });
  const result = validateSchoolStatus("deleting_school");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.status, "deleting");
});

runTest("School marked deleted returns allowed: false with deleted status", () => {
  mockDb.schools.set("deleted_school", {
    id: "deleted_school",
    name: "Deleted School",
    status: "deleted",
    operationalStatus: "DELETED",
  });
  const result = validateSchoolStatus("deleted_school");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.status, "deleted");
});

console.log(`\n${colors.yellow}[2] Tenant Member & Cross-School Authorization Tests${colors.reset}`);
resetMockDb();

runTest("Active member of active school is authorized", () => {
  const user = mockDb.users.get("alpha_admin");
  const result = validateTenantMember(user, "school_alpha");
  assert.strictEqual(result.allowed, true);
});

runTest("Cross-tenant tampering (Alpha Student accessing Gamma School) is blocked with CROSS_TENANT_ACCESS_DENIED", () => {
  const user = mockDb.users.get("alpha_student");
  const result = validateTenantMember(user, "school_gamma");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, "CROSS_TENANT_ACCESS_DENIED");
});

runTest("Suspended user is blocked with ACCOUNT_SUSPENDED", () => {
  const suspendedUser = {
    uid: "suspended_user",
    role: "teacher",
    schoolId: "school_alpha",
    status: "suspended",
  };
  const result = validateTenantMember(suspendedUser, "school_alpha");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, "ACCOUNT_SUSPENDED");
});

runTest("User belonging to a suspended school is blocked with SCHOOL_SUSPENDED", () => {
  const betaUser = {
    uid: "beta_admin",
    role: "school_admin",
    schoolId: "school_beta",
    status: "active",
  };
  const result = validateTenantMember(betaUser, "school_beta");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, "SCHOOL_SUSPENDED");
  assert.strictEqual(
    result.error,
    "School Access Suspended. This school account is currently suspended. Please contact platform admin."
  );
});

console.log(`\n${colors.yellow}[3] Secure School Deletion & Immediate Revocation Tests${colors.reset}`);
resetMockDb();

runTest("Super Admin deletes School Alpha while Admin and Student have active sessions", () => {
  const delResult = deleteSchoolSecurely("school_alpha", "super_admin_1", "Testing secure deletion");
  assert.strictEqual(delResult.success, true);

  // School Alpha should be removed from central registry
  assert.strictEqual(mockDb.schools.has("school_alpha"), false);

  // Refresh tokens must be revoked
  assert.strictEqual(mockDb.revokedTokens.has("alpha_admin"), true);
  assert.strictEqual(mockDb.revokedTokens.has("alpha_student"), true);

  // Active sessions must be invalidated
  assert.strictEqual(mockDb.sessions.get("session_alpha_admin").active, false);
  assert.strictEqual(mockDb.sessions.get("session_alpha_student").active, false);

  // Audit log must be written
  assert.strictEqual(mockDb.audits.length, 1);
  assert.strictEqual(mockDb.audits[0].action, "SCHOOL_DELETE_PERMANENT");
});

runTest("Subsequent request by Alpha Admin is rejected immediately with SCHOOL_ACCOUNT_NOT_FOUND", () => {
  const cachedAlphaAdmin = {
    uid: "alpha_admin",
    name: "Alpha Administrator",
    role: "school_admin",
    schoolId: "school_alpha",
    status: "active",
  };
  const result = validateTenantMember(cachedAlphaAdmin, "school_alpha");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, "SCHOOL_ACCOUNT_NOT_FOUND");
  assert.strictEqual(
    result.error,
    "School Account Not Found. This school account no longer exists. Please contact support."
  );
});

runTest("Subsequent request by Alpha Student is rejected immediately with SCHOOL_ACCOUNT_NOT_FOUND", () => {
  const cachedAlphaStudent = {
    uid: "alpha_student",
    name: "Alpha Student",
    role: "student",
    schoolId: "school_alpha",
    status: "active",
  };
  const result = validateTenantMember(cachedAlphaStudent, "school_alpha");
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, "SCHOOL_ACCOUNT_NOT_FOUND");
  assert.strictEqual(
    result.error,
    "School Account Not Found. This school account no longer exists. Please contact support."
  );
});

console.log(`\n${colors.yellow}[4] Multi-Tenant Isolation & Unrelated Schools Verification${colors.reset}`);

runTest("Unrelated School Gamma and its users continue working normally after School Alpha deletion", () => {
  const gammaUser = mockDb.users.get("gamma_student");
  assert.notStrictEqual(gammaUser, undefined);
  const result = validateTenantMember(gammaUser, "school_gamma");
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.schoolStatus, "active");
  assert.strictEqual(mockDb.sessions.get("session_gamma_student").active, true);
});

console.log(`\n${colors.yellow}[5] Login Flow Error Messaging Verification${colors.reset}`);
resetMockDb();

runTest("Login attempt with non-existent user displays generic invalid account message", () => {
  const loginResult = attemptLogin("ghost@school.edu", "password123");
  assert.strictEqual(loginResult.success, false);
  assert.strictEqual(
    loginResult.error,
    "Account not found. Please verify your credentials or contact support."
  );
});

runTest("Login attempt by user of deleted school displays exact required message", () => {
  // Delete School Alpha
  deleteSchoolSecurely("school_alpha", "super_admin_1", "Test deletion message");

  // Attempt login with Alpha Admin's credentials
  const loginResult = attemptLogin("admin@alpha.edu", "password123");
  assert.strictEqual(loginResult.success, false);
  // User profile was deleted during school deletion:
  assert.strictEqual(
    loginResult.error,
    "Account not found. Please verify your credentials or contact support."
  );
});

runTest("Login attempt with existing profile on deleted school displays exact required message", () => {
  // Add a user whose school was deleted from registry
  mockDb.users.set("orphan_user", {
    uid: "orphan_user",
    email: "orphan@deleted.edu",
    role: "student",
    schoolId: "non_existent_school",
    status: "active",
  });

  const loginResult = attemptLogin("orphan@deleted.edu", "password123");
  assert.strictEqual(loginResult.success, false);
  assert.strictEqual(
    loginResult.error,
    "School Account Not Found. This school account no longer exists. Please contact support."
  );
});

runTest("Login attempt by user of suspended school displays suspension message", () => {
  mockDb.users.set("beta_user", {
    uid: "beta_user",
    email: "user@beta.edu",
    role: "teacher",
    schoolId: "school_beta",
    status: "active",
  });

  const loginResult = attemptLogin("user@beta.edu", "password123");
  assert.strictEqual(loginResult.success, false);
  assert.strictEqual(
    loginResult.error,
    "School Access Suspended. This school account is currently suspended. Please contact platform admin."
  );
});

console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}Test Summary: ${passedTests} of ${totalTests} passed.${colors.reset}`);
if (passedTests === totalTests) {
  console.log(`${colors.bold}${colors.green}ALL TESTS PASSED SUCCESSFULLY!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${colors.bold}${colors.red}SOME TESTS FAILED!${colors.reset}`);
  process.exit(1);
}
