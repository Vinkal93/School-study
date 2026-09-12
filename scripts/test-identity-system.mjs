/**
 * UNIQUE IDENTITY SYSTEM TEST SUITE
 * 
 * Verifies:
 * 1. Default identity prefixes (SUP, SCH, ADM, TEC, STU).
 * 2. Identity normalization (trim and uppercase).
 * 3. Identity format validation rules (min length, allowed chars, prefix matching).
 * 4. Authoritative ID auto-generation format.
 * 5. Atomic reservation & duplicate detection logic.
 * 6. Identifier resolution for login (Email vs User ID).
 */

const DEFAULT_PREFIXES = {
  superAdmin: "SUP",
  school: "SCH",
  schoolAdmin: "ADM",
  teacher: "TEC",
  student: "STU",
};

function normalizeIdentity(raw) {
  if (!raw) return "";
  return raw.trim().toUpperCase();
}

function validateIdentityFormat(id, expectedRole) {
  const normalized = normalizeIdentity(id);
  if (!normalized) {
    return { valid: false, error: "Identifier cannot be empty." };
  }

  if (normalized.length < 4 || normalized.length > 24) {
    return { valid: false, error: "Identifier must be between 4 and 24 characters." };
  }

  const validCharsRegex = /^[A-Z0-9_-]+$/;
  if (!validCharsRegex.test(normalized)) {
    return {
      valid: false,
      error: "Identifier may only contain letters, numbers, hyphens (-), and underscores (_).",
    };
  }

  if (expectedRole) {
    const roleToPrefixMap = {
      super_admin: DEFAULT_PREFIXES.superAdmin,
      school: DEFAULT_PREFIXES.school,
      school_admin: DEFAULT_PREFIXES.schoolAdmin,
      admin: DEFAULT_PREFIXES.schoolAdmin,
      teacher: DEFAULT_PREFIXES.teacher,
      student: DEFAULT_PREFIXES.student,
    };
    const expectedPrefix = roleToPrefixMap[expectedRole];
    if (expectedPrefix && !normalized.startsWith(expectedPrefix)) {
      return {
        valid: false,
        error: `Identifier for role ${expectedRole} must start with prefix ${expectedPrefix}.`,
      };
    }
  }

  return { valid: true, normalized };
}

function generateAuthoritativeId(role, sequence) {
  const roleToPrefixMap = {
    super_admin: DEFAULT_PREFIXES.superAdmin,
    school: DEFAULT_PREFIXES.school,
    school_admin: DEFAULT_PREFIXES.schoolAdmin,
    admin: DEFAULT_PREFIXES.schoolAdmin,
    teacher: DEFAULT_PREFIXES.teacher,
    student: DEFAULT_PREFIXES.student,
  };
  const prefix = roleToPrefixMap[role] || "USR";
  const padded = String(sequence).padStart(6, "0");
  return `${prefix}${padded}`;
}

// In-memory mock registry to simulate atomic reservation
class MockIdentityRegistry {
  constructor() {
    this.userIds = new Map();
    this.schoolIds = new Map();
  }

  checkUserAvailable(userId) {
    const norm = normalizeIdentity(userId);
    return !this.userIds.has(norm);
  }

  reserveUser(userId, data) {
    const norm = normalizeIdentity(userId);
    if (this.userIds.has(norm)) {
      throw new Error(`User ID "${norm}" is already taken.`);
    }
    this.userIds.set(norm, { ...data, userId: norm, reservedAt: new Date().toISOString() });
    return this.userIds.get(norm);
  }

  resolveIdentifier(identifier) {
    const norm = normalizeIdentity(identifier);
    if (norm.includes("@")) {
      return { found: true, email: identifier.trim().toLowerCase(), type: "email" };
    }
    const record = this.userIds.get(norm);
    if (record) {
      return { found: true, email: record.email, type: "userId", record };
    }
    return { found: false };
  }
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
console.log("RUNNING UNIQUE IDENTITY SYSTEM TESTS");
console.log("==========================================\n");

// Test 1: Normalization
console.log("Test Suite 1: Normalization");
assert(normalizeIdentity("  adm20261234  ") === "ADM20261234", "Trims and uppercases ID");
assert(normalizeIdentity("stu-0099") === "STU-0099", "Preserves valid hyphens in uppercase");
assert(normalizeIdentity("") === "", "Handles empty input safely");

// Test 2: Validation
console.log("\nTest Suite 2: Format & Prefix Validation");
assert(validateIdentityFormat("ADM123456", "school_admin").valid === true, "Valid ADM format passes");
assert(validateIdentityFormat("TEC998877", "teacher").valid === true, "Valid TEC format passes");
assert(validateIdentityFormat("STU000123", "student").valid === true, "Valid STU format passes");
assert(validateIdentityFormat("SUP000001", "super_admin").valid === true, "Valid SUP format passes");
assert(validateIdentityFormat("SCH889900", "school").valid === true, "Valid SCH format passes");

assert(validateIdentityFormat("ST1", "student").valid === false, "Fails if shorter than 4 chars");
assert(validateIdentityFormat("ADM@123", "school_admin").valid === false, "Fails on illegal characters (@)");
assert(validateIdentityFormat("TEC123456", "student").valid === false, "Fails if prefix does not match expected role");

// Test 3: Auto-generation
console.log("\nTest Suite 3: Authoritative ID Generation");
const genStudent = generateAuthoritativeId("student", 42);
assert(genStudent === "STU000042", `Generated student ID: ${genStudent}`);
const genTeacher = generateAuthoritativeId("teacher", 105);
assert(genTeacher === "TEC000105", `Generated teacher ID: ${genTeacher}`);
const genAdmin = generateAuthoritativeId("school_admin", 7);
assert(genAdmin === "ADM000007", `Generated admin ID: ${genAdmin}`);

// Test 4: Atomic Reservation & Resolution
console.log("\nTest Suite 4: Atomic Reservation & Identifier Resolution");
const registry = new MockIdentityRegistry();

assert(registry.checkUserAvailable("ADM2026001") === true, "ADM2026001 is available initially");
registry.reserveUser("ADM2026001", { uid: "uid_adm_1", email: "admin@school.com", role: "school_admin" });
assert(registry.checkUserAvailable("ADM2026001") === false, "ADM2026001 is now unavailable");

let dupCaught = false;
try {
  registry.reserveUser("adm2026001", { uid: "uid_adm_2", email: "admin2@school.com", role: "school_admin" });
} catch (e) {
  dupCaught = true;
}
assert(dupCaught === true, "Rejects duplicate reservation regardless of casing");

// Test 5: Resolution for Login
console.log("\nTest Suite 5: Identifier Resolution for Multi-Portal Login");
const resEmail = registry.resolveIdentifier("admin@school.com");
assert(resEmail.found === true && resEmail.type === "email", "Resolves direct email identifier");

const resId = registry.resolveIdentifier("ADM2026001");
assert(resId.found === true && resId.email === "admin@school.com", "Resolves ADM2026001 to email admin@school.com");

const resMissing = registry.resolveIdentifier("ADM999999");
assert(resMissing.found === false, "Returns not found for unassigned ID");

console.log("\n==========================================");
console.log(`IDENTITY SYSTEM RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================\n");

if (failed > 0) process.exit(1);
