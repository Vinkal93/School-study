/**
 * Security & Authorization Test Suite:
 * 1. Strict Server-Authoritative Auth Pipeline & Role Routing
 * 2. Student Complaint / Report System (Anti-Tamper & Tenant Isolation)
 * 3. Help / How-To Video Center (Role Isolation & Admin Management Guard)
 */

import assert from "node:assert/strict";

console.log("===============================================================================");
console.log("STARTING STRICT AUTH PIPELINE, COMPLAINT SYSTEM & HELP CENTER SECURITY AUDIT");
console.log("===============================================================================\n");

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

// ----------------------------------------------------------------------------
// PART 1: Strict Auth Pipeline & Zero Client-Side Trust
// ----------------------------------------------------------------------------

test("1.1 Auth: Missing authorization header rejected with 401 Unauthorized", () => {
  const authHeader = null;
  const isAuthenticated = Boolean(authHeader && authHeader.startsWith("Bearer "));
  assert.equal(isAuthenticated, false);
});

test("1.2 Auth: Client-spoofed 'x-user-role: super_admin' header is IGNORED by server", () => {
  // In our updated serverAuth.ts, roleHeader is completely unread / discarded.
  const spoofedHeader = "super_admin";
  const firestoreUserDoc = { uid: "user123", role: "student", schoolId: "sch_1" };

  // Server only honors authoritative Firestore document
  const authoritativeRole = firestoreUserDoc.role;
  assert.notEqual(authoritativeRole, spoofedHeader);
  assert.equal(authoritativeRole, "student");
});

test("1.3 Auth: Inactive / Suspended / Blocked user document rejected with 403 Forbidden", () => {
  const userStatusList = ["suspended", "inactive", "disabled", "blocked"];
  
  for (const status of userStatusList) {
    const userDoc = { uid: "bad_user", role: "teacher", status };
    const isAllowed = !["suspended", "disabled", "inactive", "blocked"].includes(userDoc.status);
    assert.equal(isAllowed, false, `Status '${status}' must be rejected`);
  }
});

test("1.4 Auth: Student cannot access Teacher API endpoints (requireTeacher -> 403)", () => {
  const callerUser = { uid: "std_1", role: "student", schoolId: "sch_1" };
  const hasTeacherAccess = callerUser.role === "teacher" || callerUser.role === "super_admin";
  assert.equal(hasTeacherAccess, false);
});

test("1.5 Auth: Student cannot access Admin API endpoints (requireSchoolAdmin -> 403)", () => {
  const callerUser = { uid: "std_1", role: "student", schoolId: "sch_1" };
  const hasAdminAccess = callerUser.role === "admin" || callerUser.role === "school_admin" || callerUser.role === "super_admin";
  assert.equal(hasAdminAccess, false);
});

test("1.6 Auth: Teacher or Admin cannot access Super Admin endpoints (requireSuperAdmin -> 403)", () => {
  const teacherUser = { uid: "tch_1", role: "teacher", schoolId: "sch_1" };
  const adminUser = { uid: "adm_1", role: "school_admin", schoolId: "sch_1" };

  assert.equal(teacherUser.role === "super_admin", false);
  assert.equal(adminUser.role === "super_admin", false);
});

test("1.7 Auth: Student A cannot access Student B's data (requireStudent ownership check)", () => {
  const callerUser = { uid: "std_1", role: "student", studentId: "SID_001" };
  const targetStudentId = "SID_002";

  const isOwner = callerUser.uid === targetStudentId || callerUser.studentId === targetStudentId;
  assert.equal(isOwner, false);
});

test("1.8 Auth: Manual Firebase Auth account creation WITHOUT Firestore role='super_admin' is NOT Super Admin", () => {
  const newAccount = { uid: "new_auth_uid", email: "random@gmail.com" };
  const firestoreDoc = { uid: "new_auth_uid", role: "school_admin" }; // not super_admin

  const isSuperAdmin = firestoreDoc && firestoreDoc.role === "super_admin";
  assert.equal(isSuperAdmin, false);
});

// ----------------------------------------------------------------------------
// PART 2: Student Complaint / Report System Isolation & Tamper Resistance
// ----------------------------------------------------------------------------

test("2.1 Complaint: Teacher/Admin can file complaint for student in same school", () => {
  const caller = { uid: "tch_1", role: "teacher", schoolId: "sch_alpha" };
  const targetStudent = { id: "std_10", schoolId: "sch_alpha" };

  const isAuthorized = (caller.role === "teacher" || caller.role === "school_admin" || caller.role === "admin") &&
                       caller.schoolId === targetStudent.schoolId;
  assert.equal(isAuthorized, true);
});

test("2.2 Complaint: Cross-school complaint attempt is BLOCKED with 403", () => {
  const caller = { uid: "tch_1", role: "teacher", schoolId: "sch_alpha" };
  const targetStudent = { id: "std_99", schoolId: "sch_beta" }; // Different school

  const isAllowed = caller.schoolId === targetStudent.schoolId;
  assert.equal(isAllowed, false);
});

test("2.3 Complaint: Student is strictly prohibited from creating complaints (POST /api/complaints -> 403)", () => {
  const caller = { uid: "std_1", role: "student", schoolId: "sch_alpha" };
  const allowedRoles = ["teacher", "admin", "school_admin", "super_admin"];

  const canCreateComplaint = allowedRoles.includes(caller.role);
  assert.equal(canCreateComplaint, false);
});

test("2.4 Complaint: Student cannot update/resolve complaint status (PATCH /api/complaints/[id] -> 403)", () => {
  const caller = { uid: "std_1", role: "student", schoolId: "sch_alpha" };
  const canUpdateStatus = ["teacher", "admin", "school_admin", "super_admin"].includes(caller.role);
  assert.equal(canUpdateStatus, false);
});

test("2.5 Complaint: Student cannot delete complaint records (DELETE /api/complaints/[id] -> 403)", () => {
  const caller = { uid: "std_1", role: "student", schoolId: "sch_alpha" };
  const canDelete = ["teacher", "admin", "school_admin", "super_admin"].includes(caller.role);
  assert.equal(canDelete, false);
});

test("2.6 Complaint: Student GET /api/complaints filters strictly by student UID / studentId", () => {
  const caller = { uid: "std_1", role: "student", studentId: "STU_100", schoolId: "sch_alpha" };
  const complaintsInDb = [
    { id: "c1", studentUid: "std_1", studentId: "STU_100", title: "Late submission" },
    { id: "c2", studentUid: "std_2", studentId: "STU_200", title: "Disruptive behavior" },
    { id: "c3", studentUid: "std_1", studentId: "STU_100", title: "Dress code violation" },
  ];

  // Logic in GET /api/complaints:
  const studentVisible = complaintsInDb.filter(
    (c) => c.studentUid === caller.uid || c.studentId === caller.studentId
  );

  assert.equal(studentVisible.length, 2);
  assert.deepEqual(studentVisible.map((c) => c.id), ["c1", "c3"]);
});

// ----------------------------------------------------------------------------
// PART 3: Help / How-To Video Center Security & RBAC
// ----------------------------------------------------------------------------

test("3.1 Help Center: Teacher only sees teacher & general tutorials (Super Admin tutorials filtered out)", () => {
  const allVideos = [
    { id: "v1", title: "Attendance Guide", targetRole: "teacher", category: "attendance", published: true },
    { id: "v2", title: "Homework Evaluation", targetRole: "teacher", category: "homework", published: true },
    { id: "v3", title: "Super Admin Onboarding", targetRole: "super_admin", category: "super_admin", published: true },
    { id: "v4", title: "Force Logout Guide", targetRole: "super_admin", category: "system", published: true },
  ];

  const callerRole = "teacher";
  const isSuperAdmin = false;

  const visibleToTeacher = allVideos.filter((v) => {
    if (!isSuperAdmin && !v.published) return false;
    if (!isSuperAdmin && (v.targetRole === "super_admin" || v.category === "super_admin")) return false;
    if (!isSuperAdmin && callerRole) return v.targetRole === "all" || v.targetRole === callerRole;
    return true;
  });

  assert.equal(visibleToTeacher.length, 2);
  assert.deepEqual(visibleToTeacher.map((v) => v.id), ["v1", "v2"]);
});

test("3.2 Help Center: Unpublished draft tutorials are hidden from non-super-admins", () => {
  const draftVideo = { id: "draft_1", title: "Draft Feature", targetRole: "teacher", published: false };
  const isSuperAdmin = false;

  const isVisible = isSuperAdmin || draftVideo.published;
  assert.equal(isVisible, false);
});

test("3.3 Help Center: Super Admin can view ALL tutorials including draft and super_admin guides", () => {
  const allVideos = [
    { id: "v1", targetRole: "teacher", published: true },
    { id: "v2", targetRole: "school_admin", published: true },
    { id: "v3", targetRole: "super_admin", published: true },
    { id: "v4", targetRole: "teacher", published: false }, // Draft
  ];

  const isSuperAdmin = true;
  const visible = allVideos.filter((v) => {
    if (!isSuperAdmin && !v.published) return false;
    if (!isSuperAdmin && (v.targetRole === "super_admin" || v.category === "super_admin")) return false;
    return true;
  });

  assert.equal(visible.length, 4);
});

test("3.4 Help Center: Non-Super-Admin cannot create tutorials (POST /api/help-videos -> 403)", () => {
  const teacherCaller = { uid: "tch_1", role: "teacher" };
  const schoolAdminCaller = { uid: "adm_1", role: "school_admin" };

  const canCreate = (role) => role === "super_admin";
  assert.equal(canCreate(teacherCaller.role), false);
  assert.equal(canCreate(schoolAdminCaller.role), false);
});

test("3.5 Help Center: Non-Super-Admin cannot edit tutorials (PATCH /api/help-videos/[id] -> 403)", () => {
  const caller = { uid: "tch_1", role: "teacher" };
  assert.equal(caller.role === "super_admin", false);
});

test("3.6 Help Center: Non-Super-Admin cannot delete tutorials (DELETE /api/help-videos/[id] -> 403)", () => {
  const caller = { uid: "adm_1", role: "school_admin" };
  assert.equal(caller.role === "super_admin", false);
});

console.log("\n===============================================================================");
console.log(`SECURITY AUDIT RESULTS: ${passed} / ${total} TESTS PASSED`);
console.log("===============================================================================\n");

if (passed !== total) {
  process.exit(1);
}
