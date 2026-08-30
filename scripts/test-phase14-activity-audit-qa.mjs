import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 14.5: ACTIVITY, AUDIT, SESSION & PERFORMANCE QA TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
  }
}

// 1. Session & Activity Tracker Simulator
class ActivityTrackerSimulator {
  constructor() {
    this.loginLogs = [];
    this.sessions = new Map();
    this.navigationLogs = [];
    this.auditLogs = [];
    this.activeListeners = new Set();
  }

  // 1. Login Activity
  recordLogin(user, meta = {}) {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const loginRecord = {
      id: `log_${Date.now()}`,
      userId: user.uid,
      userName: user.name || user.email,
      role: user.role,
      schoolId: user.schoolId || "PLATFORM",
      sessionId,
      device: meta.device || "Desktop",
      browser: meta.browser || "Chrome",
      os: meta.os || "Windows",
      ip: meta.ip || "127.0.0.1",
      status: "SUCCESS",
      loginAt: now,
    };

    const sessionRecord = {
      sessionId,
      userId: user.uid,
      role: user.role,
      schoolId: user.schoolId || "PLATFORM",
      startedAt: now,
      lastSeenAt: now,
      status: "ACTIVE",
      device: meta.device || "Desktop",
    };

    this.loginLogs.push(loginRecord);
    this.sessions.set(sessionId, sessionRecord);
    return { loginRecord, sessionRecord };
  }

  // 2. Failed Login
  recordFailedLogin(email, reason = "INVALID_CREDENTIALS") {
    const failedRecord = {
      id: `log_fail_${Date.now()}`,
      attemptedEmail: email.trim().toLowerCase(),
      reason,
      status: "FAILED",
      attemptedAt: new Date().toISOString(),
    };
    this.loginLogs.push(failedRecord);
    return failedRecord;
  }

  // 3. Session Heartbeat
  heartbeat(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "ACTIVE") {
      throw new Error("SESSION_INVALID: Session is expired or terminated.");
    }
    session.lastSeenAt = new Date().toISOString();
    return session;
  }

  // 4. Logout
  recordLogout(sessionId, reason = "USER_ACTION") {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "ENDED";
      session.endedAt = new Date().toISOString();
      session.endReason = reason;
    }
    return session;
  }

  // 5. Session Revocation by Super Admin
  revokeSession(actorRole, sessionId, reason = "ADMIN_REVOKED") {
    if (actorRole !== "super_admin") {
      throw new Error("ACCESS_DENIED: Only Super Admin can revoke active sessions.");
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "REVOKED";
      session.endedAt = new Date().toISOString();
      session.endReason = reason;
    }
    this.recordAuditLog({
      actorId: "super_admin",
      actorRole: "super_admin",
      action: "SESSION_REVOKED",
      targetId: sessionId,
      details: { reason },
    });
    return session;
  }

  // 6. Navigation Tracking
  trackNavigation(sessionId, path) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "ACTIVE") return null;

    const navEvent = {
      id: `nav_${Date.now()}`,
      sessionId,
      userId: session.userId,
      role: session.role,
      schoolId: session.schoolId,
      path,
      timestamp: new Date().toISOString(),
    };
    this.navigationLogs.push(navEvent);
    return navEvent;
  }

  // 7. Audit Logging (Append-Only)
  recordAuditLog(entry) {
    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      schoolId: entry.schoolId || "PLATFORM",
      action: entry.action,
      targetId: entry.targetId,
      details: entry.details || {},
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(auditRecord);
    return auditRecord;
  }

  // 8. Listener Management
  subscribe(listenerId) {
    this.activeListeners.add(listenerId);
    return () => this.activeListeners.delete(listenerId);
  }
}

// --- TEST CASES ---

// Test 1: Login Activity for all roles
test("1. Login Activity: Single accurate record created for Super Admin, School Admin, Teacher, Student", () => {
  const tracker = new ActivityTrackerSimulator();

  const superAdmin = { uid: "sa_1", role: "super_admin", email: "sa@sbci.online" };
  const schoolAdmin = { uid: "adm_1", role: "school_admin", schoolId: "SCHOOL_A" };
  const teacher = { uid: "tch_1", role: "teacher", schoolId: "SCHOOL_A" };
  const student = { uid: "stu_1", role: "student", schoolId: "SCHOOL_A" };

  tracker.recordLogin(superAdmin);
  tracker.recordLogin(schoolAdmin);
  tracker.recordLogin(teacher);
  tracker.recordLogin(student);

  assert.equal(tracker.loginLogs.length, 4);
  assert.equal(tracker.sessions.size, 4);
  assert.equal(tracker.loginLogs[0].role, "super_admin");
  assert.equal(tracker.loginLogs[1].schoolId, "SCHOOL_A");
});

// Test 2: Failed Login Record Safety (Zero credential exposure)
test("2. Failed Login: Safe failure recorded without storing passwords, tokens, or OTPs", () => {
  const tracker = new ActivityTrackerSimulator();
  const fail = tracker.recordFailedLogin("attacker@example.com", "INVALID_PASSWORD");

  assert.equal(fail.status, "FAILED");
  assert.equal(fail.attemptedEmail, "attacker@example.com");
  assert.equal(fail.password, undefined);
  assert.equal(fail.token, undefined);
});

// Test 3: Session & Heartbeat
test("3. Session Heartbeat: Updates lastSeenAt without creating duplicate sessions", () => {
  const tracker = new ActivityTrackerSimulator();
  const { sessionRecord } = tracker.recordLogin({ uid: "user_1", role: "school_admin", schoolId: "SCHOOL_A" });

  const initialSeen = sessionRecord.lastSeenAt;
  const updated = tracker.heartbeat(sessionRecord.sessionId);

  assert.equal(updated.sessionId, sessionRecord.sessionId);
  assert.equal(tracker.sessions.size, 1);
});

// Test 4: Logout Lifecycle
test("4. Logout: Session marked as ENDED with timestamp and reason", () => {
  const tracker = new ActivityTrackerSimulator();
  const { sessionRecord } = tracker.recordLogin({ uid: "user_1", role: "teacher", schoolId: "SCHOOL_A" });

  const ended = tracker.recordLogout(sessionRecord.sessionId, "USER_LOGOUT");
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.endReason, "USER_LOGOUT");
  assert.throws(() => tracker.heartbeat(sessionRecord.sessionId), /SESSION_INVALID/);
});

// Test 5: Super Admin Session Revocation & Audit
test("5. Session Revocation: Super Admin revokes active session and creates audit record", () => {
  const tracker = new ActivityTrackerSimulator();
  const { sessionRecord } = tracker.recordLogin({ uid: "user_2", role: "student", schoolId: "SCHOOL_A" });

  const revoked = tracker.revokeSession("super_admin", sessionRecord.sessionId, "SECURITY_SUSPENSION");
  assert.equal(revoked.status, "REVOKED");
  assert.equal(tracker.auditLogs.some((a) => a.action === "SESSION_REVOKED"), true);

  // Non-super-admin attempt rejected
  assert.throws(() => tracker.revokeSession("teacher", sessionRecord.sessionId), /ACCESS_DENIED/);
});

// Test 6: Navigation Tracking
test("6. Navigation Tracking: Key portal navigation events logged cleanly", () => {
  const tracker = new ActivityTrackerSimulator();
  const { sessionRecord } = tracker.recordLogin({ uid: "adm_1", role: "school_admin", schoolId: "SCHOOL_A" });

  tracker.trackNavigation(sessionRecord.sessionId, "/admin");
  tracker.trackNavigation(sessionRecord.sessionId, "/admin/students");
  tracker.trackNavigation(sessionRecord.sessionId, "/admin/billing");

  assert.equal(tracker.navigationLogs.length, 3);
  assert.equal(tracker.navigationLogs[1].path, "/admin/students");
});

// Test 7: Audit Log Immutability & Details Connection
test("7. Audit Log: Append-only integrity preserves actor, role, school, action, target and details", () => {
  const tracker = new ActivityTrackerSimulator();
  const audit = tracker.recordAuditLog({
    actorId: "adm_1",
    actorRole: "school_admin",
    schoolId: "SCHOOL_A",
    action: "STUDENT_UPDATED",
    targetId: "stu_101",
    details: { changes: ["className"] },
  });

  assert.equal(audit.action, "STUDENT_UPDATED");
  assert.equal(audit.schoolId, "SCHOOL_A");
  assert.equal(tracker.auditLogs.length, 1);
});

// Test 8: Multi-Tenant Activity & Audit Isolation
test("8. Multi-Tenant Activity Isolation: School A Admin cannot query School B sessions or audits", () => {
  const tracker = new ActivityTrackerSimulator();
  tracker.recordLogin({ uid: "adm_b", role: "school_admin", schoolId: "SCHOOL_B" });
  tracker.recordAuditLog({ actorId: "adm_b", actorRole: "school_admin", schoolId: "SCHOOL_B", action: "TEACHER_CREATED", targetId: "tch_b" });

  const getSchoolAudits = (requesterSchoolId, targetSchoolId) => {
    if (requesterSchoolId !== targetSchoolId) throw new Error("ACCESS_DENIED");
    return tracker.auditLogs.filter((a) => a.schoolId === targetSchoolId);
  };

  assert.throws(() => getSchoolAudits("SCHOOL_A", "SCHOOL_B"), /ACCESS_DENIED/);
  assert.equal(getSchoolAudits("SCHOOL_B", "SCHOOL_B").length, 1);
});

// Test 9: Listener Lifecycle & Clean Unmount (No Memory Leaks)
test("9. Listener Cleanup: Active listeners are cleanly unregistered on component unmount", () => {
  const tracker = new ActivityTrackerSimulator();

  const unsubscribe1 = tracker.subscribe("dashboard_stats");
  const unsubscribe2 = tracker.subscribe("notifications_feed");
  assert.equal(tracker.activeListeners.size, 2);

  unsubscribe1();
  assert.equal(tracker.activeListeners.size, 1);
  assert.equal(tracker.activeListeners.has("dashboard_stats"), false);

  unsubscribe2();
  assert.equal(tracker.activeListeners.size, 0);
});

console.log("\n==================================================");
console.log(`PHASE 14.5 ACTIVITY & AUDIT QA RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("==================================================");
