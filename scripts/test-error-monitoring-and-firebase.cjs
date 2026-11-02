/**
 * Comprehensive Automated Verification Suite for
 * Firebase Admin Repair & Enterprise Error Monitoring System 3.0
 */

const assert = require("assert");
const fs = require("fs");
const ts = require("typescript");
const vm = require("vm");
const path = require("path");

let globalAdminMod = null;

function loadTsModule(filePath, customRequire = {}) {
  const code = fs.readFileSync(filePath, "utf-8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const moduleExports = {};
  const sandbox = {
    exports: moduleExports,
    module: { exports: moduleExports },
    require: (mod) => {
      if (customRequire[mod]) {
        return customRequire[mod];
      }
      if (mod === "@/lib/firebase/admin") {
        return globalAdminMod;
      }
      if (mod.startsWith("@/lib/monitoring/")) {
        const sub = mod.replace("@/lib/monitoring/", "");
        return loadTsModule(`src/lib/monitoring/${sub}.ts`, customRequire);
      }
      if (mod === "@/lib/monitoring") {
        return loadTsModule("src/lib/monitoring/index.ts", customRequire);
      }
      if (mod.startsWith("./")) {
        const dir = path.dirname(filePath);
        let resolved = path.join(dir, mod);
        if (!resolved.endsWith(".ts")) resolved += ".ts";
        return loadTsModule(resolved, customRequire);
      }
      return require(mod);
    },
    process: {
      ...process,
      env: { ...process.env },
    },
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    Math,
    URL,
  };

  vm.runInNewContext(transpiled, sandbox);
  return sandbox.module.exports;
}

async function runTests() {
  console.log("===============================================================");
  console.log("  SCHOOL STUDY 3.0: ERROR MONITORING & FIREBASE REPAIR TESTS   ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // --- SECTION 1: Firebase Admin Repair & Normalization ---
  console.log("\n[SECTION 1: Firebase Admin Normalization & Space-Collapsed PEM Repair]");

  const adminMod = loadTsModule("src/lib/firebase/admin.ts", {
    "firebase-admin/app": {
      initializeApp: () => ({ name: "[DEFAULT]" }),
      getApps: () => [],
      cert: (sa) => sa,
    },
    "firebase-admin/auth": {
      getAuth: () => ({}),
    },
    "firebase-admin/firestore": {
      getFirestore: () => ({}),
    },
  });

  globalAdminMod = {
    ...adminMod,
    getSafeAdminDb: () => null, // in-memory fallback testing
    getSafeAdminAuth: () => null,
  };

  const {
    normalizePrivateKey,
    repairSpaceCollapsedPem,
    isPrivateKeyFormatValid,
    cleanEnvString,
  } = adminMod;

  test("1.1 cleanEnvString strips trailing semicolons and outer quotes", () => {
    assert.strictEqual(cleanEnvString('"my-project-id";'), "my-project-id");
    assert.strictEqual(cleanEnvString("'firebase-adminsdk@app.iam.gserviceaccount.com',"), "firebase-adminsdk@app.iam.gserviceaccount.com");
  });

  const sampleKeyBody = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6XYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const standardPem = `-----BEGIN PRIVATE KEY-----\n${sampleKeyBody}\n-----END PRIVATE KEY-----\n`;

  test("1.2 normalizePrivateKey unescapes literal \\n and wrapped quotes", () => {
    const escaped = `"-----BEGIN PRIVATE KEY-----\\n${sampleKeyBody}\\n-----END PRIVATE KEY-----\\n"`;
    const normalized = normalizePrivateKey(escaped);
    assert.ok(normalized.includes("-----BEGIN PRIVATE KEY-----"));
    assert.ok(normalized.includes("-----END PRIVATE KEY-----"));
    assert.ok(normalized.includes("\n"));
    assert.ok(!normalized.includes("\\n"));
  });

  test("1.3 repairSpaceCollapsedPem correctly reforms space-collapsed PEM into 64-char lines", () => {
    // PEM where all newlines were collapsed into spaces
    const collapsed = `-----BEGIN PRIVATE KEY----- ${sampleKeyBody} -----END PRIVATE KEY-----`;
    const repaired = repairSpaceCollapsedPem(collapsed);
    assert.ok(repaired.startsWith("-----BEGIN PRIVATE KEY-----\n"));
    assert.ok(repaired.endsWith("-----END PRIVATE KEY-----\n"));
    const lines = repaired.trim().split("\n");
    // Body lines (excluding header & footer) must be <= 64 characters
    const bodyLines = lines.slice(1, -1);
    for (const line of bodyLines) {
      assert.ok(line.length <= 64, `Line exceeded 64 characters: ${line.length}`);
    }
  });

  test("1.4 normalizePrivateKey automatically repairs space-collapsed keys", () => {
    const collapsed = `-----BEGIN PRIVATE KEY----- ${sampleKeyBody} -----END PRIVATE KEY-----`;
    const normalized = normalizePrivateKey(collapsed);
    assert.ok(isPrivateKeyFormatValid(normalized));
  });

  test("1.5 normalizePrivateKey handles nested JSON input gracefully", () => {
    const jsonInput = JSON.stringify({
      type: "service_account",
      project_id: "test-proj",
      private_key: standardPem,
      client_email: "test@example.com",
    });
    const extracted = normalizePrivateKey(jsonInput);
    assert.ok(extracted.includes("-----BEGIN PRIVATE KEY-----"));
    assert.ok(isPrivateKeyFormatValid(extracted));
  });

  // --- SECTION 2: Error Sanitization & Privacy Redaction ---
  console.log("\n[SECTION 2: Error Sanitization & Data Masking]");

  const sanitizerMod = loadTsModule("src/lib/monitoring/error-sanitizer.ts");
  const {
    generateReferenceCode,
    sanitizeErrorMessage,
    sanitizeMetadata,
    sanitizeStackTrace,
  } = sanitizerMod;

  test("2.1 Reference codes follow ERR-[A-Z0-9]{8} specification", () => {
    const code1 = generateReferenceCode();
    const code2 = generateReferenceCode();
    assert.match(code1, /^ERR-[A-Z0-9]{8}$/);
    assert.match(code2, /^ERR-[A-Z0-9]{8}$/);
    assert.notStrictEqual(code1, code2);
  });

  test("2.2 Sensitive tokens and passwords are redacted from error messages", () => {
    // Construct an unsigned, synthetic JWT fixture; this is never a credential.
    const token = [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({ sub: "redaction-test-only" })).toString("base64url"),
      "test-signature",
    ].join(".");
    const raw = `Failed to authenticate with Bearer ${token} and secret apiKey=fixture-api-key and password=SuperSecretPassword123!`;
    const sanitized = sanitizeErrorMessage(raw);
    assert.ok(!sanitized.includes(token));
    assert.ok(!sanitized.includes("SuperSecretPassword123!"));
    assert.ok(sanitized.includes("[REDACTED_TOKEN]"));
    assert.ok(sanitized.includes("[REDACTED_SECRET]"));
  });

  test("2.3 PII (email, phone, credit card) is safely redacted from messages", () => {
    const raw = "Payment card 4111 2222 3333 4444 failed for principal.john@school.edu at +91 91182 45636";
    const sanitized = sanitizeErrorMessage(raw);
    assert.ok(!sanitized.includes("4111 2222 3333 4444"));
    assert.ok(!sanitized.includes("principal.john@school.edu"));
    assert.ok(sanitized.includes("[REDACTED_CARD]"));
    assert.ok(sanitized.includes("[REDACTED_EMAIL]"));
    assert.ok(sanitized.includes("[REDACTED_PHONE]"));
  });

  test("2.4 Absolute host file system paths are stripped from stack traces", () => {
    const stack = `Error: Something failed\n    at D:\\Coding\\school study\\School-study\\src\\app\\api\\route.ts:42:15\n    at /var/task/node_modules/next/server.js:100:20`;
    const cleaned = sanitizeStackTrace(stack);
    assert.ok(!cleaned.includes("D:\\Coding\\school study\\School-study\\"));
    assert.ok(cleaned.includes("[app]/src"));
    assert.ok(cleaned.includes("[task]/node_modules/next/server.js:100:20"));
  });

  test("2.5 Sensitive keys inside metadata objects are redacted", () => {
    const meta = {
      user: "admin",
      password: "secret_password",
      authorization: "Bearer 12345",
      serviceAccount: standardPem,
      nested: {
        privateKey: "private_value",
        safeValue: 42,
      },
    };
    const sanitized = sanitizeMetadata(meta);
    assert.strictEqual(sanitized.password, "[REDACTED]");
    assert.strictEqual(sanitized.authorization, "[REDACTED]");
    assert.strictEqual(sanitized.serviceAccount.trim(), "[REDACTED_PRIVATE_KEY]");
    assert.strictEqual(sanitized.nested.privateKey, "[REDACTED]");
    assert.strictEqual(sanitized.nested.safeValue, 42);
  });

  // --- SECTION 3: Fingerprinting & Deduplication ---
  console.log("\n[SECTION 3: Fingerprinting & Incident Deduplication]");

  const fingerprintMod = loadTsModule("src/lib/monitoring/error-fingerprint.ts");
  const {
    generateErrorFingerprint,
    generateIncidentTitle,
  } = fingerprintMod;

  test("3.1 Fingerprint is deterministic across different timestamps and request IDs", () => {
    const fp1 = generateErrorFingerprint({
      errorCode: "ADMIN_AUTH_NOT_CONFIGURED",
      module: "school-registration",
      operation: "admin_init",
      message: "Firebase Admin SDK is not configured for registration.",
    });

    const fp2 = generateErrorFingerprint({
      errorCode: "ADMIN_AUTH_NOT_CONFIGURED",
      module: "school-registration",
      operation: "admin_init",
      message: "Firebase Admin SDK is not configured for registration.",
    });

    assert.strictEqual(fp1, fp2);
    assert.match(fp1, /^fp_[a-f0-9]{16}$/);
  });

  test("3.2 Different error codes generate distinct fingerprints", () => {
    const fp1 = generateErrorFingerprint({
      errorCode: "ADMIN_AUTH_NOT_CONFIGURED",
      module: "school-registration",
      operation: "admin_init",
    });

    const fp2 = generateErrorFingerprint({
      errorCode: "STUDENT_DELETE_FAILED",
      module: "student-management",
      operation: "delete_student",
    });

    assert.notStrictEqual(fp1, fp2);
  });

  test("3.3 Incident title generator formats human-readable titles", () => {
    const title = generateIncidentTitle({
      errorCode: "ADMIN_AUTH_NOT_CONFIGURED",
      module: "school-registration",
      operation: "admin_init",
    });
    assert.strictEqual(title, "[school-registration] admin_init: ADMIN_AUTH_NOT_CONFIGURED");
  });

  // --- SECTION 4: Storage & Aggregation Engine ---
  console.log("\n[SECTION 4: Aggregation Engine & Telemetry]");

  const storageMod = loadTsModule("src/lib/monitoring/error-storage.ts");
  const {
    recordErrorEvent,
    getIncidents,
    getIncidentById,
    updateIncident,
    getMonitoringStats,
  } = storageMod;

  await asyncTest("4.1 Aggregation engine groups identical fingerprints into single incident", async () => {
    const event1 = {
      eventId: "ev_test_1",
      referenceCode: "ERR-TEST0001",
      fingerprint: "fp_test_aggregation",
      errorCode: "DATABASE_CONNECTION_TIMEOUT",
      message: "Database timed out",
      severity: "critical",
      category: "database",
      module: "storage",
      operation: "query",
      occurredAt: new Date().toISOString(),
      environment: "test",
      version: "3.0.0",
      httpStatus: 504,
    };

    const event2 = {
      ...event1,
      eventId: "ev_test_2",
      referenceCode: "ERR-TEST0002",
      occurredAt: new Date(Date.now() + 1000).toISOString(),
    };

    const res1 = await recordErrorEvent(event1, "Database Connection Timeout");
    const res2 = await recordErrorEvent(event2, "Database Connection Timeout");

    assert.strictEqual(res1.incidentId, res2.incidentId);

    const inc = await getIncidentById(res1.incidentId);
    assert.ok(inc);
    assert.strictEqual(inc.occurrences, 2);
    assert.strictEqual(inc.sampleEvents.length, 2);
  });

  await asyncTest("4.2 Incident status transitions work properly", async () => {
    const { incidents } = await getIncidents({ search: "Database" });
    assert.ok(incidents.length > 0);
    const id = incidents[0].id;

    const success1 = await updateIncident(id, {
      status: "investigating",
      noteText: "Engineer investigating DB replica",
      noteAuthor: "Lead SRE",
    });
    assert.ok(success1);
    const updated = await getIncidentById(id);
    assert.strictEqual(updated.status, "investigating");
    assert.ok(updated.investigationNotes && updated.investigationNotes.some((n) => n.text.includes("replica")));

    const success2 = await updateIncident(id, { status: "resolved", resolvedBy: "Lead SRE" });
    assert.ok(success2);
    const resolved = await getIncidentById(id);
    assert.strictEqual(resolved.status, "resolved");
    assert.ok(resolved.resolvedAt !== undefined);
  });

  await asyncTest("4.3 Telemetry metrics accurately compute totals and breakdown", async () => {
    const stats = await getMonitoringStats();
    assert.ok(stats.totalIncidents >= 1);
    assert.ok(stats.totalOccurrences >= 2);
    assert.ok(typeof stats.openIncidents === "number");
    assert.ok(typeof stats.severityBreakdown.critical === "number");
  });

  // --- SECTION 5: Alert Rules Engine & Cooldown ---
  console.log("\n[SECTION 5: Alert Rules Engine & Anti-Storm Cooldown]");

  const alertMod = loadTsModule("src/lib/monitoring/alert-engine.ts");
  const { evaluateAlerts } = alertMod;

  await asyncTest("5.1 Alert engine dispatches alerts for critical severity", async () => {
    const criticalEvent = {
      eventId: "ev_alert_test",
      referenceCode: "ERR-CRIT0001",
      fingerprint: "fp_critical_spike_test",
      errorCode: "PAYMENT_GATEWAY_DOWN",
      message: "Stripe connection failed",
      severity: "critical",
      category: "payment",
      module: "billing",
      operation: "checkout",
      occurredAt: new Date().toISOString(),
      environment: "production",
      version: "3.0.0",
      httpStatus: 502,
    };

    const res1 = await evaluateAlerts(criticalEvent, { occurrences: 1 });
    assert.ok(res1.triggered, "Critical event should trigger alert rule");
    assert.ok(res1.ruleNames.length > 0);

    // Second evaluation within cooldown window must be suppressed
    const res2 = await evaluateAlerts(criticalEvent, { occurrences: 2 });
    assert.strictEqual(res2.triggered, false, "Recurring critical event within cooldown must be suppressed");
  });

  // --- SECTION 6: Error Capture & Handlers ---
  console.log("\n[SECTION 6: Central Error Capture Engine]");

  const captureMod = loadTsModule("src/lib/monitoring/error-capture.ts");
  const {
    captureServerException,
    captureClientError,
  } = captureMod;

  await asyncTest("6.1 captureServerException returns referenceCode and fingerprint safely", async () => {
    const res = await captureServerException(new Error("Unexpected internal crash"), {
      module: "auth",
      operation: "token_verify",
      severity: "high",
    });

    assert.ok(res.referenceCode.startsWith("ERR-"));
    assert.ok(res.fingerprint.startsWith("fp_"));
  });

  await asyncTest("6.2 captureClientError ingests browser errors safely", async () => {
    const res = await captureClientError({
      message: "Uncaught TypeError: Cannot read property 'map' of undefined",
      module: "student-table",
      operation: "render",
      route: "/admin/students",
      stack: "TypeError: Cannot read property 'map'\n at StudentTable.render (StudentTable.tsx:42)",
    });

    assert.ok(res.referenceCode.startsWith("ERR-"));
    assert.ok(res.fingerprint.startsWith("fp_"));
  });

  console.log("\n===============================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED           `);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
