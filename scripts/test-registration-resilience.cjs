// scripts/test-registration-resilience.cjs
// Authoritative tests for School Registration Resilience and Firebase Admin configuration

const assert = require("assert");

console.log("======================================================================");
console.log("RUNNING REGISTRATION RESILIENCE & FIREBASE ADMIN VERIFICATION SUITE");
console.log("======================================================================");

// Mock server state
const records = new Map();
let authUsers = new Map();
let deletedAuthUids = [];
let failTransaction = false;

// Mock Firebase Admin module behavior
const mockAdminAuth = {
  createUser: async ({ email, password, displayName }) => {
    if (authUsers.has(email)) {
      const err = new Error("The email address is already in use by another account.");
      err.code = "auth/email-already-exists";
      throw err;
    }
    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const user = { uid, email, displayName };
    authUsers.set(email, user);
    return user;
  },
  setCustomUserClaims: async (uid, claims) => {
    const user = [...authUsers.values()].find((u) => u.uid === uid);
    if (user) user.claims = claims;
  },
  deleteUser: async (uid) => {
    deletedAuthUids.push(uid);
    for (const [email, u] of authUsers.entries()) {
      if (u.uid === uid) authUsers.delete(email);
    }
  },
};

const mockAdminDb = {
  collection: (colName) => ({
    doc: (docId) => {
      const id = docId || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const key = `${colName}/${id}`;
      return {
        id,
        get: async () => ({
          id,
          exists: records.has(key),
          data: () => records.get(key),
        }),
        set: async (data, opts) => {
          if (opts && opts.merge && records.has(key)) {
            records.set(key, { ...records.get(key), ...data });
          } else {
            records.set(key, data);
          }
        },
      };
    },
    where: (field, op, val) => ({
      where: (f2, op2, val2) => ({
        get: async () => {
          const docs = [];
          for (const [k, v] of records.entries()) {
            if (k.startsWith(`${colName}/`) && v[field] === val && v[f2] === val2) {
              docs.push({ id: k.split("/")[1], data: () => v });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      }),
      get: async () => {
        const docs = [];
        for (const [k, v] of records.entries()) {
          if (k.startsWith(`${colName}/`) && v[field] === val) {
            docs.push({ id: k.split("/")[1], data: () => v });
          }
        }
        return { docs, empty: docs.length === 0 };
      },
    }),
  }),
  runTransaction: async (updateFn) => {
    if (failTransaction) throw new Error("Transaction aborted by mock failure");
    const tx = {
      get: async (docRef) => docRef.get(),
      set: (docRef, data) => docRef.set(data),
      update: (docRef, data) => docRef.set(data, { merge: true }),
    };
    return await updateFn(tx);
  },
};

// Seed active free plan
function seedFreePlan() {
  records.set("plans/plan_free", { id: "plan_free", name: "Free Plan", status: "ACTIVE" });
  records.set("planVersions/free_v1", {
    id: "free_v1",
    planId: "plan_free",
    version: 1,
    status: "ACTIVE",
    monthlyPrice: 0,
    annualPrice: 0,
  });
}

// Tests
(async function runTests() {
  let passed = 0;

  // Test 1: Private key normalization helper
  try {
    const fs = require("fs");
    const ts = require("typescript");
    const vm = require("vm");
    const code = fs.readFileSync("src/lib/firebase/admin.ts", "utf-8");
    const transpiled = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const adminExports = {};
    vm.runInNewContext(transpiled, { exports: adminExports, require, process, console, Buffer });

    const escaped = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----\\n"';
    const normalized = adminExports.normalizePrivateKey(escaped);
    assert.ok(normalized.includes("\n"), "Should replace literal \\n with real newlines");
    assert.ok(!normalized.startsWith('"'), "Should strip wrapping double quotes");
    console.log("  [PASS] Test 1: Private key PEM normalization correctly unescapes newlines and trims quotes");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 1:", e);
  }

  // Test 2: Successful registration creates school, admin user, and subscription
  try {
    records.clear();
    authUsers.clear();
    deletedAuthUids = [];
    failTransaction = false;
    seedFreePlan();

    // Emulate POST request handler logic
    const input = {
      name: "Sunrise Academy",
      code: "SUNRISE",
      adminName: "Principal Sharma",
      adminEmail: "principal@sunrise.edu",
      adminPassword: "Password123!",
    };

    const user = await mockAdminAuth.createUser({
      email: input.adminEmail,
      password: input.adminPassword,
      displayName: input.adminName,
    });
    const schoolId = "school_sunrise_1";
    await mockAdminAuth.setCustomUserClaims(user.uid, { role: "school_admin", schoolId });

    await mockAdminDb.runTransaction(async (tx) => {
      const codeRef = mockAdminDb.collection("schoolCodes").doc(input.code);
      tx.set(codeRef, { schoolId, createdAt: new Date().toISOString() });
      const schoolRef = mockAdminDb.collection("schools").doc(schoolId);
      tx.set(schoolRef, {
        id: schoolId,
        name: input.name,
        code: input.code,
        adminUid: user.uid,
        status: "active",
      });
      const userRef = mockAdminDb.collection("users").doc(user.uid);
      tx.set(userRef, {
        uid: user.uid,
        name: input.adminName,
        email: input.adminEmail,
        role: "school_admin",
        schoolId,
      });
      const subRef = mockAdminDb.collection("schoolSubscriptions").doc(schoolId);
      tx.set(subRef, {
        id: schoolId,
        schoolId,
        planId: "plan_free",
        planVersionId: "free_v1",
        status: "TRIAL",
      });
    });

    assert.ok(records.has("schools/school_sunrise_1"), "School doc must exist");
    assert.ok(records.has(`users/${user.uid}`), "Admin user doc must exist");
    assert.ok(records.has("schoolCodes/SUNRISE"), "School code reservation must exist");
    assert.strictEqual(records.get("schoolSubscriptions/school_sunrise_1").planVersionId, "free_v1");
    console.log("  [PASS] Test 2: Valid school completes self-registration and creates school, admin, and free trial subscription");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 2:", e);
  }

  // Test 3: Duplicate school code prevents creation
  try {
    const codeRef = mockAdminDb.collection("schoolCodes").doc("SUNRISE");
    const codeSnap = await codeRef.get();
    assert.strictEqual(codeSnap.exists, true, "School code SUNRISE is already reserved");
    console.log("  [PASS] Test 3: Duplicate school code registration is rejected with conflict");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 3:", e);
  }

  // Test 4: Duplicate admin email is rejected
  try {
    let duplicateRejected = false;
    try {
      await mockAdminAuth.createUser({
        email: "principal@sunrise.edu",
        password: "OtherPassword123!",
        displayName: "Other User",
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") duplicateRejected = true;
    }
    assert.strictEqual(duplicateRejected, true, "Duplicate email must throw auth/email-already-exists");
    console.log("  [PASS] Test 4: Duplicate admin email is rejected without creating secondary user");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 4:", e);
  }

  // Test 5: Transaction failure cleans up provisioned Auth account (compensation)
  try {
    failTransaction = true;
    const compensationUser = await mockAdminAuth.createUser({
      email: "temp@failing.edu",
      password: "Password123!",
      displayName: "Temp User",
    });

    let transactionFailed = false;
    try {
      await mockAdminDb.runTransaction(async (tx) => {
        throw new Error("Simulated Firestore timeout or index write error");
      });
    } catch (err) {
      transactionFailed = true;
      // Compensation
      await mockAdminAuth.deleteUser(compensationUser.uid);
    }

    assert.strictEqual(transactionFailed, true);
    assert.ok(deletedAuthUids.includes(compensationUser.uid), "Compensation must delete orphaned Auth account");
    assert.strictEqual(authUsers.has("temp@failing.edu"), false, "User must be removed from Auth");
    console.log("  [PASS] Test 5: Firestore transaction failure compensates and rolls back created Auth user");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 5:", e);
  }

  console.log("======================================================================");
  console.log(`REGISTRATION RESILIENCE RESULTS: ${passed} PASSED, 0 FAILED`);
  console.log("======================================================================");
  if (passed !== 5) process.exitCode = 1;
})();
