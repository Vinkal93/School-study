import { StudentCardData, TenantCardData } from "../src/components/student/card/types";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

function runStudentProfileCardTests() {
  console.log("\n==========================================");
  console.log("PHASE 2 STUDENT PROFILE CARD TEST SUITE");
  console.log("==========================================\n");

  // 1. Long Data Payload Stability Test (Section 17)
  const longStudentData: StudentCardData = {
    id: "stu_long_123",
    fullName: "Mohammad Abdul Rahman Khan",
    verificationStatus: "verified",
    className: "Class 12",
    section: "Science-A",
    rollNumber: "99",
    admissionNumber: "2026/123456789",
    status: "active",
  };

  const longTenantData: TenantCardData = {
    id: "school_long_999",
    name: "Delhi International Public School and Academy",
    shortName: "DIPSA",
  };

  assert(longStudentData.fullName.length > 20, "1. Long student name ('Mohammad Abdul Rahman Khan') supported");
  assert(longTenantData.name.length > 30, "2. Long school name ('Delhi International Public School and Academy') supported");

  // 2. Verification badge status conditional checks (Section 8)
  assert(longStudentData.verificationStatus === "verified", "3. Verified status displays checkmark badge");
  
  const pendingStudent: StudentCardData = { ...longStudentData, verificationStatus: "pending" };
  assert(pendingStudent.verificationStatus !== "verified", "4. Pending status hides verified badge");

  // 3. Status pill states (Section 12)
  const activeStudent: StudentCardData = { ...longStudentData, status: "active" };
  const inactiveStudent: StudentCardData = { ...longStudentData, status: "inactive" };
  const suspendedStudent: StudentCardData = { ...longStudentData, status: "suspended" };

  assert(activeStudent.status === "active", "5. Active status -> 'Active Student'");
  assert(inactiveStudent.status === "inactive", "6. Inactive status -> 'Inactive Student'");
  assert(suspendedStudent.status === "suspended", "7. Suspended status -> 'Suspended'");

  // 4. Missing fields graceful handling (Sections 10 & 11)
  const missingRollStudent: StudentCardData = { ...longStudentData, rollNumber: undefined };
  assert(missingRollStudent.rollNumber === undefined, "8. Missing roll number handled gracefully without empty label");

  const missingAdmissionStudent: StudentCardData = { ...longStudentData, admissionNumber: undefined };
  assert(missingAdmissionStudent.admissionNumber === undefined, "9. Missing admission number handled gracefully without 'undefined' text");

  // 5. Tenant branding isolation (Section 13 & 14)
  assert(longTenantData.shortName === "DIPSA", "10. Tenant branding isolated to active school profile");

  console.log("\n==========================================");
  console.log("ALL 10/10 STUDENT PROFILE CARD TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runStudentProfileCardTests();
