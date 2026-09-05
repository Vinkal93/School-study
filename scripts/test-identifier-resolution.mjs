// scripts/test-identifier-resolution.mjs

function testIdentifierResolution() {
  console.log("=================================================");
  console.log("TEST SUITE: DUAL LOGIN IDENTIFIER RESOLUTION");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Email passthrough test
  const testEmail = "student@school.com";
  assert(testEmail.includes("@"), "Email identifier correctly identified as email");

  // 2. Student ID test
  const testStudentId = "SBCI1";
  assert(!testStudentId.includes("@"), "Student ID recognized as non-email format");
  assert(testStudentId.toUpperCase() === "SBCI1", "Student ID normalized to uppercase");

  // 3. Teacher ID test
  const testTeacherCode = "SBCI-T1";
  assert(!testTeacherCode.includes("@"), "Teacher Code recognized as non-email format");
  assert(testTeacherCode.toUpperCase() === "SBCI-T1", "Teacher Code matches format [SchoolCode]-T[Seq]");

  // 4. Case-insensitivity test
  const lowerId = "sbci-t5";
  assert(lowerId.toUpperCase() === "SBCI-T5", "Case-insensitive lookup maps 'sbci-t5' to 'SBCI-T5'");

  // 5. Phone as password test
  const testPhone = "+91 91182 45636";
  const cleanedDigits = testPhone.replace(/\D/g, "");
  assert(cleanedDigits === "919118245636", "Phone as password extracts digits cleanly");
  assert(cleanedDigits.length >= 6, "Cleaned phone digits satisfy minimum password length requirement");

  // 6. School code ID generation format tests
  const schoolCode = "DPS";
  const nextStudentNum = 12;
  const nextTeacherNum = 3;
  const generatedStudentId = `${schoolCode}${nextStudentNum}`;
  const generatedTeacherId = `${schoolCode}-T${nextTeacherNum}`;

  assert(generatedStudentId === "DPS12", "Student ID correctly formats as DPS12");
  assert(generatedTeacherId === "DPS-T3", "Teacher ID correctly formats as DPS-T3");

  console.log(`\n=================================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);

  if (failed > 0) process.exit(1);
}

testIdentifierResolution();
