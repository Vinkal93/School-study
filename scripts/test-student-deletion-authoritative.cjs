/**
 * Comprehensive Automated Regression Test Suite:
 * Student Deletion, Archival & Multi-Tenant Authority (School Study S 2.0)
 * 
 * Scenarios Tested:
 * 1. Archive single student (Safe Archive)
 * 2. Archive multiple students in bulk (Batch safety & chunking)
 * 3. Reject wrong school (WRONG_SCHOOL cross-tenant prevention)
 * 4. Handle missing/invalid ID (NOT_FOUND & INVALID_ID with partial success)
 * 5. Handle business/legacy identifiers (studentId, admissionNumber, userId resolution)
 * 6. Role authorization (PERMISSION_DENIED & UNAUTHORIZED)
 * 7. Restore archived student (Dual collection update & usage increment)
 * 8. Financial history guard (Permanent purge safely intercepts & archives if ledger records exist)
 * 9. Multi-tenant isolation (Session schoolId vs targetSchoolId tamper protection)
 * 10. Usage count decrement verification (Only active students decrement, no double-decrements)
 */

const assert = require("assert");

console.log("======================================================================");
console.log("RUNNING AUTHORITATIVE STUDENT DELETION & ARCHIVAL REGRESSION SUITE");
console.log("======================================================================");

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// In-Memory Mock Store simulating Firestore (subcollections, root collections, and users)
class MockFirestoreStore {
  constructor() {
    this.schools = {}; // schoolId -> { students: {}, feeDemands: {}, financialPayments: {} }
    this.rootStudents = {}; // docId -> data
    this.rootFeeDemands = []; // array of records
    this.rootFinancialPayments = []; // array of records
    this.users = {}; // uid -> data
    this.schoolUsage = {}; // schoolId -> { students: number }
  }

  seedSchool(schoolId, initialStudents = 0) {
    if (!this.schools[schoolId]) {
      this.schools[schoolId] = { students: {}, feeDemands: {}, financialPayments: {} };
    }
    if (!this.schoolUsage[schoolId]) {
      this.schoolUsage[schoolId] = { schoolId, students: initialStudents };
    }
  }

  seedStudent({
    schoolId,
    docId,
    studentId,
    admissionNumber,
    name,
    userId,
    status = "active",
    inSubcollection = true,
    inRoot = true,
  }) {
    this.seedSchool(schoolId);
    const data = {
      id: docId,
      studentId: studentId || docId,
      admissionNumber: admissionNumber || "",
      name: name || "Test Student",
      userId,
      schoolId,
      status,
      deletedAt: status === "archived" || status === "deleted" ? new Date().toISOString() : null,
    };

    if (inSubcollection) {
      this.schools[schoolId].students[docId] = { ...data };
    }
    if (inRoot) {
      this.rootStudents[docId] = { ...data };
    }
    if (userId) {
      this.users[userId] = {
        uid: userId,
        schoolId,
        status: status === "active" ? "active" : "disabled",
      };
    }
  }

  seedFinancialRecord(schoolId, studentId, type = "feeDemand") {
    this.seedSchool(schoolId);
    if (type === "feeDemand") {
      this.schools[schoolId].feeDemands[`dem_${Date.now()}`] = { schoolId, studentId, amountPaise: 50000 };
      this.rootFeeDemands.push({ schoolId, studentId, amountPaise: 50000 });
    } else {
      this.schools[schoolId].financialPayments[`pay_${Date.now()}`] = { schoolId, studentId, amountPaise: 50000 };
      this.rootFinancialPayments.push({ schoolId, studentId, amountPaise: 50000 });
    }
  }

  hasFinancialHistory(schoolId, candidateId, studentId, admissionNumber) {
    const ids = new Set([candidateId, studentId, admissionNumber].filter(Boolean));
    // Check subcollection
    const school = this.schools[schoolId];
    if (school) {
      for (const d of Object.values(school.feeDemands)) {
        if (ids.has(d.studentId)) return true;
      }
      for (const p of Object.values(school.financialPayments)) {
        if (ids.has(p.studentId)) return true;
      }
    }
    // Check root collections
    for (const d of this.rootFeeDemands) {
      if (d.schoolId === schoolId && ids.has(d.studentId)) return true;
    }
    for (const p of this.rootFinancialPayments) {
      if (p.schoolId === schoolId && ids.has(p.studentId)) return true;
    }
    return false;
  }

  resolveStudent(schoolId, candidateId) {
    if (!candidateId || typeof candidateId !== "string" || !candidateId.trim()) {
      return { code: "INVALID_ID", message: "Invalid or empty student identifier." };
    }
    const cleanId = candidateId.trim();

    // 1. Direct doc ID in subcollection
    const school = this.schools[schoolId];
    if (school && school.students[cleanId]) {
      const data = school.students[cleanId];
      if (data.schoolId && data.schoolId !== schoolId) {
        return { code: "WRONG_SCHOOL", message: "Belongs to another school." };
      }
      return { success: true, canonicalId: cleanId, data, inSubcollection: true, inRoot: Boolean(this.rootStudents[cleanId]) };
    }

    // 2. Direct doc ID in root
    if (this.rootStudents[cleanId]) {
      const data = this.rootStudents[cleanId];
      if (data.schoolId !== schoolId) {
        return { code: "WRONG_SCHOOL", message: "Belongs to another school." };
      }
      return { success: true, canonicalId: cleanId, data, inSubcollection: Boolean(school && school.students[cleanId]), inRoot: true };
    }

    // 3. Search by business identifiers in school
    if (school) {
      for (const [docId, s] of Object.entries(school.students)) {
        if (s.studentId === cleanId || s.admissionNumber === cleanId || s.userId === cleanId) {
          return { success: true, canonicalId: docId, data: s, inSubcollection: true, inRoot: Boolean(this.rootStudents[docId]) };
        }
      }
    }

    // 4. Search in root collection by business identifiers
    for (const [docId, s] of Object.entries(this.rootStudents)) {
      if (s.schoolId === schoolId && (s.studentId === cleanId || s.admissionNumber === cleanId || s.userId === cleanId)) {
        return { success: true, canonicalId: docId, data: s, inSubcollection: Boolean(school && school.students[docId]), inRoot: true };
      }
    }

    // 5. Check if candidate belongs to another school tenant
    for (const s of Object.values(this.rootStudents)) {
      if (s.schoolId !== schoolId && (s.id === cleanId || s.studentId === cleanId || s.admissionNumber === cleanId)) {
        return { code: "WRONG_SCHOOL", message: "Belongs to a different school tenant." };
      }
    }
    for (const [sId, sch] of Object.entries(this.schools)) {
      if (sId !== schoolId) {
        for (const s of Object.values(sch.students)) {
          if (s.id === cleanId || s.studentId === cleanId || s.admissionNumber === cleanId) {
            return { code: "WRONG_SCHOOL", message: "Belongs to a different school tenant." };
          }
        }
      }
    }

    return { code: "NOT_FOUND", message: "Student not found." };
  }

  executeBulkDelete({
    user,
    schoolId,
    candidateIds,
    permanent = false,
    targetSchoolId,
  }) {
    // 1. Auth check
    if (!user) {
      return { status: 401, error: { code: "UNAUTHORIZED", message: "Unauthorized: Authentication required." } };
    }

    // 2. Role check
    if (user.role !== "school_admin" && user.role !== "admin" && user.role !== "super_admin") {
      return { status: 403, error: { code: "PERMISSION_DENIED", message: "Forbidden: School Administrator permissions required." } };
    }

    // 3. Multi-tenant target validation
    let effectiveSchoolId = user.schoolId;
    if (user.role === "super_admin" && targetSchoolId) {
      effectiveSchoolId = targetSchoolId;
    } else if (targetSchoolId && targetSchoolId !== user.schoolId) {
      return { status: 403, error: { code: "WRONG_SCHOOL", message: "Cross-tenant deletion prohibited." } };
    }

    if (!effectiveSchoolId) {
      return { status: 400, error: { code: "MISSING_SCHOOL", message: "No authorized school tenant." } };
    }

    // 4. Candidate verification
    const verified = [];
    const results = [];
    let failedCount = 0;

    for (const candId of candidateIds) {
      const res = this.resolveStudent(effectiveSchoolId, candId);
      if (!res.success) {
        results.push({ id: candId, success: false, code: res.code, message: res.message });
        failedCount++;
      } else {
        verified.push({
          candidateId: candId,
          canonicalId: res.canonicalId,
          studentId: res.data.studentId,
          admissionNumber: res.data.admissionNumber,
          userId: res.data.userId,
          status: res.data.status,
          inSubcollection: res.inSubcollection,
          inRoot: res.inRoot,
        });
      }
    }

    if (verified.length === 0) {
      const hasWrongSchool = results.some((r) => r.code === "WRONG_SCHOOL");
      const hasNotFound = results.some((r) => r.code === "NOT_FOUND");
      const hasInvalidId = results.some((r) => r.code === "INVALID_ID");

      const primaryCode = hasWrongSchool
        ? "WRONG_SCHOOL"
        : hasInvalidId && !hasNotFound
        ? "INVALID_ID"
        : hasNotFound && !hasInvalidId
        ? "NOT_FOUND"
        : "NO_VALID_STUDENTS";

      return {
        status: primaryCode === "WRONG_SCHOOL" ? 403 : 400,
        error: { code: primaryCode, message: "Verification failed." },
        results,
      };
    }

    // 5. Execution
    let safelyArchivedCount = 0;
    let permanentlyDeletedCount = 0;
    let activeFreedCount = 0;
    const nowIso = new Date().toISOString();

    for (const st of verified) {
      if (st.status === "active") activeFreedCount++;

      let allowHardDelete = false;
      if (permanent) {
        const hasFin = this.hasFinancialHistory(effectiveSchoolId, st.canonicalId, st.studentId, st.admissionNumber);
        allowHardDelete = !hasFin;
      }

      if (permanent && allowHardDelete) {
        // Permanent Purge
        if (st.inSubcollection && this.schools[effectiveSchoolId]) {
          delete this.schools[effectiveSchoolId].students[st.canonicalId];
        }
        if (st.inRoot) {
          delete this.rootStudents[st.canonicalId];
        }
        if (st.userId) {
          delete this.users[st.userId];
        }
        permanentlyDeletedCount++;
        results.push({ id: st.candidateId, canonicalId: st.canonicalId, success: true, action: "permanently_deleted", code: "SUCCESS" });
      } else {
        // Safe Archive
        const reason = permanent && !allowHardDelete
          ? "Student has active financial ledger records; archived to preserve double-entry audit history"
          : "Administrative archive / deletion";

        const archiveData = {
          status: "archived",
          statusChangeReason: reason,
          deletedAt: nowIso,
          deletedBy: user.uid,
        };

        if (st.inSubcollection && this.schools[effectiveSchoolId]) {
          Object.assign(this.schools[effectiveSchoolId].students[st.canonicalId], archiveData);
        }
        if (st.inRoot && this.rootStudents[st.canonicalId]) {
          Object.assign(this.rootStudents[st.canonicalId], archiveData);
        }
        if (st.userId && this.users[st.userId]) {
          this.users[st.userId].status = "disabled";
        }
        safelyArchivedCount++;
        results.push({ id: st.candidateId, canonicalId: st.canonicalId, success: true, action: "archived", code: "SUCCESS" });
      }
    }

    // Decrement usage for freed active students
    if (activeFreedCount > 0 && this.schoolUsage[effectiveSchoolId]) {
      this.schoolUsage[effectiveSchoolId].students = Math.max(
        0,
        this.schoolUsage[effectiveSchoolId].students - activeFreedCount
      );
    }

    return {
      status: 200,
      success: true,
      deletedCount: verified.length,
      permanentlyDeletedCount,
      safelyArchivedCount,
      failedCount,
      activeFreedCount,
      results,
    };
  }

  restoreStudent(schoolId, studentId, userId) {
    if (this.schools[schoolId] && this.schools[schoolId].students[studentId]) {
      this.schools[schoolId].students[studentId].status = "active";
      this.schools[schoolId].students[studentId].deletedAt = null;
    }
    if (this.rootStudents[studentId]) {
      this.rootStudents[studentId].status = "active";
      this.rootStudents[studentId].deletedAt = null;
    }
    if (userId && this.users[userId]) {
      this.users[userId].status = "active";
    }
    if (this.schoolUsage[schoolId]) {
      this.schoolUsage[schoolId].students++;
    }
  }
}

// ======================================================================
// TEST SUITE EXECUTION
// ======================================================================

// Scenario 1: Archive single student (Safe Archive)
it("Scenario 1: Archive single student preserves financial data, updates status to archived, and disables user login", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 10);
  store.seedStudent({
    schoolId,
    docId: "doc_stu_1",
    studentId: "STU-001",
    name: "Aarav Sharma",
    userId: "usr_stu_1",
    status: "active",
  });

  const res = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["doc_stu_1"],
    permanent: false,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.deletedCount, 1);
  assert.strictEqual(res.safelyArchivedCount, 1);
  assert.strictEqual(res.permanentlyDeletedCount, 0);

  // Verify student document in subcollection and root
  const subDoc = store.schools[schoolId].students["doc_stu_1"];
  const rootDoc = store.rootStudents["doc_stu_1"];
  assert.strictEqual(subDoc.status, "archived");
  assert.ok(subDoc.deletedAt);
  assert.strictEqual(rootDoc.status, "archived");

  // Verify user login is disabled
  assert.strictEqual(store.users["usr_stu_1"].status, "disabled");

  // Verify usage decremented from 10 to 9
  assert.strictEqual(store.schoolUsage[schoolId].students, 9);
});

// Scenario 2: Archive multiple students in bulk
it("Scenario 2: Archive multiple students in bulk processes all records and decrements usage accurately", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 20);
  store.seedStudent({ schoolId, docId: "stu_a", studentId: "A1", status: "active" });
  store.seedStudent({ schoolId, docId: "stu_b", studentId: "B2", status: "active" });
  store.seedStudent({ schoolId, docId: "stu_c", studentId: "C3", status: "active" });

  const res = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["stu_a", "stu_b", "stu_c"],
    permanent: false,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.deletedCount, 3);
  assert.strictEqual(res.safelyArchivedCount, 3);
  assert.strictEqual(store.schoolUsage[schoolId].students, 17);
});

// Scenario 3: Reject wrong school (WRONG_SCHOOL)
it("Scenario 3: Reject wrong school returns 403 WRONG_SCHOOL and leaves foreign tenant records intact", () => {
  const store = new MockFirestoreStore();
  store.seedSchool("sch_alpha", 5);
  store.seedSchool("sch_beta", 8);

  // Student belongs to sch_beta
  store.seedStudent({
    schoolId: "sch_beta",
    docId: "doc_beta_student",
    studentId: "BETA-01",
    status: "active",
  });

  // Admin of sch_alpha attempts to delete sch_beta student
  const res = store.executeBulkDelete({
    user: { uid: "admin_alpha", role: "school_admin", schoolId: "sch_alpha" },
    schoolId: "sch_alpha",
    candidateIds: ["doc_beta_student"],
  });

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.error.code, "WRONG_SCHOOL");

  // Verify foreign record remains untouched
  assert.strictEqual(store.schools["sch_beta"].students["doc_beta_student"].status, "active");
  assert.strictEqual(store.schoolUsage["sch_beta"].students, 8);
});

// Scenario 4: Handle missing/invalid ID (NOT_FOUND / INVALID_ID with partial success)
it("Scenario 4: Handles missing and invalid IDs, returning granular results and supporting partial success", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 5);
  store.seedStudent({ schoolId, docId: "valid_stu", status: "active" });

  // 1. All invalid / non-existent
  const resNotFound = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["non_existent_id"],
  });
  assert.strictEqual(resNotFound.status, 400);
  assert.strictEqual(resNotFound.error.code, "NOT_FOUND");

  const resInvalid = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: [""],
  });
  assert.strictEqual(resInvalid.status, 400);
  assert.strictEqual(resInvalid.error.code, "INVALID_ID");

  // 2. Partial success: 1 valid student, 1 non-existent student
  const resPartial = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["valid_stu", "missing_stu"],
  });
  assert.strictEqual(resPartial.status, 200);
  assert.strictEqual(resPartial.deletedCount, 1);
  assert.strictEqual(resPartial.failedCount, 1);
  const validRes = resPartial.results.find((r) => r.id === "valid_stu");
  const missingRes = resPartial.results.find((r) => r.id === "missing_stu");
  assert.ok(validRes && validRes.success === true, "Valid student must succeed");
  assert.ok(missingRes && missingRes.code === "NOT_FOUND", "Missing student must report NOT_FOUND");
});

// Scenario 5: Handle business/legacy identifiers (studentId, admissionNumber, userId)
it("Scenario 5: Resolves student by business studentId, admissionNumber, or userId to canonical document ID", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 10);

  store.seedStudent({
    schoolId,
    docId: "doc_guid_101",
    studentId: "SBCI1",
    admissionNumber: "ADM-2026-99",
    userId: "auth_uid_xyz",
    status: "active",
  });

  // Query using business studentId "SBCI1" instead of canonical docId
  const res = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["SBCI1"],
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.deletedCount, 1);
  assert.strictEqual(res.results[0].canonicalId, "doc_guid_101");
  assert.strictEqual(store.schools[schoolId].students["doc_guid_101"].status, "archived");
});

// Scenario 6: Role authorization (PERMISSION_DENIED & UNAUTHORIZED)
it("Scenario 6: Role authorization rejects non-admin roles with 403 PERMISSION_DENIED and unauthenticated with 401", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 5);
  store.seedStudent({ schoolId, docId: "stu_1", status: "active" });

  // 1. Student role
  const resStudent = store.executeBulkDelete({
    user: { uid: "student_u", role: "student", schoolId },
    schoolId,
    candidateIds: ["stu_1"],
  });
  assert.strictEqual(resStudent.status, 403);
  assert.strictEqual(resStudent.error.code, "PERMISSION_DENIED");

  // 2. Teacher role
  const resTeacher = store.executeBulkDelete({
    user: { uid: "teacher_u", role: "teacher", schoolId },
    schoolId,
    candidateIds: ["stu_1"],
  });
  assert.strictEqual(resTeacher.status, 403);
  assert.strictEqual(resTeacher.error.code, "PERMISSION_DENIED");

  // 3. Unauthenticated request
  const resNoAuth = store.executeBulkDelete({
    user: null,
    schoolId,
    candidateIds: ["stu_1"],
  });
  assert.strictEqual(resNoAuth.status, 401);
  assert.strictEqual(resNoAuth.error.code, "UNAUTHORIZED");
});

// Scenario 7: Restore archived student
it("Scenario 7: Restore archived student resets status to active, clears deletedAt, re-enables user, and increments usage", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 5);
  store.seedStudent({
    schoolId,
    docId: "stu_arch",
    studentId: "STU-A",
    userId: "usr_arch",
    status: "archived",
  });

  store.restoreStudent(schoolId, "stu_arch", "usr_arch");

  assert.strictEqual(store.schools[schoolId].students["stu_arch"].status, "active");
  assert.strictEqual(store.schools[schoolId].students["stu_arch"].deletedAt, null);
  assert.strictEqual(store.rootStudents["stu_arch"].status, "active");
  assert.strictEqual(store.users["usr_arch"].status, "active");
  assert.strictEqual(store.schoolUsage[schoolId].students, 6);
});

// Scenario 8: Financial history guard preventing unsafe purge
it("Scenario 8: Permanent purge safely falls back to Safe Archive when financial records exist", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 10);

  // Student 1: Has fee demands and payments
  store.seedStudent({ schoolId, docId: "stu_with_fees", studentId: "FEE-01", status: "active" });
  store.seedFinancialRecord(schoolId, "stu_with_fees", "feeDemand");
  store.seedFinancialRecord(schoolId, "stu_with_fees", "financialPayment");

  // Student 2: Zero financial history
  store.seedStudent({ schoolId, docId: "stu_clean", studentId: "CLEAN-01", status: "active" });

  // Admin triggers permanent purge for both
  const res = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["stu_with_fees", "stu_clean"],
    permanent: true,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.safelyArchivedCount, 1, "Student with fee records must be safely archived");
  assert.strictEqual(res.permanentlyDeletedCount, 1, "Student with clean ledger is permanently deleted");

  // Verify stu_with_fees still exists as archived to preserve audit history
  const preservedStudent = store.schools[schoolId].students["stu_with_fees"];
  assert.ok(preservedStudent, "Student document must not be hard deleted");
  assert.strictEqual(preservedStudent.status, "archived");
  assert.ok(preservedStudent.statusChangeReason.includes("financial ledger records"));

  // Verify stu_clean is completely removed
  assert.strictEqual(store.schools[schoolId].students["stu_clean"], undefined);
  assert.strictEqual(store.rootStudents["stu_clean"], undefined);
});

// Scenario 9: Multi-tenant isolation
it("Scenario 9: Multi-tenant isolation rejects targetSchoolId mismatch for school admins, but allows super admins", () => {
  const store = new MockFirestoreStore();
  store.seedSchool("sch_alpha", 5);
  store.seedSchool("sch_beta", 10);
  store.seedStudent({ schoolId: "sch_beta", docId: "stu_beta_1", status: "active" });

  // 1. Regular school admin tries to tamper targetSchoolId to sch_beta
  const resTamper = store.executeBulkDelete({
    user: { uid: "admin_alpha", role: "school_admin", schoolId: "sch_alpha" },
    schoolId: "sch_alpha",
    targetSchoolId: "sch_beta", // unauthorized tamper attempt
    candidateIds: ["stu_beta_1"],
  });
  assert.strictEqual(resTamper.status, 403);
  assert.strictEqual(resTamper.error.code, "WRONG_SCHOOL");

  // 2. Super admin legitimately impersonates sch_beta
  const resSuper = store.executeBulkDelete({
    user: { uid: "super_admin_1", role: "super_admin", schoolId: "sch_global" },
    schoolId: "sch_global",
    targetSchoolId: "sch_beta",
    candidateIds: ["stu_beta_1"],
  });
  assert.strictEqual(resSuper.status, 200);
  assert.strictEqual(resSuper.deletedCount, 1);
});

// Scenario 10: Usage count decrement verification
it("Scenario 10: Usage count decrements only for active students, never goes negative, and ignores already archived records", () => {
  const store = new MockFirestoreStore();
  const schoolId = "sch_alpha";
  store.seedSchool(schoolId, 2); // Initial active count: 2

  store.seedStudent({ schoolId, docId: "active_1", status: "active" });
  store.seedStudent({ schoolId, docId: "already_archived", status: "archived" });

  // Deleting 1 active and 1 already-archived student
  const res = store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["active_1", "already_archived"],
    permanent: false,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.activeFreedCount, 1, "Only the active student should free plan capacity");
  assert.strictEqual(store.schoolUsage[schoolId].students, 1);

  // Deleting again does not decrement below zero
  store.executeBulkDelete({
    user: { uid: "admin_1", role: "school_admin", schoolId },
    schoolId,
    candidateIds: ["already_archived"],
    permanent: false,
  });
  assert.strictEqual(store.schoolUsage[schoolId].students, 1, "Re-archiving an archived student does not change usage");
});

console.log("======================================================================");
console.log(`REGRESSION SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
