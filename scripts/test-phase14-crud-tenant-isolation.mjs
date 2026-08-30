import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 14.2: CRUD & MULTI-TENANT ISOLATION QA TEST SUITE");
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

// In-Memory Multi-Tenant Database Simulator for High-Fidelity Verification
class MultiTenantDatabaseSimulator {
  constructor() {
    this.schools = new Map(); // schoolId -> { students: Map(), teachers: Map(), usage: { students: 0, teachers: 0 } }
    this.users = new Map(); // userId -> { uid, role, schoolId, status }
  }

  initSchool(schoolId) {
    if (!this.schools.has(schoolId)) {
      this.schools.set(schoolId, {
        students: new Map(),
        teachers: new Map(),
        usage: { students: 0, teachers: 0 },
      });
    }
  }

  // --- Student CRUD Operations ---
  createStudent(actor, schoolId, input) {
    // 1. Authorization: Only school_admin or super_admin of this school
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to create student for this school.");
    }

    // 2. Input Validation
    if (!input.name || !input.email || !input.admissionNumber || !input.password) {
      throw new Error("VALIDATION_ERROR: Missing mandatory student fields.");
    }
    if (input.password.length < 6) {
      throw new Error("VALIDATION_ERROR: Password must be at least 6 characters.");
    }

    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    const cleanAdm = input.admissionNumber.trim().toUpperCase();

    // 3. Uniqueness check within school
    for (const s of schoolData.students.values()) {
      if (s.admissionNumber === cleanAdm) {
        throw new Error(`DUPLICATE_ERROR: Admission Number "${cleanAdm}" already exists in this school.`);
      }
    }

    const studentId = `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const userId = `usr_${studentId}`;

    const studentRecord = {
      id: studentId,
      schoolId,
      userId,
      admissionNumber: cleanAdm,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      className: input.className || "Class 1",
      sectionName: input.sectionName || "A",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    schoolData.students.set(studentId, studentRecord);
    schoolData.usage.students += 1;

    this.users.set(userId, {
      uid: userId,
      role: "student",
      schoolId,
      studentId,
      status: "active",
    });

    return { studentId, userId, studentRecord };
  }

  getStudents(actor, schoolId) {
    if (!actor || (actor.role !== "super_admin" && actor.schoolId !== schoolId)) {
      throw new Error("ACCESS_DENIED: Cannot read students belonging to another school.");
    }
    this.initSchool(schoolId);
    return Array.from(this.schools.get(schoolId).students.values());
  }

  updateStudent(actor, schoolId, studentId, updates) {
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to update student in this school.");
    }
    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    if (!schoolData.students.has(studentId)) {
      throw new Error("NOT_FOUND: Student record not found.");
    }
    const current = schoolData.students.get(studentId);
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    schoolData.students.set(studentId, updated);
    return updated;
  }

  deleteStudent(actor, schoolId, studentId) {
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to delete student in this school.");
    }
    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    if (!schoolData.students.has(studentId)) {
      throw new Error("NOT_FOUND: Student record not found.");
    }
    const student = schoolData.students.get(studentId);
    schoolData.students.delete(studentId);
    if (student.userId) {
      this.users.delete(student.userId);
    }
    schoolData.usage.students = Math.max(0, schoolData.usage.students - 1);
    return true;
  }

  // --- Teacher CRUD Operations ---
  createTeacher(actor, schoolId, input) {
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to create teacher for this school.");
    }
    if (!input.name || !input.email || !input.teacherCode || !input.password) {
      throw new Error("VALIDATION_ERROR: Missing mandatory teacher fields.");
    }
    if (input.password.length < 6) {
      throw new Error("VALIDATION_ERROR: Password must be at least 6 characters.");
    }

    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    const cleanCode = input.teacherCode.trim().toUpperCase();

    for (const t of schoolData.teachers.values()) {
      if (t.teacherCode === cleanCode) {
        throw new Error(`DUPLICATE_ERROR: Teacher Code "${cleanCode}" already exists.`);
      }
    }

    const teacherId = `tch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const userId = `usr_${teacherId}`;

    const teacherRecord = {
      id: teacherId,
      schoolId,
      userId,
      teacherCode: cleanCode,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      subjects: input.subjects || [],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    schoolData.teachers.set(teacherId, teacherRecord);
    schoolData.usage.teachers += 1;

    this.users.set(userId, {
      uid: userId,
      role: "teacher",
      schoolId,
      teacherId,
      status: "active",
    });

    return { teacherId, userId, teacherRecord };
  }

  getTeachers(actor, schoolId) {
    if (!actor || (actor.role !== "super_admin" && actor.schoolId !== schoolId)) {
      throw new Error("ACCESS_DENIED: Cannot read teachers belonging to another school.");
    }
    this.initSchool(schoolId);
    return Array.from(this.schools.get(schoolId).teachers.values());
  }

  updateTeacher(actor, schoolId, teacherId, updates) {
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to update teacher.");
    }
    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    if (!schoolData.teachers.has(teacherId)) {
      throw new Error("NOT_FOUND: Teacher record not found.");
    }
    const current = schoolData.teachers.get(teacherId);
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    schoolData.teachers.set(teacherId, updated);
    return updated;
  }

  deleteTeacher(actor, schoolId, teacherId) {
    if (!actor || (actor.role !== "super_admin" && (actor.role !== "school_admin" || actor.schoolId !== schoolId))) {
      throw new Error("ACCESS_DENIED: Unauthorized to delete teacher.");
    }
    this.initSchool(schoolId);
    const schoolData = this.schools.get(schoolId);
    if (!schoolData.teachers.has(teacherId)) {
      throw new Error("NOT_FOUND: Teacher record not found.");
    }
    const teacher = schoolData.teachers.get(teacherId);
    schoolData.teachers.delete(teacherId);
    if (teacher.userId) {
      this.users.delete(teacher.userId);
    }
    schoolData.usage.teachers = Math.max(0, schoolData.usage.teachers - 1);
    return true;
  }
}

// --- TEST SUITE EXECUTION ---

// SECTION 1: STUDENT CRUD
test("1. Student CRUD: Create student provisions database record and login account", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  const res = db.createStudent(adminA, "SCHOOL_A", {
    name: "Aarav Sharma",
    email: "aarav@schoola.com",
    admissionNumber: "ADM-101",
    password: "Password@123",
    className: "Class 10",
  });

  assert.equal(res.studentRecord.name, "Aarav Sharma");
  assert.equal(res.studentRecord.admissionNumber, "ADM-101");
  assert.equal(db.schools.get("SCHOOL_A").usage.students, 1);
  assert.equal(db.users.get(res.userId).role, "student");
});

test("2. Student CRUD: Read, Update and Status Toggle", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  const { studentId } = db.createStudent(adminA, "SCHOOL_A", {
    name: "Diya Patel",
    email: "diya@schoola.com",
    admissionNumber: "ADM-102",
    password: "Password@123",
  });

  // Update
  const updated = db.updateStudent(adminA, "SCHOOL_A", studentId, { name: "Diya P. Patel", status: "inactive" });
  assert.equal(updated.name, "Diya P. Patel");
  assert.equal(updated.status, "inactive");

  // Read list
  const list = db.getStudents(adminA, "SCHOOL_A");
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Diya P. Patel");
});

test("3. Student CRUD: Delete removes student, user doc and decrements usage counter", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  const { studentId, userId } = db.createStudent(adminA, "SCHOOL_A", {
    name: "Rohan Verma",
    email: "rohan@schoola.com",
    admissionNumber: "ADM-103",
    password: "Password@123",
  });

  assert.equal(db.schools.get("SCHOOL_A").usage.students, 1);

  db.deleteStudent(adminA, "SCHOOL_A", studentId);
  assert.equal(db.schools.get("SCHOOL_A").students.has(studentId), false);
  assert.equal(db.users.has(userId), false);
  assert.equal(db.schools.get("SCHOOL_A").usage.students, 0);
});

test("4. Student CRUD Validation: Rejects missing fields, short passwords and duplicate admission numbers", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  // Missing fields
  assert.throws(() => db.createStudent(adminA, "SCHOOL_A", { name: "Incomplete" }), /VALIDATION_ERROR/);
  // Short password
  assert.throws(() => db.createStudent(adminA, "SCHOOL_A", { name: "Test", email: "t@t.com", admissionNumber: "1", password: "123" }), /VALIDATION_ERROR/);

  // Duplicate admission number
  db.createStudent(adminA, "SCHOOL_A", { name: "First", email: "f@a.com", admissionNumber: "ADM-DUPE", password: "Password@123" });
  assert.throws(() => db.createStudent(adminA, "SCHOOL_A", { name: "Second", email: "s@a.com", admissionNumber: "ADM-DUPE", password: "Password@123" }), /DUPLICATE_ERROR/);
});

// SECTION 2: TEACHER CRUD
test("5. Teacher CRUD: Full Lifecycle (Create, Read, Update, Delete, Usage Alignment)", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  const { teacherId, userId, teacherRecord } = db.createTeacher(adminA, "SCHOOL_A", {
    name: "Vikram Singh",
    email: "vikram@schoola.com",
    teacherCode: "TCH-01",
    password: "Password@123",
    subjects: ["Mathematics", "Physics"],
  });

  assert.equal(teacherRecord.teacherCode, "TCH-01");
  assert.equal(db.schools.get("SCHOOL_A").usage.teachers, 1);

  // Update
  db.updateTeacher(adminA, "SCHOOL_A", teacherId, { subjects: ["Advanced Physics"] });
  const teachers = db.getTeachers(adminA, "SCHOOL_A");
  assert.equal(teachers[0].subjects[0], "Advanced Physics");

  // Delete
  db.deleteTeacher(adminA, "SCHOOL_A", teacherId);
  assert.equal(db.schools.get("SCHOOL_A").teachers.has(teacherId), false);
  assert.equal(db.schools.get("SCHOOL_A").usage.teachers, 0);
});

// SECTION 3: MULTI-TENANT ISOLATION ATTACK TESTS
test("6. Multi-Tenant Attack: School-A Admin CANNOT read School-B students or teachers", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };
  const adminB = { uid: "adm_b", role: "school_admin", schoolId: "SCHOOL_B" };

  db.createStudent(adminB, "SCHOOL_B", { name: "Student B", email: "b@b.com", admissionNumber: "B-1", password: "Password@123" });
  db.createTeacher(adminB, "SCHOOL_B", { name: "Teacher B", email: "tb@b.com", teacherCode: "TB-1", password: "Password@123" });

  // School A attempting to read School B
  assert.throws(() => db.getStudents(adminA, "SCHOOL_B"), /ACCESS_DENIED/);
  assert.throws(() => db.getTeachers(adminA, "SCHOOL_B"), /ACCESS_DENIED/);
});

test("7. Multi-Tenant Attack: School-A Admin CANNOT update or delete School-B student/teacher", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };
  const adminB = { uid: "adm_b", role: "school_admin", schoolId: "SCHOOL_B" };

  const { studentId } = db.createStudent(adminB, "SCHOOL_B", { name: "Target Student", email: "ts@b.com", admissionNumber: "B-2", password: "Password@123" });
  const { teacherId } = db.createTeacher(adminB, "SCHOOL_B", { name: "Target Teacher", email: "tt@b.com", teacherCode: "TB-2", password: "Password@123" });

  // School A modifying School B
  assert.throws(() => db.updateStudent(adminA, "SCHOOL_B", studentId, { name: "Hacked Name" }), /ACCESS_DENIED/);
  assert.throws(() => db.deleteStudent(adminA, "SCHOOL_B", studentId), /ACCESS_DENIED/);
  assert.throws(() => db.updateTeacher(adminA, "SCHOOL_B", teacherId, { name: "Hacked Teacher" }), /ACCESS_DENIED/);
  assert.throws(() => db.deleteTeacher(adminA, "SCHOOL_B", teacherId), /ACCESS_DENIED/);
});

test("8. Multi-Tenant Attack: Reverse Test (School-B Admin CANNOT access School-A data)", () => {
  const db = new MultiTenantDatabaseSimulator();
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };
  const adminB = { uid: "adm_b", role: "school_admin", schoolId: "SCHOOL_B" };

  const { studentId } = db.createStudent(adminA, "SCHOOL_A", { name: "Student A", email: "a@a.com", admissionNumber: "A-1", password: "Password@123" });

  assert.throws(() => db.getStudents(adminB, "SCHOOL_A"), /ACCESS_DENIED/);
  assert.throws(() => db.deleteStudent(adminB, "SCHOOL_A", studentId), /ACCESS_DENIED/);
});

// SECTION 4: ROLE AUTHORIZATION
test("9. Role Authorization: Teacher and Student CANNOT create or delete students/teachers", () => {
  const db = new MultiTenantDatabaseSimulator();
  const teacherUser = { uid: "tch_1", role: "teacher", schoolId: "SCHOOL_A" };
  const studentUser = { uid: "stu_1", role: "student", schoolId: "SCHOOL_A" };

  assert.throws(() => db.createStudent(teacherUser, "SCHOOL_A", { name: "T Stu", email: "ts@a.com", admissionNumber: "T-1", password: "Password@123" }), /ACCESS_DENIED/);
  assert.throws(() => db.createTeacher(teacherUser, "SCHOOL_A", { name: "T Tch", email: "tt@a.com", teacherCode: "TT-1", password: "Password@123" }), /ACCESS_DENIED/);
  assert.throws(() => db.createStudent(studentUser, "SCHOOL_A", { name: "S Stu", email: "ss@a.com", admissionNumber: "S-1", password: "Password@123" }), /ACCESS_DENIED/);
});

test("10. Role Authorization: Super Admin CAN access and manage all schools globally", () => {
  const db = new MultiTenantDatabaseSimulator();
  const superAdmin = { uid: "sa_1", role: "super_admin" };
  const adminA = { uid: "adm_a", role: "school_admin", schoolId: "SCHOOL_A" };

  const { studentId } = db.createStudent(adminA, "SCHOOL_A", { name: "Global View Student", email: "gv@a.com", admissionNumber: "GV-1", password: "Password@123" });

  const superAdminStudents = db.getStudents(superAdmin, "SCHOOL_A");
  assert.equal(superAdminStudents.length, 1);
  assert.equal(superAdminStudents[0].id, studentId);
});

console.log("\n==================================================");
console.log(`PHASE 14.2 CRUD & MULTI-TENANT RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("==================================================");
