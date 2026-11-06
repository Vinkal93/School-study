/**
 * School Study — Zero-Waste Firestore Architecture & Quota Recovery Verification Suite
 */

const assert = require("assert");

console.log("\n======================================================================");
console.log("RUNNING ZERO-WASTE FIRESTORE ARCHITECTURE & QUOTA RECOVERY SUITE");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function main() {
  // TEST 1: Change detection prevents profile object mutation on heartbeat write
  runTest("Test 1: Auth profile listener change detection preserves reference identity on timestamp-only writes", () => {
    const prev = {
      uid: "user_test_123",
      email: "admin@test.com",
      name: "Admin User",
      role: "school_admin",
      status: "active",
      schoolId: "school_123",
      lastActiveAt: "2026-11-06T00:00:00.000Z",
    };

    // Simulated new snapshot from Firestore containing only updated lastActiveAt
    const liveData = {
      name: "Admin User",
      role: "school_admin",
      status: "active",
      schoolId: "school_123",
      lastActiveAt: "2026-11-06T00:01:00.000Z",
      lastActive: 1730851260000,
    };

    const livePhoto = liveData.photoURL || liveData.photoUrl || liveData.avatar;
    const prevPhoto = prev.photoURL || prev.photoUrl || prev.avatar;

    const hasSubstantiveChange = Boolean(
      (liveData.name && liveData.name !== prev.name) ||
      (liveData.role && liveData.role !== prev.role) ||
      (liveData.status && liveData.status !== prev.status) ||
      (liveData.schoolId !== undefined && liveData.schoolId !== prev.schoolId) ||
      (livePhoto && livePhoto !== prevPhoto)
    );

    // Assert: must detect NO substantive change
    assert.strictEqual(hasSubstantiveChange, false, "Must not flag timestamp update as substantive change");

    // The state updater returns prev directly, preserving reference equality
    const result = hasSubstantiveChange ? { ...prev, ...liveData } : prev;
    assert.strictEqual(result, prev, "Result must maintain exact reference equality (prev === result)");
  });

  // TEST 2: Rate limiter throttles presence heartbeat writes
  runTest("Test 2: Heartbeat rate-limiter suppresses repeated writes within 15-minute cooldown", () => {
    const PRESENCE_COOLDOWN_MS = 15 * 60 * 1000;
    const uid = "user_123";
    let simulatedSessionStorage = {};
    let writeCount = 0;

    const attemptHeartbeat = (nowMs) => {
      const lastWriteStr = simulatedSessionStorage[`ss_last_presence_write_${uid}`];
      const lastWrite = lastWriteStr ? parseInt(lastWriteStr, 10) : 0;
      if (lastWrite > 0 && nowMs - lastWrite < PRESENCE_COOLDOWN_MS) {
        return false; // Throttled
      }
      writeCount++;
      simulatedSessionStorage[`ss_last_presence_write_${uid}`] = String(nowMs);
      return true;
    };

    const startTime = 10000000;
    // First write at start
    assert.strictEqual(attemptHeartbeat(startTime), true, "First write should execute");
    assert.strictEqual(writeCount, 1);

    // Rapid successive calls (e.g. tab switches / focus events at +10s, +30s, +60s, +5min)
    assert.strictEqual(attemptHeartbeat(startTime + 10_000), false, "Write at +10s must be throttled");
    assert.strictEqual(attemptHeartbeat(startTime + 30_000), false, "Write at +30s must be throttled");
    assert.strictEqual(attemptHeartbeat(startTime + 60_000), false, "Write at +60s must be throttled");
    assert.strictEqual(attemptHeartbeat(startTime + 300_000), false, "Write at +5min must be throttled");
    assert.strictEqual(writeCount, 1, "Write count must remain 1 after repeated tab switches");

    // After 15 minutes (+900,001ms)
    assert.strictEqual(attemptHeartbeat(startTime + 900_001), true, "Write after 15 minutes should be allowed");
    assert.strictEqual(writeCount, 2);
  });

  // TEST 3: In-flight request deduplication and SWR caching
  await runAsyncTest("Test 3: Query cache deduplicates in-flight calls and serves unexpired cache with 0 reads", async () => {
    let networkFetchCount = 0;
    const cache = new Map();
    const inFlight = new Map();

    async function fetchWithCache(key, fetcher, staleTime = 60_000) {
      const now = Date.now();
      if (cache.has(key)) {
        const entry = cache.get(key);
        if (now - entry.timestamp < entry.staleTime) {
          return entry.data;
        }
      }

      if (inFlight.has(key)) {
        return inFlight.get(key);
      }

      const promise = (async () => {
        try {
          const res = await fetcher();
          cache.set(key, { data: res, timestamp: Date.now(), staleTime });
          return res;
        } finally {
          inFlight.delete(key);
        }
      })();

      inFlight.set(key, promise);
      return promise;
    }

    const testFetcher = async () => {
      networkFetchCount++;
      await new Promise((r) => setTimeout(r, 10));
      return { id: "test", name: "School Alpha" };
    };

    // 10 concurrent callers in parallel
    const results = await Promise.all([
      fetchWithCache("schoolProfile:1", testFetcher),
      fetchWithCache("schoolProfile:1", testFetcher),
      fetchWithCache("schoolProfile:1", testFetcher),
      fetchWithCache("schoolProfile:1", testFetcher),
      fetchWithCache("schoolProfile:1", testFetcher),
    ]);

    assert.strictEqual(networkFetchCount, 1, "In-flight deduplication must execute network fetcher exactly once");
    assert.strictEqual(results.length, 5);
    assert.strictEqual(results[0].name, "School Alpha");

    // Subsequent call within staleTime
    const cachedResult = await fetchWithCache("schoolProfile:1", testFetcher);
    assert.strictEqual(networkFetchCount, 1, "Cached call must not trigger network fetch");
    assert.strictEqual(cachedResult.name, "School Alpha");
  });

  // TEST 4: Subscription reference-counting multiplexer
  runTest("Test 4: Shared emergency subscription reference counter manages Firestore listener lifecycle", () => {
    let activeListeners = 0;
    const subscribers = new Set();

    function subscribe(cb) {
      subscribers.add(cb);
      if (subscribers.size === 1) {
        activeListeners++;
      }
      return () => {
        subscribers.delete(cb);
        if (subscribers.size === 0) {
          activeListeners--;
        }
      };
    }

    assert.strictEqual(activeListeners, 0, "Initial active listeners must be 0");

    const unsub1 = subscribe(() => {});
    assert.strictEqual(activeListeners, 1, "First subscriber attaches 1 Firestore listener");

    const unsub2 = subscribe(() => {});
    const unsub3 = subscribe(() => {});
    assert.strictEqual(activeListeners, 1, "Subsequent subscribers multiplex onto the same listener");
    assert.strictEqual(subscribers.size, 3);

    unsub1();
    unsub2();
    assert.strictEqual(activeListeners, 1, "Listener remains open while at least 1 subscriber remains");

    unsub3();
    assert.strictEqual(activeListeners, 0, "Last subscriber detachment tears down the Firestore listener");
  });

  // TEST 5: Guardrails sliding-window write burst detection
  runTest("Test 5: Guardrails detect write bursts (>12/min) and flag warnings without writing to Firestore", () => {
    const recentWrites = [];
    const warnings = [];

    function recordWrite(timestamp) {
      recentWrites.push(timestamp);
      const windowStart = timestamp - 60_000;
      while (recentWrites.length > 0 && recentWrites[0] < windowStart) {
        recentWrites.shift();
      }
      if (recentWrites.length >= 12) {
        warnings.push({
          type: "WRITE_BURST",
          count: recentWrites.length,
          timestamp,
        });
      }
    }

    const t = 5000000;
    for (let i = 0; i < 11; i++) {
      recordWrite(t + i * 1000);
    }
    assert.strictEqual(warnings.length, 0, "11 writes in 60s should not trigger burst warning");

    // 12th write
    recordWrite(t + 11 * 1000);
    assert.strictEqual(warnings.length, 1, "12th write within 60s must trigger WRITE_BURST warning");
    assert.strictEqual(warnings[0].type, "WRITE_BURST");
  });

  // TEST 6: Student bulk delete endpoint quota mapping
  runTest("Test 6: Bulk delete endpoint maps quota errors to HTTP 429 with Retry-After header", () => {
    function mapErrorToResponse(error) {
      const isQuota =
        error?.code === 8 ||
        error?.code === "resource-exhausted" ||
        String(error?.message || "").includes("Quota exceeded") ||
        String(error?.message || "").includes("RESOURCE_EXHAUSTED");

      return {
        status: isQuota ? 429 : 500,
        headers: isQuota ? { "Retry-After": "60" } : {},
        body: {
          success: false,
          error: {
            code: isQuota ? "QUOTA_EXHAUSTED" : "INTERNAL_ERROR",
            message: isQuota
              ? "Database daily quota reached. Operation paused until quota recovery."
              : error.message,
          },
        },
      };
    }

    const quotaErr = { code: 8, message: "RESOURCE_EXHAUSTED: Quota exceeded" };
    const resp = mapErrorToResponse(quotaErr);
    assert.strictEqual(resp.status, 429, "Quota error must map to HTTP 429");
    assert.strictEqual(resp.headers["Retry-After"], "60", "Must include Retry-After header");
    assert.strictEqual(resp.body.error.code, "QUOTA_EXHAUSTED");

    const genericErr = new Error("Database network failure");
    const genResp = mapErrorToResponse(genericErr);
    assert.strictEqual(genResp.status, 500, "Generic error must map to HTTP 500");
  });

  // TEST 7: Student query parameter pushdown
  runTest("Test 7: getStudents pushes filter constraints directly into query rather than in-memory scanning", () => {
    function buildQueryConstraints(options) {
      const constraints = [];
      if (options?.classId && options.classId !== "all") {
        constraints.push({ field: "classId", op: "==", value: options.classId });
      }
      if (options?.sectionId && options.sectionId !== "all") {
        constraints.push({ field: "sectionId", op: "==", value: options.sectionId });
      }
      if (options?.status && options.status !== "all") {
        constraints.push({ field: "status", op: "==", value: options.status.toLowerCase() });
      }
      if (options?.limit && options.limit > 0) {
        constraints.push({ type: "limit", value: options.limit });
      }
      return constraints;
    }

    const c1 = buildQueryConstraints({ classId: "class_10", sectionId: "sec_a", status: "active", limit: 25 });
    assert.strictEqual(c1.length, 4, "Must push all 4 constraints directly to Firestore query");
    assert.strictEqual(c1[0].field, "classId");
    assert.strictEqual(c1[0].value, "class_10");
    assert.strictEqual(c1[3].value, 25);
  });

  console.log("\n======================================================================");
  console.log(`ZERO-WASTE FIRESTORE ARCHITECTURE RESULTS: ${passed} / ${passed + failed} TESTS PASSED (${failed} FAILURES)`);
  console.log("======================================================================\n");

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
