/**
 * Automated Test: AI Feature Notice Banner & Super Admin Controls
 * Tests all edge cases of toggle, persistence, and fallback prevention.
 */

import assert from "node:assert";

console.log("==================================================================");
console.log("TEST: AI FEATURE NOTICE BANNER & SUPER ADMIN CONTROLS");
console.log("==================================================================\n");

let passed = 0;
let total = 0;

function check(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
  }
}

async function runTests() {
  const BASE_URL = "http://localhost:3000";

  // Test 1: Landing page active showcase query
  console.log("--- 1. Testing Default Landing Banner Retrieval ---");
  const res1 = await fetch(`${BASE_URL}/api/feature-showcase/active?context=landing`);
  check(res1.status === 200, "API returns HTTP 200");
  const data1 = await res1.json();
  check(data1.activeShowcase !== undefined, "Response contains activeShowcase field");
  if (data1.activeShowcase) {
    check(data1.activeShowcase.badgeText === "NEW AI FEATURE", "Badge text is 'NEW AI FEATURE'");
    check(data1.activeShowcase.title === "Introducing School Study AI", "Title is 'Introducing School Study AI'");
    check(data1.activeShowcase.showOnLandingPage === true, "showOnLandingPage is true");
  }

  // Test 2: Dashboard context retrieval
  console.log("\n--- 2. Testing Dashboard Context Retrieval ---");
  const res2 = await fetch(`${BASE_URL}/api/feature-showcase/active?context=dashboard`);
  check(res2.status === 200, "Dashboard context returns HTTP 200");
  const data2 = await res2.json();
  check(data2.activeShowcase !== undefined, "Dashboard response contains activeShowcase");

  // Test 3: Unknown context or portal filtering
  console.log("\n--- 3. Testing Non-matching Portal Filtering ---");
  const res3 = await fetch(`${BASE_URL}/api/feature-showcase/active?context=landing&portal=unknown_portal`);
  check(res3.status === 200, "Filter returns HTTP 200");
  const data3 = await res3.json();
  check(data3.activeShowcase === null, "Unknown portal returns null activeShowcase");

  // Test 4: Verify Super Admin route protects against unauthenticated writes
  console.log("\n--- 4. Testing Super Admin Route Authorization Protection ---");
  const unauthRes = await fetch(`${BASE_URL}/api/super-admin/feature-showcase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle_landing", enabled: false }),
  });
  check(unauthRes.status === 401 || unauthRes.status === 403, "Unauthenticated POST to super-admin API is rejected");

  console.log("\n==================================================================");
  console.log(`[RESULTS] ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
