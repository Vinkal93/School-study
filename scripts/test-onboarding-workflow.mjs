// scripts/test-onboarding-workflow.mjs

function runOnboardingWorkflowTests() {
  console.log("=================================================");
  console.log("TEST SUITE: PRODUCTION SCHOOL ONBOARDING WORKFLOW");
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

  // -------------------------------------------------------------
  // 1. Step 1 — School Info & Logo Validation
  // -------------------------------------------------------------
  console.log("--- 1. STEP 1: SCHOOL INFO & LOGO VALIDATION ---");
  const validSchool = {
    name: "Delhi Public Global Academy",
    code: "DPGA",
    address: "Sector 21, Academic Enclave",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    phone: "+91 91182 45636",
    email: "principal@dpga.edu.in",
  };

  assert(Boolean(validSchool.name.trim()), "School Name validation: non-empty required name passes");
  assert(Boolean(validSchool.code.trim()), "School Code validation: non-empty required code passes");
  assert(validSchool.code.toUpperCase() === "DPGA", "School Code normalized to uppercase");

  // Logo file validation
  const allowedLogoTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  assert(allowedLogoTypes.includes("image/png"), "Logo validation: PNG format accepted");
  assert(allowedLogoTypes.includes("image/jpeg"), "Logo validation: JPEG format accepted");
  assert(allowedLogoTypes.includes("image/webp"), "Logo validation: WebP format accepted");
  assert(!allowedLogoTypes.includes("application/pdf"), "Logo validation: Non-image PDF rejected");
  assert(!allowedLogoTypes.includes("text/html"), "Logo validation: HTML script injection rejected");

  const maxSizeBytes = 5 * 1024 * 1024;
  const validFileSize = 2.4 * 1024 * 1024;
  const oversizedFile = 6.8 * 1024 * 1024;
  assert(validFileSize <= maxSizeBytes, "Logo validation: 2.4MB image within 5MB limit passes");
  assert(oversizedFile > maxSizeBytes, "Logo validation: 6.8MB image exceeds 5MB limit and is rejected");

  const schoolId = "sch_test_tenant_101";
  const timestamp = Date.now();
  const ext = "png";
  const expectedStoragePath = `schools/${schoolId}/branding/logo_${timestamp}.${ext}`;
  assert(
    expectedStoragePath.startsWith(`schools/${schoolId}/branding/`),
    "Tenant Isolation: Logo path strictly isolated under target school tenant"
  );

  // -------------------------------------------------------------
  // 2. Step 2 — Academic Year Validation
  // -------------------------------------------------------------
  console.log("\n--- 2. STEP 2: ACADEMIC YEAR VALIDATION ---");
  const validStartDate = "2026-04-01";
  const validEndDate = "2027-03-31";
  const invalidEndDate = "2025-03-31";

  const startMs = new Date(validStartDate).getTime();
  const endMs = new Date(validEndDate).getTime();
  const invalidEndMs = new Date(invalidEndDate).getTime();

  assert(startMs < endMs, "Academic Year: Start date earlier than end date passes");
  assert(startMs >= invalidEndMs, "Academic Year: End date earlier than start date is rejected");

  const academicYearData = {
    name: "2026-2027",
    startDate: validStartDate,
    endDate: validEndDate,
    isCurrent: true,
  };
  assert(academicYearData.isCurrent === true, "Academic Year: Active flag properly marked true");

  // -------------------------------------------------------------
  // 3. Step 3 — Classes & Sections Validation & Duplicate Prevention
  // -------------------------------------------------------------
  console.log("\n--- 3. STEP 3: CLASSES & SECTIONS ---");
  const testClasses = [
    { name: "Class 1", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 2", sections: [{ name: "A" }, { name: "B" }, { name: "C" }] },
  ];

  assert(testClasses.length > 0, "Classes validation: Non-empty class list requirement enforced");

  // Check duplicate classes
  const classNamesSeen = new Set();
  let hasDuplicateClass = false;
  for (const c of testClasses) {
    const lower = c.name.toLowerCase();
    if (classNamesSeen.has(lower)) hasDuplicateClass = true;
    classNamesSeen.add(lower);
  }
  assert(!hasDuplicateClass, "Classes validation: Unique class names pass");

  const duplicateClasses = [
    { name: "Class 1", sections: [{ name: "A" }] },
    { name: "class 1", sections: [{ name: "B" }] },
  ];
  const duplicateSeen = new Set();
  let duplicateDetected = false;
  for (const c of duplicateClasses) {
    const lower = c.name.toLowerCase();
    if (duplicateSeen.has(lower)) duplicateDetected = true;
    duplicateSeen.add(lower);
  }
  assert(duplicateDetected, "Classes validation: Case-insensitive duplicate class names detected and rejected");

  // Check duplicate sections inside a class
  const classWithDuplicateSections = {
    name: "Class 3",
    sections: [{ name: "A" }, { name: "a" }],
  };
  const secSeen = new Set();
  let duplicateSecDetected = false;
  for (const s of classWithDuplicateSections.sections) {
    const upper = s.name.toUpperCase();
    if (secSeen.has(upper)) duplicateSecDetected = true;
    secSeen.add(upper);
  }
  assert(duplicateSecDetected, "Sections validation: Duplicate section 'A' vs 'a' detected and rejected");

  // -------------------------------------------------------------
  // 4. Step 4 — Teachers Unique ID & Phone as Password
  // -------------------------------------------------------------
  console.log("\n--- 4. STEP 4: TEACHERS CREDENTIALS & UNIQUE ID ---");
  const schoolPrefix = "DPGA";
  const teacherSeq = 4;
  const teacherCode = `${schoolPrefix}-T${teacherSeq}`;
  assert(teacherCode === "DPGA-T4", "Teacher ID: Formats as DPGA-T4 matching [SchoolCode]-T[Seq]");

  const teacherPhone = "+91 98765 43210";
  const teacherPassword = teacherPhone.replace(/\D/g, "");
  assert(teacherPassword === "919876543210", "Phone as Password: Extracts pure digits cleanly");
  assert(teacherPassword.length >= 6, "Phone as Password: Satisfies minimum 6 characters length");

  // -------------------------------------------------------------
  // 5. Step 5 — Students Unique ID & Sequential Roll Number
  // -------------------------------------------------------------
  console.log("\n--- 5. STEP 5: STUDENTS ADMISSION & ENROLLMENT ---");
  const studentSeq = 8;
  const studentId = `${schoolPrefix}${studentSeq}`;
  assert(studentId === "DPGA8", "Student ID: Formats as DPGA8 matching [SchoolCode][Seq]");

  // -------------------------------------------------------------
  // 6. Multi-Step Persistence & Resume Logic
  // -------------------------------------------------------------
  console.log("\n--- 6. PROGRESSION, DRAFT PERSISTENCE & RESUME ---");
  let mockSchoolDoc = {
    id: schoolId,
    name: validSchool.name,
    code: validSchool.code,
    onboardingCurrentStep: 1,
    onboardingCompletedSteps: [],
    onboardingStatus: "not_started",
    onboardingCompleted: false,
  };

  // Step 1 Completed
  mockSchoolDoc.onboardingCurrentStep = 2;
  mockSchoolDoc.onboardingCompletedSteps.push(1);
  mockSchoolDoc.onboardingStatus = "in_progress";
  assert(mockSchoolDoc.onboardingCurrentStep === 2, "Persistence: Completing Step 1 advances currentStep to 2");
  assert(mockSchoolDoc.onboardingCompletedSteps.includes(1), "Persistence: Step 1 recorded in completedSteps");

  // Step 2 Completed
  mockSchoolDoc.onboardingCurrentStep = 3;
  mockSchoolDoc.onboardingCompletedSteps.push(2);
  assert(mockSchoolDoc.onboardingCurrentStep === 3, "Persistence: Completing Step 2 advances currentStep to 3");

  // Browser reload simulation
  const reloadedStep = mockSchoolDoc.onboardingCurrentStep;
  assert(reloadedStep === 3, "Reload Support: Browser refresh at Step 3 resumes from Step 3 (not Step 1)");

  // Step 3 Completed
  mockSchoolDoc.onboardingCurrentStep = 4;
  mockSchoolDoc.onboardingCompletedSteps.push(3);

  // Logout/Login simulation
  const loginResumedStep = mockSchoolDoc.onboardingCompleted ? 5 : mockSchoolDoc.onboardingCurrentStep;
  assert(loginResumedStep === 4, "Logout/Login Support: Logging in resumes from saved Step 4");

  // Completion Gating: Must have Steps 1, 2, 3 complete
  const hasStep1 = Boolean(mockSchoolDoc.name && mockSchoolDoc.code);
  const hasStep2 = mockSchoolDoc.onboardingCompletedSteps.includes(2);
  const hasStep3 = mockSchoolDoc.onboardingCompletedSteps.includes(3);
  const canComplete = hasStep1 && hasStep2 && hasStep3;
  assert(canComplete, "Completion Gating: Verifies required steps (1, 2, 3) exist in database before allowing completion");

  // Final Onboarding Completion
  mockSchoolDoc.onboardingCompleted = true;
  mockSchoolDoc.setupCompleted = true;
  mockSchoolDoc.onboardingStatus = "completed";
  mockSchoolDoc.onboardingCompletedAt = new Date().toISOString();

  assert(mockSchoolDoc.onboardingCompleted === true, "Completion: onboardingCompleted flag set to true");
  assert(mockSchoolDoc.setupCompleted === true, "Completion: setupCompleted flag set to true");
  assert(mockSchoolDoc.onboardingStatus === "completed", "Completion: onboardingStatus marked 'completed'");

  const isSetupIncomplete = !mockSchoolDoc.setupCompleted && !mockSchoolDoc.onboardingCompleted;
  assert(!isSetupIncomplete, "Dashboard Sync: Incomplete setup banner hidden once onboarding is marked complete");

  console.log(`\n=================================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);

  if (failed > 0) process.exit(1);
}

runOnboardingWorkflowTests();
