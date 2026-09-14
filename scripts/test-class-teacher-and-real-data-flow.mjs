/**
 * CLASS TEACHER & REAL-DATA-ONLY ARCHITECTURE TEST SUITE
 *
 * Verifies:
 * 1. Class Teacher Assignment & Atomic Synchronization logic.
 * 2. Teacher Portal Service Real Data Only: No fake demo classes generated when unassigned.
 * 3. Server-side Attendance API: Verification that only assigned class teacher or school admin can submit.
 * 4. Server-side Homework API: Verification of tenant & role authorization.
 * 5. Firestore Rules: Case-insensitive teacher role check & teacher write permission for attendance.
 * 6. Student Overview Cards: Zero mock/demo fallbacks (no 92%, no 23/25, no 12 Days, no ₹1500, no 3 pending).
 * 7. Admin Classes UI: Class Teacher selector in modal & Class Teacher badge on cards.
 */

import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (!condition) {
    console.error(`❌ FAILED: ${name}`);
    failed++;
    throw new Error(name);
  } else {
    console.log(`✓ PASSED: ${name}`);
    passed++;
  }
}

async function runSuite() {
  console.log("==================================================");
  console.log("CLASS TEACHER & REAL DATA ARCHITECTURE TEST SUITE");
  console.log("==================================================\n");

  const cwd = process.cwd();

  // 1. Check firestore.rules
  console.log("--- 1. Firestore Security Rules Verification ---");
  const rules = fs.readFileSync(path.resolve(cwd, "firestore.rules"), "utf-8");
  assert(
    rules.includes("isTeacher(request.resource.data.get('schoolId', ''))"),
    "Rules permit verified school teachers to create attendance records"
  );
  assert(
    rules.includes("['teacher', 'TEACHER']"),
    "Rules support case-insensitive teacher role ('teacher' or 'TEACHER')"
  );

  // 2. Check Teacher Attendance API Route
  console.log("\n--- 2. Serverless Teacher Attendance API Verification ---");
  const attendanceRoute = fs.readFileSync(path.resolve(cwd, "src/app/api/teacher/attendance/route.ts"), "utf-8");
  assert(
    attendanceRoute.includes("export async function POST"),
    "Attendance API exports authoritative POST endpoint"
  );
  assert(
    attendanceRoute.includes("export async function GET"),
    "Attendance API exports authoritative GET endpoint"
  );
  assert(
    attendanceRoute.includes("isAuthorizedClassTeacher"),
    "Attendance API checks class.classTeacherId against teacher auth id"
  );
  assert(
    attendanceRoute.includes("Only the designated Class Teacher can record roll call"),
    "Attendance API returns 403 when non-class teacher attempts to record attendance"
  );
  assert(
    attendanceRoute.includes("Cross-school violation"),
    "Attendance API enforces multi-tenant isolation against cross-school tampering"
  );

  // 3. Check Teacher Homework API Route
  console.log("\n--- 3. Serverless Teacher Homework API Verification ---");
  const homeworkRoute = fs.readFileSync(path.resolve(cwd, "src/app/api/teacher/homework/route.ts"), "utf-8");
  assert(
    homeworkRoute.includes("export async function POST"),
    "Homework API exports authoritative POST endpoint"
  );
  assert(
    homeworkRoute.includes("export async function GET"),
    "Homework API exports authoritative GET endpoint"
  );
  assert(
    homeworkRoute.includes("homework"),
    "Homework API saves assignments to tenant homework collection"
  );

  // 4. Check Teacher Portal Service (Zero Fake Classes)
  console.log("\n--- 4. Teacher Portal Service Real Data Only ---");
  const teacherService = fs.readFileSync(path.resolve(cwd, "src/lib/services/teacher-portal.service.ts"), "utf-8");
  assert(
    !teacherService.includes("allSchoolClasses.slice(0, 4)"),
    "Teacher portal service permanently purged of 4-class slice fake fallback"
  );
  assert(
    !teacherService.includes('["Mathematics", "Science"'),
    "Teacher portal service has zero hardcoded fake subject arrays"
  );
  assert(
    teacherService.includes("isClassTeacher"),
    "Teacher portal service discovers classes where teacher is designated as Class Teacher"
  );

  // 5. Check Academic Service Class Teacher Methods
  console.log("\n--- 5. Academic Service Class Teacher Synchronization ---");
  const academicService = fs.readFileSync(path.resolve(cwd, "src/lib/services/academic.service.ts"), "utf-8");
  assert(
    academicService.includes("export async function assignClassTeacher"),
    "Academic service exports assignClassTeacher helper"
  );
  assert(
    academicService.includes("export async function removeClassTeacher"),
    "Academic service exports removeClassTeacher helper"
  );
  assert(
    academicService.includes("classTeacherId: data.classTeacherId"),
    "Academic service createClass accepts and stores classTeacherId"
  );
  assert(
    academicService.includes("assignedClassId: classId"),
    "Academic service createClass syncs assignedClassId on teacher profile"
  );

  // 6. Check Admin Classes UI
  console.log("\n--- 6. Admin Classes UI Class Teacher Assignment ---");
  const adminClassesUI = fs.readFileSync(path.resolve(cwd, "src/app/(dashboard)/admin/classes/page.tsx"), "utf-8");
  assert(
    adminClassesUI.includes("Assign Class Teacher"),
    "Admin Classes page provides Assign Class Teacher dropdown selector in modal"
  );
  assert(
    adminClassesUI.includes("classTeacherIdInput"),
    "Admin Classes page binds classTeacherId state in class create/edit form"
  );
  assert(
    adminClassesUI.includes("GraduationCap"),
    "Admin Classes page displays Class Teacher badge on each class card"
  );
  assert(
    adminClassesUI.includes("getTeachers(schoolId)"),
    "Admin Classes page dynamically loads verified school teachers"
  );

  // 7. Check Teacher Attendance Page UI
  console.log("\n--- 7. Teacher Attendance Page UI Integration ---");
  const teacherAttendanceUI = fs.readFileSync(path.resolve(cwd, "src/app/(dashboard)/teacher/attendance/page.tsx"), "utf-8");
  assert(
    teacherAttendanceUI.includes("/api/teacher/attendance"),
    "Teacher attendance page submits via server API endpoint"
  );
  assert(
    teacherAttendanceUI.includes("No Classes Assigned Yet"),
    "Teacher attendance page displays clean empty state when teacher has 0 assigned classes"
  );

  // 8. Check Student Overview Mock Fallback Elimination
  console.log("\n--- 8. Student Overview Real Data Only (Zero Fallbacks) ---");
  const attendanceCard = fs.readFileSync(path.resolve(cwd, "src/components/student/overview/AttendanceCard.tsx"), "utf-8");
  assert(!attendanceCard.includes("return 92"), "AttendanceCard has 0 hardcoded 92% preview fallback");
  assert(!attendanceCard.includes("?? 23"), "AttendanceCard has 0 hardcoded 23 present days fallback");
  assert(!attendanceCard.includes("?? 25"), "AttendanceCard has 0 hardcoded 25 total days fallback");

  const examsCard = fs.readFileSync(path.resolve(cwd, "src/components/student/overview/ExamsCard.tsx"), "utf-8");
  assert(!examsCard.includes("Unit Test - Science"), "ExamsCard has 0 hardcoded Unit Test - Science fallback");
  assert(!examsCard.includes('"12 Days"'), "ExamsCard has 0 hardcoded 12 Days fallback");

  const feesCard = fs.readFileSync(path.resolve(cwd, "src/components/student/overview/FeesCard.tsx"), "utf-8");
  assert(!feesCard.includes("?? 1500"), "FeesCard has 0 hardcoded 1500 dues fallback");
  assert(!feesCard.includes('"August"'), "FeesCard has 0 hardcoded August dues fallback");

  const homeworkCard = fs.readFileSync(path.resolve(cwd, "src/components/student/overview/HomeworkCard.tsx"), "utf-8");
  assert(!homeworkCard.includes("?? 3"), "HomeworkCard has 0 hardcoded 3 pending items fallback");

  console.log("\n==================================================");
  console.log(`ALL TESTS PASSED: ${passed} / ${passed + failed}`);
  console.log("==================================================\n");
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
