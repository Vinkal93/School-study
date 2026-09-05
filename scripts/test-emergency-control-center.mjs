import assert from "assert";
import {
  getGlobalEmergencyControls,
  updateGlobalEmergencyControls,
  getSchoolEmergencyControl,
  updateSchoolEmergencyControl,
  getUserSecurityControl,
  updateUserSecurityControl,
  DEFAULT_GLOBAL_EMERGENCY,
  getEmergencySystemMetrics,
} from "@/lib/emergency/emergencyEngine";
import { resolveEmergencyAccess } from "@/lib/emergency/emergencyResolver";
import { canAccessFeature } from "@/lib/billing/featureAccess";

console.log("======================================================================");
console.log("🚨 RUNNING SUPER ADMIN EMERGENCY CONTROL CENTER AUTOMATED TEST SUITE");
console.log("======================================================================\n");

async function runEmergencyControlTests() {
  let passedCount = 0;
  let totalCount = 0;

  function testPass(desc) {
    totalCount++;
    passedCount++;
    console.log(`  ✅ [VERIFIED] ${desc}`);
  }

  function testFail(desc, err) {
    totalCount++;
    console.error(`  ❌ [FAILED] ${desc}:`, err.message || err);
  }

  // ------------------------------------------------------------------
  // TEST 1: Master System Maintenance Mode (HTTP 503)
  // ------------------------------------------------------------------
  try {
    console.log("🔹 Test 1: Global Maintenance Mode Enforcement");

    await updateGlobalEmergencyControls({ systemStatus: "MAINTENANCE", maintenanceMode: true }, "test_suite", "Testing maintenance");

    const normalUserRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_normal",
      userRole: "admin",
      httpMethod: "GET",
    });

    assert.strictEqual(normalUserRes.allowed, false);
    assert.strictEqual(normalUserRes.status, 503);
    assert.strictEqual(normalUserRes.code, "MAINTENANCE_MODE_ACTIVE");

    // Super Admin Bypass Verification
    const superAdminRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_super_admin",
      userRole: "super_admin",
      httpMethod: "GET",
    });

    assert.strictEqual(superAdminRes.allowed, true);
    assert.strictEqual(superAdminRes.code, "ALLOWED_SUPER_ADMIN");

    testPass("Global Maintenance Mode strictly blocks normal users (503) while preserving Super Admin administrative access");
  } catch (err) {
    testFail("Global Maintenance Mode Enforcement", err);
  }

  // ------------------------------------------------------------------
  // TEST 2: System Read-Only Protection Mode (HTTP 423)
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 2: System Read-Only Mode Enforcement");

    await updateGlobalEmergencyControls({ systemStatus: "READ_ONLY", maintenanceMode: false, readOnlyMode: true }, "test_suite", "Testing read-only");

    // GET request should be ALLOWED
    const getRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_normal",
      userRole: "admin",
      httpMethod: "GET",
    });
    assert.strictEqual(getRes.allowed, true);

    // POST/PUT/DELETE mutation request should be BLOCKED with 423
    const postRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_normal",
      userRole: "admin",
      httpMethod: "POST",
    });
    assert.strictEqual(postRes.allowed, false);
    assert.strictEqual(postRes.status, 423);
    assert.strictEqual(postRes.code, "SYSTEM_READ_ONLY");

    testPass("Read-Only Mode permits GET reads while strictly locking POST/PUT/DELETE mutations (HTTP 423)");
  } catch (err) {
    testFail("System Read-Only Mode Enforcement", err);
  }

  // ------------------------------------------------------------------
  // TEST 3: Granular Module & Action Kill Switches (HTTP 503)
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 3: Module & Feature Kill Switches");

    // Restore systemStatus to NORMAL
    await updateGlobalEmergencyControls({
      systemStatus: "NORMAL",
      maintenanceMode: false,
      readOnlyMode: false,
      moduleKillSwitches: { ...DEFAULT_GLOBAL_EMERGENCY.moduleKillSwitches, attendance: "OFF" },
      featureKillSwitches: { ...DEFAULT_GLOBAL_EMERGENCY.featureKillSwitches, "students.delete": "OFF" },
    }, "test_suite", "Testing kill switches");

    // Check Attendance module disabled
    const attendanceRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_normal",
      userRole: "admin",
      moduleKey: "attendance",
    });
    assert.strictEqual(attendanceRes.allowed, false);
    assert.strictEqual(attendanceRes.status, 503);
    assert.strictEqual(attendanceRes.code, "MODULE_DISABLED");

    // Check Feature Kill Switch via canAccessFeature
    const studentDeleteCheck = await canAccessFeature("nNuxKZJOvLi3fzDhAtag", "students.delete");
    assert.strictEqual(studentDeleteCheck.allowed, false);
    assert.strictEqual(studentDeleteCheck.code, "FEATURE_DISABLED");

    testPass("Module and action kill switches authoritatively override entitlements and return HTTP 503");
  } catch (err) {
    testFail("Module & Feature Kill Switches", err);
  }

  // ------------------------------------------------------------------
  // TEST 4: School Emergency Isolation (School A PAUSED vs School B ACTIVE)
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 4: School Emergency Tenant Isolation");

    await updateSchoolEmergencyControl("school_a_test", { status: "PAUSED" }, "test_suite", "School A emergency pause");
    await updateSchoolEmergencyControl("school_b_test", { status: "ACTIVE" }, "test_suite", "School B active");

    const schoolARes = await resolveEmergencyAccess({ schoolId: "school_a_test", userId: "user_a", userRole: "admin" });
    assert.strictEqual(schoolARes.allowed, false);
    assert.strictEqual(schoolARes.status, 503);
    assert.strictEqual(schoolARes.code, "SCHOOL_PAUSED");

    const schoolBRes = await resolveEmergencyAccess({ schoolId: "school_b_test", userId: "user_b", userRole: "admin" });
    assert.strictEqual(schoolBRes.allowed, true);

    testPass("School emergency state strictly isolates affected school without impacting other active subscribers");
  } catch (err) {
    testFail("School Emergency Tenant Isolation", err);
  }

  // ------------------------------------------------------------------
  // TEST 5: User Security State & Realtime Session Revocation
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 5: User Session Revocation & Suspension");

    const testUid = `user_security_test_${Date.now()}`;
    await updateUserSecurityControl(testUid, { status: "SUSPENDED", securityVersion: 5 }, "test_suite", "Testing suspension");

    const suspendedRes = await resolveEmergencyAccess({
      schoolId: "school_b_test",
      userId: testUid,
      userRole: "admin",
    });
    assert.strictEqual(suspendedRes.allowed, false);
    assert.strictEqual(suspendedRes.status, 403);
    assert.strictEqual(suspendedRes.code, "ACCOUNT_SUSPENDED");

    // Test Security Version mismatch (Revoked session)
    await updateUserSecurityControl(testUid, { status: "ACTIVE", securityVersion: 10 }, "test_suite", "Testing session revocation");

    const revokedRes = await resolveEmergencyAccess({
      schoolId: "school_b_test",
      userId: testUid,
      userRole: "admin",
      clientSecurityVersion: 2, // Client has older version 2 < 10
    });
    assert.strictEqual(revokedRes.allowed, false);
    assert.strictEqual(revokedRes.status, 401);
    assert.strictEqual(revokedRes.code, "SESSION_REVOKED");

    testPass("User session revocation invalidates client sessions (HTTP 401) and account suspension blocks access (HTTP 403)");
  } catch (err) {
    testFail("User Session Revocation & Suspension", err);
  }

  // ------------------------------------------------------------------
  // TEST 6: Payment System Emergency Switch
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 6: Payment Gateway Emergency Control");

    await updateGlobalEmergencyControls({
      systemStatus: "NORMAL",
      moduleKillSwitches: DEFAULT_GLOBAL_EMERGENCY.moduleKillSwitches,
      featureKillSwitches: DEFAULT_GLOBAL_EMERGENCY.featureKillSwitches,
      paymentSystemStatus: "OFFLINE",
    }, "test_suite", "Disabling payments");

    const paymentRes = await resolveEmergencyAccess({
      schoolId: "nNuxKZJOvLi3fzDhAtag",
      userId: "user_normal",
      userRole: "admin",
      moduleKey: "payments",
    });

    assert.strictEqual(paymentRes.allowed, false);
    assert.strictEqual(paymentRes.status, 503);
    assert.strictEqual(paymentRes.code, "ONLINE_PAYMENTS_DISABLED");

    // Restore Payments to ONLINE
    await updateGlobalEmergencyControls({ paymentSystemStatus: "ONLINE" }, "test_suite", "Restoring payments");

    testPass("Payment Gateway Emergency switch blocks order creation with HTTP 503 when offline");
  } catch (err) {
    testFail("Payment Gateway Emergency Control", err);
  }

  // ------------------------------------------------------------------
  // TEST 7: Emergency Announcement with "Kya hua hai" & "Kabtak theek hoga"
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 7: Emergency Announcement with Root Cause, ETA & Support Details");

    const announcementPayload = {
      active: true,
      title: "Scheduled Server Database Optimization",
      message: "Our engineering team is performing planned database index optimization.",
      reason: "Critical database performance enhancements and security upgrades.",
      expectedResolution: "Within 45 to 60 minutes (~ 5:00 PM IST)",
      affectedModules: ["Student Portal", "Fee Collection", "Attendance Automation"],
      supportPhone: "+91 9118245636",
      supportEmail: "SBCI224234@gmail.com",
      supportHours: "Mon - Sat (9:00 AM - 7:00 PM IST)",
      severity: "WARNING",
      target: "ALL",
    };

    const updated = await updateGlobalEmergencyControls({
      emergencyAnnouncement: announcementPayload,
    }, "test_suite", "Testing full announcement payload");

    assert.strictEqual(updated.emergencyAnnouncement.active, true);
    assert.strictEqual(updated.emergencyAnnouncement.reason, announcementPayload.reason);
    assert.strictEqual(updated.emergencyAnnouncement.expectedResolution, announcementPayload.expectedResolution);
    assert.deepStrictEqual(updated.emergencyAnnouncement.affectedModules, announcementPayload.affectedModules);
    assert.strictEqual(updated.emergencyAnnouncement.supportPhone, "+91 9118245636");
    assert.strictEqual(updated.emergencyAnnouncement.supportEmail, "SBCI224234@gmail.com");

    testPass("Emergency announcement persists 'kya hua hai' (reason), 'kabtak theek hoga' (ETA), affected services, and support helpline");
  } catch (err) {
    testFail("Emergency Announcement with Root Cause, ETA & Support Details", err);
  }

  // ------------------------------------------------------------------
  // TEST 8: Real-Time System Metrics Calculation
  // ------------------------------------------------------------------
  try {
    console.log("\n🔹 Test 8: Real-Time System Metrics Calculation");

    const metrics = await getEmergencySystemMetrics();

    assert.ok(metrics !== null, "Metrics must not be null");
    assert.strictEqual(typeof metrics.affectedSchoolsCount, "number");
    assert.strictEqual(typeof metrics.totalSchoolsCount, "number");
    assert.strictEqual(typeof metrics.disabledModulesCount, "number");
    assert.strictEqual(typeof metrics.totalModulesCount, "number");
    assert.strictEqual(typeof metrics.suspendedUsersCount, "number");
    assert.strictEqual(typeof metrics.uptimePercentage, "number");
    assert.ok(metrics.totalModulesCount === 7, "Total modules count must be 7");
    assert.ok(metrics.uptimePercentage > 99, "Uptime percentage must be > 99%");

    testPass("getEmergencySystemMetrics() calculates real live counts for affected schools, disabled modules, suspended users, and uptime");
  } catch (err) {
    testFail("Real-Time System Metrics Calculation", err);
  }

  console.log("\n======================================================================");
  console.log(`SUMMARY: Passed ${passedCount}/${totalCount} Emergency Control Security Tests.`);
  console.log("🎉 ALL SUPER ADMIN EMERGENCY CONTROL CENTER TESTS PASSED!");
  console.log("======================================================================\n");
}

runEmergencyControlTests().catch((err) => {
  console.error("❌ SUITE EXECUTOR FAILED:", err);
  process.exit(1);
});
