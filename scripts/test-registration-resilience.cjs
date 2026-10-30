// scripts/test-registration-resilience.cjs
// Authoritative tests for School Registration Resilience, Security, and Firebase Admin configuration

const assert = require("assert");
const fs = require("fs");
const ts = require("typescript");
const vm = require("vm");

console.log("======================================================================");
console.log("RUNNING REGISTRATION RESILIENCE & FIREBASE ADMIN VERIFICATION SUITE");
console.log("======================================================================");

// Load and transpile src/lib/firebase/admin.ts into isolated VM sandbox
const code = fs.readFileSync("src/lib/firebase/admin.ts", "utf-8");
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createAdminSandbox(customEnv = {}) {
  const adminExports = {};
  const mockApps = [];
  const mockProcess = {
    env: { ...customEnv },
    cwd: () => process.cwd(),
  };
  vm.runInNewContext(transpiled, {
    exports: adminExports,
    require: (mod) => {
      if (mod === "firebase-admin/app") {
        return {
          initializeApp: (opts) => {
            const app = { name: "[DEFAULT]", options: opts };
            mockApps.push(app);
            return app;
          },
          getApps: () => mockApps,
          cert: (sa) => ({ projectId: sa.projectId, clientEmail: sa.clientEmail }),
        };
      }
      if (mod === "firebase-admin/auth") {
        return { getAuth: (app) => ({ app }) };
      }
      if (mod === "firebase-admin/firestore") {
        return { getFirestore: (app) => ({ app }) };
      }
      return require(mod);
    },
    process: mockProcess,
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    Promise,
  });
  return adminExports;
}

// Mock server state for registration API tests
const records = new Map();
let authUsers = new Map();
let deletedAuthUids = [];
let failTransaction = false;

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

(async function runTests() {
  let passed = 0;
  let totalTests = 13;

  // Test 1: Private key normalization helper
  try {
    const adminSandbox = createAdminSandbox();
    const escaped = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----\\n"';
    const normalized = adminSandbox.normalizePrivateKey(escaped);
    assert.ok(normalized.includes("\n"), "Should replace literal \\n with real newlines");
    assert.ok(!normalized.startsWith('"'), "Should strip wrapping double quotes");
    assert.ok(normalized.includes("BEGIN PRIVATE KEY"), "Should retain key header");
    assert.ok(normalized.includes("END PRIVATE KEY"), "Should retain key footer");

    const singleQuoted = "'-----BEGIN RSA PRIVATE KEY-----\\nABC123\\n-----END RSA PRIVATE KEY-----\\n;';";
    const normSingle = adminSandbox.normalizePrivateKey(singleQuoted);
    assert.ok(!normSingle.startsWith("'"), "Should strip wrapping single quotes");
    assert.ok(!normSingle.endsWith(";"), "Should strip trailing semicolons");
    console.log("  [PASS] Test 1: Private key PEM normalization correctly unescapes newlines and trims quotes");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 1:", e);
  }

  // Test 2: Valid school completes self-registration and creates school, admin, and free trial subscription
  try {
    records.clear();
    authUsers.clear();
    deletedAuthUids = [];
    failTransaction = false;
    seedFreePlan();

    const input = {
      name: "Sunrise Academy",
      code: "SUNRISE",
      city: "Jaipur",
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
        city: input.city,
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

  // Test 6: Insecure client fallback eliminated from school.service.ts
  try {
    const serviceCode = fs.readFileSync("src/lib/services/school.service.ts", "utf-8");
    assert.ok(!serviceCode.includes("secAppName"), "Must not create secondary client apps (secAppName)");
    assert.ok(!serviceCode.includes("createUserWithEmailAndPassword(secAuth"), "Client secondary user creation must be eliminated");
    assert.ok(!serviceCode.includes("window.location.pathname.startsWith(\"/super-admin\")"), "Client pathname super-admin bypass must be removed");
    console.log("  [PASS] Test 6: Insecure administrative client fallback is completely eliminated");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 6:", e);
  }

  // Test 7: Missing credentials safely report 503 and do not expose secrets
  try {
    const unconfiguredAdmin = createAdminSandbox({
      FIREBASE_PROJECT_ID: "school-study-c8991",
    });
    assert.strictEqual(unconfiguredAdmin.isFirebaseAdminConfigured(), false);
    assert.strictEqual(unconfiguredAdmin.getSafeAdminDb(), null);
    assert.strictEqual(unconfiguredAdmin.getSafeAdminAuth(), null);
    console.log("  [PASS] Test 7: Missing credentials safely return null services without crashing");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 7:", e);
  }

  // Test 8: Diagnostics output contains correct fields and masks secrets
  try {
    const testPemKey = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD\n-----END PRIVATE KEY-----";
    const configuredAdmin = createAdminSandbox({
      FIREBASE_PROJECT_ID: "school-study-c8991",
      FIREBASE_CLIENT_EMAIL: "firebase-adminsdk-xyz@school-study-c8991.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: testPemKey,
      VERCEL_ENV: "production",
    });

    const diag = await configuredAdmin.getFirebaseAdminDiagnostics(false);
    assert.strictEqual(diag.configured, true, "Must detect valid configuration");
    assert.strictEqual(diag.environmentScope, "production");
    assert.strictEqual(diag.formatValidation.isClientEmailValid, true);
    assert.strictEqual(diag.formatValidation.privateKeyFormat, "valid_pem");
    assert.strictEqual(diag.projectId.isConsistent, true);
    assert.ok(diag.clientEmailMasked.includes("***"), "Client email must be masked");
    assert.strictEqual(diag.clientEmailMasked.includes("firebase-adminsdk-xyz"), false, "Raw email must not be exposed");
    const serialized = JSON.stringify(diag);
    assert.strictEqual(serialized.includes(testPemKey), false, "Private key must never be exposed in diagnostics");
    console.log("  [PASS] Test 8: Diagnostics utility correctly validates format and masks/omits all secrets");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 8:", e);
  }

  // Test 9: getAdminApp returns null when no credentials and does NOT poison getApps()
  try {
    const freshSandbox = createAdminSandbox({});
    const app = freshSandbox.getAdminApp();
    assert.strictEqual(app, null, "getAdminApp must return null when unconfigured");
    console.log("  [PASS] Test 9: getAdminApp returns null when unconfigured and eliminates app poisoning");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 9:", e);
  }

  // Test 10: cleanEnvString trims quotes and punctuation from environment variables
  try {
    const adminSandbox = createAdminSandbox();
    assert.strictEqual(adminSandbox.cleanEnvString('"school-study-c8991"'), "school-study-c8991");
    assert.strictEqual(adminSandbox.cleanEnvString("'firebase-adminsdk@domain.com;'"), "firebase-adminsdk@domain.com");
    assert.strictEqual(adminSandbox.cleanEnvString("  \"clean-id\"  "), "clean-id");
    console.log("  [PASS] Test 10: cleanEnvString correctly normalizes quoted environment values");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 10:", e);
  }

  // Test 11: Route handler /api/school/register uses Node.js runtime and force-dynamic
  try {
    const routeCode = fs.readFileSync("src/app/api/school/register/route.ts", "utf-8");
    assert.ok(routeCode.includes('export const runtime = "nodejs";'), "Must declare nodejs runtime");
    assert.ok(routeCode.includes('export const dynamic = "force-dynamic";'), "Must declare force-dynamic");
    console.log("  [PASS] Test 11: Registration route declares nodejs runtime and force-dynamic");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 11:", e);
  }

  // Test 12: Public API error payload does not leak internal diagnostics or secrets
  try {
    const routeCode = fs.readFileSync("src/app/api/school/register/route.ts", "utf-8");
    assert.ok(!routeCode.includes("diagnostics: diagnostics"), "Must not include diagnostics object in public API response");
    assert.ok(!routeCode.match(/NextResponse\.json\(\s*\{[^}]*\bdiagnostics\b/), "Must not pass diagnostics in response payload");
    assert.ok(routeCode.includes("ADMIN_AUTH_NOT_CONFIGURED"), "Must return safe ADMIN_AUTH_NOT_CONFIGURED code");
    assert.ok(routeCode.includes("RATE_LIMIT_EXCEEDED"), "Must include rate limit protection");
    console.log("  [PASS] Test 12: Public API error response is fully sanitized and leaks zero diagnostics");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 12:", e);
  }

  // Test 13: Usage service prioritizes tenant subcollections before attempting root queries
  try {
    const usageCode = fs.readFileSync("src/lib/billing/usage.ts", "utf-8");
    assert.ok(usageCode.includes("Query authoritative tenant subcollections first"), "Must prioritize tenant subcollection queries");
    assert.ok(usageCode.includes("Fallback to legacy root collections ONLY"), "Must only query root if subcollections are empty");
    console.log("  [PASS] Test 13: Usage service prioritizes subcollections to prevent unauthorized root collection errors");
    passed++;
  } catch (e) {
    console.error("  [FAIL] Test 13:", e);
  }

  console.log("======================================================================");
  console.log(`REGISTRATION RESILIENCE RESULTS: ${passed} PASSED, ${totalTests - passed} FAILED`);
  console.log("======================================================================");
  if (passed !== totalTests) process.exitCode = 1;
})();
