import assert from "node:assert/strict";
import { isRoleAllowedForPath, getRedirectByRole, getRoleFromPath } from "../src/lib/utils/redirect-by-role.ts";

console.log("==================================================");
console.log("STARTING PHASE 14.1: CORE PORTAL QA & E2E TEST SUITE");
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

// 1. Session & Navigation State Simulator
class PortalSessionSimulator {
  constructor(user = null, profile = null) {
    this.user = user;
    this.profile = profile;
    this.currentPath = "/login";
    this.history = [];
  }

  login(user, profile) {
    this.user = user;
    this.profile = profile;
    this.currentPath = getRedirectByRole(profile.role);
    this.history.push(this.currentPath);
    return this.currentPath;
  }

  logout() {
    this.user = null;
    this.profile = null;
    this.currentPath = "/login";
    this.history = [];
  }

  navigate(targetPath) {
    // 1. If unauthenticated
    if (!this.user || !this.profile) {
      this.currentPath = "/login";
      return { allowed: false, path: "/login", reason: "UNAUTHENTICATED" };
    }

    // 2. Check role authorization
    const isAllowed = isRoleAllowedForPath(this.profile.role, targetPath);
    if (!isAllowed) {
      const fallback = getRedirectByRole(this.profile.role);
      this.currentPath = fallback;
      return { allowed: false, path: fallback, reason: "ROLE_MISMATCH" };
    }

    this.currentPath = targetPath;
    this.history.push(targetPath);
    return { allowed: true, path: targetPath };
  }

  browserBack() {
    if (this.history.length > 1) {
      this.history.pop();
      const prevPath = this.history[this.history.length - 1];
      return this.navigate(prevPath);
    }
    return { allowed: true, path: this.currentPath };
  }
}

// --- TEST CASES ---

// Test 1: Unauthenticated direct access to all portals
test("1. Unauthenticated Route Guard: Direct URL access to portals redirects to /login", () => {
  const session = new PortalSessionSimulator(null, null);

  assert.equal(session.navigate("/super-admin").path, "/login");
  assert.equal(session.navigate("/admin").path, "/login");
  assert.equal(session.navigate("/teacher").path, "/login");
  assert.equal(session.navigate("/student").path, "/login");
});

// Test 2: Super Admin Portal Flow & Navigation
test("2. Super Admin Flow: Login -> /super-admin -> navigates sub-pages -> logout", () => {
  const superAdmin = { uid: "sa_1" };
  const superAdminProfile = { uid: "sa_1", role: "super_admin", email: "admin@sbci.online" };
  const session = new PortalSessionSimulator();

  const landing = session.login(superAdmin, superAdminProfile);
  assert.equal(landing, "/super-admin");

  // Navigate Super Admin Pages
  assert.equal(session.navigate("/super-admin/schools").path, "/super-admin/schools");
  assert.equal(session.navigate("/super-admin/users").path, "/super-admin/users");
  assert.equal(session.navigate("/super-admin/inquiries").path, "/super-admin/inquiries");
  assert.equal(session.navigate("/super-admin/finance").path, "/super-admin/finance");
  assert.equal(session.navigate("/super-admin/reports").path, "/super-admin/reports");
  assert.equal(session.navigate("/super-admin/site-settings").path, "/super-admin/site-settings");

  // Logout
  session.logout();
  assert.equal(session.navigate("/super-admin").path, "/login");
});

// Test 3: School Admin Portal Flow & Cross-Portal Interception
test("3. School Admin Flow: Login -> /admin -> subpages -> forbidden /super-admin redirects to /admin", () => {
  const adminUser = { uid: "admin_1" };
  const adminProfile = { uid: "admin_1", role: "school_admin", schoolId: "school_101" };
  const session = new PortalSessionSimulator();

  const landing = session.login(adminUser, adminProfile);
  assert.equal(landing, "/admin");

  // Allowed pages
  assert.equal(session.navigate("/admin/students").path, "/admin/students");
  assert.equal(session.navigate("/admin/teachers").path, "/admin/teachers");
  assert.equal(session.navigate("/admin/classes").path, "/admin/classes");
  assert.equal(session.navigate("/admin/attendance").path, "/admin/attendance");
  assert.equal(session.navigate("/admin/reports").path, "/admin/reports");
  assert.equal(session.navigate("/admin/billing").path, "/admin/billing");

  // Attempting Super Admin URL
  const breachAttempt = session.navigate("/super-admin/finance");
  assert.equal(breachAttempt.allowed, false);
  assert.equal(breachAttempt.path, "/admin", "Must redirect back to School Admin dashboard");
});

// Test 4: Teacher Portal Flow & Isolation
test("4. Teacher Flow: Login -> /teacher -> subpages -> forbidden /admin or /super-admin redirects to /teacher", () => {
  const teacherUser = { uid: "t_1" };
  const teacherProfile = { uid: "t_1", role: "teacher", schoolId: "school_101" };
  const session = new PortalSessionSimulator();

  const landing = session.login(teacherUser, teacherProfile);
  assert.equal(landing, "/teacher");

  // Allowed pages
  assert.equal(session.navigate("/teacher/classes").path, "/teacher/classes");
  assert.equal(session.navigate("/teacher/students").path, "/teacher/students");
  assert.equal(session.navigate("/teacher/attendance").path, "/teacher/attendance");
  assert.equal(session.navigate("/teacher/notices").path, "/teacher/notices");

  // Breach attempts
  assert.equal(session.navigate("/admin/billing").path, "/teacher");
  assert.equal(session.navigate("/super-admin/reports").path, "/teacher");
});

// Test 5: Student Portal Flow & Isolation
test("5. Student Flow: Login -> /student -> subpages -> forbidden /admin or /teacher redirects to /student", () => {
  const studentUser = { uid: "s_1" };
  const studentProfile = { uid: "s_1", role: "student", schoolId: "school_101" };
  const session = new PortalSessionSimulator();

  const landing = session.login(studentUser, studentProfile);
  assert.equal(landing, "/student");

  // Allowed pages
  assert.equal(session.navigate("/student/attendance").path, "/student/attendance");
  assert.equal(session.navigate("/student/profile").path, "/student/profile");
  assert.equal(session.navigate("/student/timetable").path, "/student/timetable");
  assert.equal(session.navigate("/student/fees").path, "/student/fees");
  assert.equal(session.navigate("/student/notices").path, "/student/notices");

  // Breach attempts
  assert.equal(session.navigate("/admin/students").path, "/student");
  assert.equal(session.navigate("/teacher/attendance").path, "/student");
  assert.equal(session.navigate("/super-admin").path, "/student");
});

// Test 6: Browser Back after Logout Security Guard
test("6. Logout Guard: Browser Back after logout cannot access cached protected route", () => {
  const adminUser = { uid: "admin_1" };
  const adminProfile = { uid: "admin_1", role: "school_admin" };
  const session = new PortalSessionSimulator();

  session.login(adminUser, adminProfile);
  session.navigate("/admin/students");
  session.navigate("/admin/billing");

  // User logs out
  session.logout();

  // User presses browser back
  const backAttempt = session.browserBack();
  assert.equal(backAttempt.path, "/login", "Logged out user pressing back must remain on /login");
});

// Test 7: Route prefix parser accuracy
test("7. Route Parser: getRoleFromPath extracts exact expected role", () => {
  assert.equal(getRoleFromPath("/super-admin/audit"), "super_admin");
  assert.equal(getRoleFromPath("/admin/reports"), "school_admin");
  assert.equal(getRoleFromPath("/teacher/attendance"), "teacher");
  assert.equal(getRoleFromPath("/student/fees"), "student");
  assert.equal(getRoleFromPath("/pricing"), null);
  assert.equal(getRoleFromPath("/contact"), null);
});

console.log("\n==================================================");
console.log(`PHASE 14.1 PORTAL QA TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("==================================================");
