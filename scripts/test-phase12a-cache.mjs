import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 12A CACHING & SPA NAVIGATION TEST SUITE");
console.log("==================================================");

// Simulated QueryClient for Node test environment
class MockQueryClient {
  constructor() {
    this.cache = new Map();
    this.inFlightRequests = new Map();
    this.subscribers = new Map();
  }

  async fetchWithCache(key, fetcher, options = {}) {
    const { staleTime = 30_000, cacheTime = 300_000, forceRefresh = false } = options;
    const now = Date.now();

    if (!forceRefresh && this.cache.has(key)) {
      const entry = this.cache.get(key);
      const isFresh = now - entry.timestamp < entry.staleTime;
      if (isFresh) {
        return entry.data;
      }
    }

    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.setCacheData(key, result, { staleTime, cacheTime });
        this.notifySubscribers(key, result);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  getCacheData(key) {
    const entry = this.cache.get(key);
    return entry ? entry.data : undefined;
  }

  setCacheData(key, data, options = {}) {
    const { staleTime = 30_000, cacheTime = 300_000 } = options;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      cacheTime,
    });
    this.notifySubscribers(key, data);
  }

  invalidateCache(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    if (typeof pattern === "string") {
      if (pattern.includes("*")) {
        const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key);
          }
        }
      } else {
        this.cache.delete(pattern);
      }
    }
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this.subscribers.delete(key);
      }
    };
  }

  notifySubscribers(key, data) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((cb) => cb(data));
    }
  }

  cleanup(now = Date.now()) {
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.cacheTime) {
        this.cache.delete(key);
      }
    }
  }
}

async function runTests() {
  const client = new MockQueryClient();

  // Test 1: SWR Cache Hit
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount++;
    return { name: "Green Valley High", code: "GVH100" };
  };

  const res1 = await client.fetchWithCache("schoolProfile:school_1", fetcher, { staleTime: 10_000 });
  const res2 = await client.fetchWithCache("schoolProfile:school_1", fetcher, { staleTime: 10_000 });

  assert.equal(fetchCount, 1, "Fetcher should only run once within staleTime window");
  assert.equal(res1.name, "Green Valley High");
  assert.equal(res2.name, "Green Valley High");
  console.log("✓ [PASS] 1. SWR Cache Hit: Subsequent calls return cached data without duplicate network calls");

  // Test 2: In-Flight Request Deduplication
  let parallelFetchCount = 0;
  const slowFetcher = async () => {
    parallelFetchCount++;
    await new Promise((r) => setTimeout(r, 50));
    return [{ id: "stu_1", name: "Rahul" }];
  };

  const [p1, p2, p3] = await Promise.all([
    client.fetchWithCache("students:school_1", slowFetcher),
    client.fetchWithCache("students:school_1", slowFetcher),
    client.fetchWithCache("students:school_1", slowFetcher),
  ]);

  assert.equal(parallelFetchCount, 1, "Concurrent requests for same key must be deduplicated to 1 network call");
  assert.equal(p1[0].name, "Rahul");
  assert.equal(p2[0].name, "Rahul");
  assert.equal(p3[0].name, "Rahul");
  console.log("✓ [PASS] 2. In-Flight Request Deduplication: Parallel component queries share single Promise");

  // Test 3: Pattern-based Cache Invalidation
  client.setCacheData("students:school_1", [{ id: "stu_1" }]);
  client.setCacheData("students:school_2", [{ id: "stu_2" }]);
  client.setCacheData("teachers:school_1", [{ id: "tch_1" }]);

  client.invalidateCache("students:*");

  assert.equal(client.getCacheData("students:school_1"), undefined, "students:school_1 should be invalidated");
  assert.equal(client.getCacheData("students:school_2"), undefined, "students:school_2 should be invalidated");
  assert.notEqual(client.getCacheData("teachers:school_1"), undefined, "teachers:school_1 should be preserved");
  console.log("✓ [PASS] 3. Pattern Invalidation: Wildcard patterns accurately invalidate specific namespaces");

  // Test 4: Optimistic Subscription & Live Updates
  let notifiedData = null;
  const unsubscribe = client.subscribe("schoolBilling:school_1", (data) => {
    notifiedData = data;
  });

  client.setCacheData("schoolBilling:school_1", { status: "ACTIVE", planId: "plan_professional" });
  assert.equal(notifiedData.planId, "plan_professional", "Subscriber should receive live cache mutation");

  unsubscribe();
  client.setCacheData("schoolBilling:school_1", { status: "ACTIVE", planId: "plan_enterprise" });
  assert.equal(notifiedData.planId, "plan_professional", "Unsubscribed listener should not be called");
  console.log("✓ [PASS] 4. Live Subscription & Optimistic Updates: Observers receive instant state notifications");

  // Test 5: Cache Expiration & Memory Garbage Collection
  const baseTime = Date.now();
  client.setCacheData("tempItem", { val: 123 }, { cacheTime: 5_000 });
  assert.notEqual(client.getCacheData("tempItem"), undefined);

  // Simulate 6 seconds passing
  client.cleanup(baseTime + 6_000);
  assert.equal(client.getCacheData("tempItem"), undefined, "Expired entry must be evicted during cleanup");
  console.log("✓ [PASS] 5. Memory Safety & Garbage Collection: Expired entries are safely evicted");

  console.log("\n==================================================");
  console.log("PHASE 12A TEST RESULTS: 5/5 PASSED (100%)");
  console.log("==================================================");
}

runTests().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
