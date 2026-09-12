/**
 * Automated Verification Suite for Ultra-Security Data Erase
 */
import { POST } from "../src/app/api/super-admin/ultra-security/route.ts";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING ULTRA-SECURITY & DATA ERASE SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Empty identifier lookup returns safe status 200 (not 404) with clear error
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "GET_CANDIDATE_PREVIEW",
        identifier: "   ",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 200 && json.success === false, "TEST 1: Empty identifier returns safe status 200 (no 404 red error)");
  }

  // TEST 2: Non-existent identifier returns safe status 200 (not 404) with user-friendly error
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "GET_CANDIDATE_PREVIEW",
        identifier: "completely_fake_non_existent_id_999",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 200 && json.success === false && json.error.includes("No user or school found"), "TEST 2: Non-existent ID returns status 200 with clean error");
  }

  // TEST 3: Invalid PIN code rejects erase attempt with status 403
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ERASE_SCHOOL",
        schoolId: "test_school_id",
        pin: "000000",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 403 && json.success === false, "TEST 3: Wrong Master PIN is rejected with 403 Forbidden");
  }

  // TEST 4: Missing target schoolId rejects with 400
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ERASE_SCHOOL",
        schoolId: "",
        pin: "630649",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 400 && json.success === false, "TEST 4: Missing schoolId returns 400 Bad Request");
  }

  // TEST 5: Factory Reset rejects without exact confirmation phrase
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ERASE_PORTAL_DATA",
        confirmationPhrase: "WRONG PHRASE",
        pin: "630649",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 400 && json.success === false, "TEST 5: Factory Reset rejects without exact confirmation phrase");
  }

  // TEST 6: Backward compatibility with GET_USER_PREVIEW
  {
    const req = new Request("http://localhost:3000/api/super-admin/ultra-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "GET_USER_PREVIEW",
        identifier: "test_candidate",
      }),
    });
    const res = await POST(req);
    assert(res.status === 200, "TEST 6: Backward compatible GET_USER_PREVIEW handled without error");
  }

  console.log("\n==================================================");
  console.log(`[RESULTS] Total Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
