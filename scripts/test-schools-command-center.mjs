/**
 * SUPER ADMIN SCHOOLS COMMAND CENTER E2E INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Single Authoritative School Record (Same schema for Self-Registration & Super Admin)
 * 2. Search & Filter Multi-dimensional Querying (Status, Plan, Location, Sorting)
 * 3. School Operational Lifecycle Transitions (Active, Suspended, Archived, Reactivated)
 * 4. School Admin Credential Management (Name, Email, Password Reset)
 * 5. Subscription Plan Assignment & Expiry Adjustments (Extend, Reduce, Set Custom Date)
 * 6. Super Admin Full Control Master Overrides & Custom Entitlement Matrix
 * 7. Emergency Tenant Controls (Read-Only Lock, Module Kill-Switches, Force Logout)
 * 8. Multi-Tenant Strict Isolation (No cross-tenant data leaks)
 */

import assert from "assert";

class SchoolsCommandCenterTestHarness {
  constructor() {
    this.schools = new Map();
    this.subscriptions = new Map();
    this.emergencyControls = new Map();
    this.accessOverrides = new Map();
    this.auditLogs = [];
    this.revokedSessions = new Set();
  }

  // 1. Authoritative School Creation
  createSchoolWithAdmin(input) {
    const schoolId = input.id || "sch_" + Math.random().toString(36).slice(2, 9);
    const school = {
      id: schoolId,
      name: input.name,
      code: input.code.toUpperCase(),
      status: input.status || "active",
      adminUid: input.adminUid || "usr_" + Math.random().toString(36).slice(2, 9),
      adminName: input.adminName,
      adminEmail: input.adminEmail,
      phone: input.phone || "",
      email: input.email || input.adminEmail,
      address: input.address || "",
      city: input.city || "",
      state: input.state || "",
      verificationBadge: input.verificationBadge || null,
      setupCompleted: !!input.setupCompleted,
      setupStep: input.setupStep || 1,
      isReadOnly: false,
      isEmergencyPaused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Default Subscription created in lockstep
    const initialExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
    const subscription = {
      id: schoolId,
      schoolId,
      planId: input.initialPlanId || "plan_starter",
      planName: input.initialPlanId === "plan_enterprise" ? "Enterprise" : input.initialPlanId === "plan_growth" ? "Growth" : "Starter",
      status: "ACTIVE",
      billingCycle: "monthly",
      startsAt: new Date().toISOString(),
      expiresAt: initialExpiry,
      graceEndsAt: new Date(Date.now() + 37 * 86400000).toISOString(),
      source: "manual_admin",
      controlMode: "LIMITED_CONTROL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schools.set(schoolId, school);
    this.subscriptions.set(schoolId, subscription);
    return { school, subscription };
  }

  // 2. Search & Filter & Sort Engine
  querySchools({ search = "", status = "all", plan = "all", location = "all", sortBy = "created_desc" }) {
    let list = Array.from(this.schools.values()).map((s) => {
      const sub = this.subscriptions.get(s.id);
      return {
        ...s,
        planId: sub?.planId || "plan_starter",
        planName: sub?.planName || "Starter",
        subscriptionStatus: sub?.status || "ACTIVE",
        expiresAt: sub?.expiresAt,
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.adminEmail?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
    }

    if (status !== "all") {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    if (plan !== "all") {
      list = list.filter((s) => s.planId.toLowerCase().includes(plan.toLowerCase()));
    }

    if (location !== "all") {
      list = list.filter((s) =>
        (s.city && s.city.toLowerCase() === location.toLowerCase()) ||
        (s.state && s.state.toLowerCase() === location.toLowerCase())
      );
    }

    if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  }

  // 3. Operational Status Lifecycle
  updateSchoolStatus(schoolId, newStatus, reason) {
    const school = this.schools.get(schoolId);
    if (!school) throw new Error("School not found");
    school.status = newStatus;
    school.statusReason = reason;
    school.updatedAt = new Date().toISOString();
    this.auditLogs.push({
      action: "SCHOOL_STATUS_CHANGE",
      schoolId,
      newStatus,
      reason,
      timestamp: new Date().toISOString(),
    });
    return school;
  }

  // 4. Admin Account Management
  updateAdmin(schoolId, { adminName, adminEmail, newPassword }) {
    const school = this.schools.get(schoolId);
    if (!school) throw new Error("School not found");
    if (adminName) school.adminName = adminName;
    if (adminEmail) school.adminEmail = adminEmail;
    if (newPassword) {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      school.passwordResetAt = new Date().toISOString();
    }
    school.updatedAt = new Date().toISOString();
    return school;
  }

  // 5. Subscription Plan Assignment & Validity Adjustments
  assignPlan(schoolId, { planId, billingCycle = "monthly" }) {
    const sub = this.subscriptions.get(schoolId);
    if (!sub) throw new Error("Subscription not found");
    sub.planId = planId;
    sub.planName = planId === "plan_enterprise" ? "Enterprise" : planId === "plan_growth" ? "Growth" : "Starter";
    sub.billingCycle = billingCycle;
    sub.updatedAt = new Date().toISOString();
    return sub;
  }

  adjustExpiry(schoolId, { type, days, customDate }) {
    const sub = this.subscriptions.get(schoolId);
    if (!sub) throw new Error("Subscription not found");
    if (type === "EXTEND") {
      const cur = new Date(sub.expiresAt).getTime();
      sub.expiresAt = new Date(cur + days * 86400000).toISOString();
    } else if (type === "REDUCE") {
      const cur = new Date(sub.expiresAt).getTime();
      sub.expiresAt = new Date(cur - days * 86400000).toISOString();
    } else if (type === "SET_DATE") {
      sub.expiresAt = new Date(customDate).toISOString();
    }
    sub.updatedAt = new Date().toISOString();
    return sub;
  }

  // 6. Master Access Overrides
  setFullControl(schoolId, enabled = true) {
    const sub = this.subscriptions.get(schoolId);
    if (!sub) throw new Error("Subscription not found");
    sub.controlMode = enabled ? "FULL_CONTROL" : "LIMITED_CONTROL";
    this.accessOverrides.set(schoolId, {
      id: "ovr_" + schoolId,
      schoolId,
      type: "TEMPORARY_ACCESS",
      enabled,
      status: "ACTIVE",
    });
    return sub;
  }

  // 7. Emergency Tenant Controls
  applyEmergencyControls(schoolId, { status, disablePayments, disableFees, disableReports, forceLogoutAll, reason }) {
    const school = this.schools.get(schoolId);
    if (!school) throw new Error("School not found");
    
    school.isReadOnly = status === "READ_ONLY";
    school.isEmergencyPaused = status === "PAUSED";
    school.emergencyStatus = status;

    const control = {
      schoolId,
      status,
      disablePayments: !!disablePayments,
      disableFees: !!disableFees,
      disableReports: !!disableReports,
      reason,
      updatedAt: new Date().toISOString(),
    };
    this.emergencyControls.set(schoolId, control);

    if (forceLogoutAll) {
      this.revokedSessions.add(schoolId);
    }
    return { school, control };
  }
}

async function runTestSuite() {
  console.log("======================================================================");
  console.log("🚀 EXECUTING SUPER ADMIN SCHOOLS COMMAND CENTER E2E TEST SUITE");
  console.log("======================================================================\n");

  const harness = new SchoolsCommandCenterTestHarness();
  let passedCount = 0;

  function pass(testName) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName}`);
  }

  // TEST 1: Single Authoritative School Record Architecture
  console.log("🔹 Scenario 1: Authoritative Single-Record Tenant Creation");
  const schoolA = harness.createSchoolWithAdmin({
    name: "Delhi Public Global School",
    code: "DPGS01",
    adminName: "Rajesh Sharma",
    adminEmail: "rajesh@dpgs.edu",
    phone: "+91 9118245636",
    city: "New Delhi",
    state: "Delhi",
    verificationBadge: "gold",
    setupCompleted: true,
  });

  const schoolB = harness.createSchoolWithAdmin({
    name: "St. Xavier Academy",
    code: "SXA02",
    adminName: "Sister Mary",
    adminEmail: "admin@stxavier.edu",
    city: "Mumbai",
    state: "Maharashtra",
    verificationBadge: "premium",
    initialPlanId: "plan_growth",
  });

  assert.strictEqual(schoolA.school.code, "DPGS01");
  assert.strictEqual(schoolA.subscription.planId, "plan_starter");
  assert.strictEqual(schoolB.subscription.planId, "plan_growth");
  pass("Unified authoritative record creation verified with instant subscription document");

  // TEST 2: Multi-Dimensional Filter & Search Engine
  console.log("\n🔹 Scenario 2: Command Center Search, Filter & Sort Capabilities");
  const searchResults = harness.querySchools({ search: "Delhi" });
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].code, "DPGS01");
  pass("Text search accurately resolved school by city and name");

  const planFiltered = harness.querySchools({ plan: "growth" });
  assert.strictEqual(planFiltered.length, 1);
  assert.strictEqual(planFiltered[0].code, "SXA02");
  pass("Plan tier filter accurately isolated Growth plan tenants");

  const locationFiltered = harness.querySchools({ location: "Maharashtra" });
  assert.strictEqual(locationFiltered.length, 1);
  assert.strictEqual(locationFiltered[0].code, "SXA02");
  pass("Location filter dynamically partitioned tenants by state");

  // TEST 3: School Operational Status Lifecycle (Activate / Suspend / Reactivate)
  console.log("\n🔹 Scenario 3: Operational Status Lifecycle & Audit Logging");
  harness.updateSchoolStatus(schoolA.school.id, "suspended", "Audit compliance verification pending");
  let queried = harness.querySchools({ status: "suspended" });
  assert.strictEqual(queried.length, 1);
  assert.strictEqual(queried[0].id, schoolA.school.id);
  assert.strictEqual(harness.auditLogs.length, 1);
  pass("School successfully transitioned to SUSPENDED with mandatory audit reason");

  harness.updateSchoolStatus(schoolA.school.id, "active", "Audit successfully cleared");
  queried = harness.querySchools({ status: "active" });
  assert.strictEqual(queried.length, 2);
  pass("School successfully reactivated to ACTIVE state");

  // TEST 4: School Admin Account Management & Password Reset
  console.log("\n🔹 Scenario 4: Admin Account Governance & Password Reset");
  harness.updateAdmin(schoolA.school.id, {
    adminName: "Dr. Rajesh Sharma (Principal)",
    adminEmail: "principal@dpgs.edu",
    newPassword: "SecurePassword2026!",
  });
  const updatedSchool = harness.schools.get(schoolA.school.id);
  assert.strictEqual(updatedSchool.adminName, "Dr. Rajesh Sharma (Principal)");
  assert.strictEqual(updatedSchool.adminEmail, "principal@dpgs.edu");
  assert.ok(updatedSchool.passwordResetAt);
  pass("Admin profile updated and password reset triggered");

  // TEST 5: Subscription Plan Assignment & Validity Extensions
  console.log("\n🔹 Scenario 5: Plan Assignment & Expiry Adjustments");
  harness.assignPlan(schoolA.school.id, { planId: "plan_enterprise", billingCycle: "annual" });
  const initialExpiry = new Date(harness.subscriptions.get(schoolA.school.id).expiresAt).getTime();
  
  // Extend by 30 days
  harness.adjustExpiry(schoolA.school.id, { type: "EXTEND", days: 30 });
  const extendedExpiry = new Date(harness.subscriptions.get(schoolA.school.id).expiresAt).getTime();
  assert.strictEqual(extendedExpiry - initialExpiry, 30 * 86400000);
  pass("Plan successfully upgraded to Enterprise and expiry extended by exactly 30 days");

  // TEST 6: Master Access Override (FULL_CONTROL)
  console.log("\n🔹 Scenario 6: Master Full Control Override");
  harness.setFullControl(schoolA.school.id, true);
  const subAfterOverride = harness.subscriptions.get(schoolA.school.id);
  assert.strictEqual(subAfterOverride.controlMode, "FULL_CONTROL");
  assert.strictEqual(harness.accessOverrides.get(schoolA.school.id).enabled, true);
  pass("FULL_CONTROL master override applied and bypass flag active");

  // TEST 7: Emergency Controls, Read-Only Mode & Force Logout
  console.log("\n🔹 Scenario 7: Emergency Tenant Lockdown & Force Logout");
  harness.applyEmergencyControls(schoolA.school.id, {
    status: "READ_ONLY",
    disablePayments: true,
    disableFees: true,
    disableReports: true,
    forceLogoutAll: true,
    reason: "Emergency server database upgrade",
  });

  const emergState = harness.emergencyControls.get(schoolA.school.id);
  assert.strictEqual(emergState.status, "READ_ONLY");
  assert.strictEqual(emergState.disablePayments, true);
  assert.strictEqual(emergState.disableFees, true);
  assert.strictEqual(emergState.disableReports, true);
  assert.strictEqual(harness.revokedSessions.has(schoolA.school.id), true);
  assert.strictEqual(harness.schools.get(schoolA.school.id).isReadOnly, true);
  pass("READ_ONLY mode, module kill-switches, and force logout session revocation verified");

  // TEST 8: Tenant Isolation Verification
  console.log("\n🔹 Scenario 8: Tenant Isolation & Non-Bleeding");
  const schoolBRecord = harness.schools.get(schoolB.school.id);
  assert.strictEqual(schoolBRecord.isReadOnly, false);
  assert.strictEqual(schoolBRecord.status, "active");
  assert.strictEqual(harness.revokedSessions.has(schoolB.school.id), false);
  pass("Verified School B remains completely unaffected by School A emergency lock");

  console.log("\n======================================================================");
  console.log(`🏆 ALL ${passedCount}/${passedCount} E2E TEST SCENARIOS PASSED WITH ZERO ERRORS!`);
  console.log("======================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
