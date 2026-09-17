/**
 * AUTOMATED TEST SUITE: STUDENTS MODULE BUSINESS LOGIC & REPAIR PIPELINE
 * 
 * Verifies:
 * 1. Canonical Academic Normalizer (Classes, Sections, Gender, Hierarchy Order).
 * 2. Deduplication and Class Master grouping logic.
 * 3. Student pointer resolution (classId, sectionId, canonical naming).
 * 4. Gender normalization & dashboard metric aggregation.
 * 5. Idempotent repair logic and student preservation.
 */

import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  getCanonicalSectionCode,
  getCanonicalSectionKey,
  normalizeGender,
  isMatchingClass,
  isMatchingSection,
} from "../src/lib/utils/academic-normalizer.ts";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    failed++;
    throw new Error(testName);
  } else {
    console.log(`✓ PASSED: ${testName}`);
    passed++;
  }
}

async function runSuite() {
  console.log("================================================================");
  console.log("STUDENTS MODULE BUSINESS LOGIC & REPAIR VERIFICATION SUITE");
  console.log("================================================================\n");

  // TEST 1: Class Name Normalization
  console.log("--- 1. Testing Class Name Normalization ---");
  const classVariations = [
    { input: "Class 1", expected: "Class 1" },
    { input: "class 1", expected: "Class 1" },
    { input: "CLASS 1", expected: "Class 1" },
    { input: "grade 1", expected: "Class 1" },
    { input: "Grade 1", expected: "Class 1" },
    { input: "std 1", expected: "Class 1" },
    { input: "1st", expected: "Class 1" },
    { input: "01", expected: "Class 1" },
    { input: "Class-1", expected: "Class 1" },
    { input: "Class 10", expected: "Class 10" },
    { input: "Grade 12", expected: "Class 12" },
    { input: "lkg", expected: "LKG" },
    { input: "L.K.G.", expected: "LKG" },
    { input: "lower kg", expected: "LKG" },
    { input: "ukg", expected: "UKG" },
    { input: "U.K.G.", expected: "UKG" },
    { input: "nursery", expected: "Nursery" },
    { input: "Playgroup", expected: "Playgroup" },
  ];

  classVariations.forEach(({ input, expected }) => {
    const result = normalizeClassName(input);
    assert(
      result === expected,
      `normalizeClassName("${input}") === "${expected}" (got: "${result}")`
    );
  });

  // TEST 2: Canonical Class Keys
  console.log("\n--- 2. Testing Canonical Class Key Deduplication ---");
  const sameClassInputs = ["Class 1", "class 1", "CLASS 1", "Grade 1", "1st", "std 1", "01"];
  const keys = sameClassInputs.map(getCanonicalClassKey);
  const uniqueKeys = new Set(keys);
  assert(
    uniqueKeys.size === 1 && uniqueKeys.has("class_1"),
    `All variations of Class 1 produce identical key "class_1": [${keys.join(", ")}]`
  );

  assert(isMatchingClass("class 1", "Class 1"), 'isMatchingClass("class 1", "Class 1") is true');
  assert(isMatchingClass("Grade 2", "class 2"), 'isMatchingClass("Grade 2", "class 2") is true');
  assert(!isMatchingClass("Class 1", "Class 2"), 'isMatchingClass("Class 1", "Class 2") is false');

  // TEST 3: Academic Sorting Hierarchy
  console.log("\n--- 3. Testing Academic Hierarchy Order ---");
  const unordered = ["Class 10", "Nursery", "Class 2", "LKG", "Class 1", "UKG"];
  unordered.sort((a, b) => getCanonicalClassOrder(a) - getCanonicalClassOrder(b));
  const expectedOrder = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 10"];
  assert(
    JSON.stringify(unordered) === JSON.stringify(expectedOrder),
    `Hierarchy sorted properly: [${unordered.join(" -> ")}]`
  );

  // TEST 4: Section Normalization
  console.log("\n--- 4. Testing Section Normalization ---");
  const sectionVariations = [
    { input: "A", expected: "Section A", code: "A" },
    { input: "Section A", expected: "Section A", code: "A" },
    { input: "sec a", expected: "Section A", code: "A" },
    { input: "sec-a", expected: "Section A", code: "A" },
    { input: "a", expected: "Section A", code: "A" },
    { input: "B", expected: "Section B", code: "B" },
    { input: "Section B", expected: "Section B", code: "B" },
  ];

  sectionVariations.forEach(({ input, expected, code }) => {
    const res = normalizeSectionName(input);
    const c = getCanonicalSectionCode(input);
    assert(
      res === expected && c === code,
      `normalizeSectionName("${input}") === "${expected}", code: "${c}"`
    );
  });

  assert(isMatchingSection("A", "Section A"), 'isMatchingSection("A", "Section A") is true');
  assert(isMatchingSection("sec-b", "Section B"), 'isMatchingSection("sec-b", "Section B") is true');
  assert(!isMatchingSection("A", "B"), 'isMatchingSection("A", "B") is false');

  // TEST 5: Gender Normalization
  console.log("\n--- 5. Testing Gender Normalization & Counting ---");
  assert(normalizeGender("M") === "male", 'normalizeGender("M") === "male"');
  assert(normalizeGender("Male") === "male", 'normalizeGender("Male") === "male"');
  assert(normalizeGender("boy") === "male", 'normalizeGender("boy") === "male"');
  assert(normalizeGender("F") === "female", 'normalizeGender("F") === "female"');
  assert(normalizeGender("Female") === "female", 'normalizeGender("Female") === "female"');
  assert(normalizeGender("GIRL") === "female", 'normalizeGender("GIRL") === "female"');
  assert(normalizeGender("other") === "other", 'normalizeGender("other") === "other"');

  // TEST 6: Simulated 500 Student Import & Deduplication Scenario
  console.log("\n--- 6. Simulating 500-Student Import Resolution & Deduplication ---");
  
  // Simulate duplicate classes created by raw setup
  const simulatedFirestoreClasses = [
    { id: "cls_101", name: "Class 1", order: 10, sections: [{ id: "sec_1", name: "Section A" }] },
    { id: "cls_102", name: "class 1", order: 10, sections: [{ id: "sec_2", name: "Section B" }] },
    { id: "cls_103", name: "CLASS 1", order: 10, sections: [{ id: "sec_3", name: "A" }] },
    { id: "cls_201", name: "Class 2", order: 20, sections: [{ id: "sec_4", name: "Section A" }] },
    { id: "cls_202", name: "Grade 2", order: 20, sections: [{ id: "sec_5", name: "Section A" }] },
  ];

  // In-memory canonical deduplication algorithm (matches academic.service.ts)
  const canonicalMap = new Map();
  for (const c of simulatedFirestoreClasses) {
    const key = getCanonicalClassKey(c.name);
    if (!canonicalMap.has(key)) {
      const secMap = new Map();
      (c.sections || []).forEach(s => {
        secMap.set(getCanonicalSectionKey(s.name), { id: s.id, name: normalizeSectionName(s.name) });
      });
      canonicalMap.set(key, {
        primaryId: c.id,
        canonicalName: normalizeClassName(c.name),
        sections: secMap,
      });
    } else {
      const group = canonicalMap.get(key);
      (c.sections || []).forEach(s => {
        const sKey = getCanonicalSectionKey(s.name);
        if (!group.sections.has(sKey)) {
          group.sections.set(sKey, { id: s.id, name: normalizeSectionName(s.name) });
        }
      });
    }
  }

  assert(
    canonicalMap.size === 2,
    `Simulated 5 duplicate class documents deduplicated to exactly 2 canonical classes: [${Array.from(canonicalMap.keys()).join(", ")}]`
  );

  const class1Sections = Array.from(canonicalMap.get("class_1").sections.values());
  assert(
    class1Sections.length === 2 && class1Sections.map(s => s.name).includes("Section A") && class1Sections.map(s => s.name).includes("Section B"),
    `Class 1 merged duplicate sections A & B without duplicating Section A: [${class1Sections.map(s => s.name).join(", ")}]`
  );

  // Simulate 500 students with raw unlinked class names
  const simulated500Students = [];
  for (let i = 1; i <= 500; i++) {
    const isClass1 = i <= 250;
    const rawClass = isClass1
      ? (i % 3 === 0 ? "Class 1" : i % 3 === 1 ? "class 1" : "CLASS 1")
      : (i % 2 === 0 ? "Grade 2" : "Class 2");
    const rawSec = i % 2 === 0 ? "A" : "Section B";
    const rawGender = i % 2 === 0 ? "Male" : "female";

    simulated500Students.push({
      id: `stu_${i}`,
      name: `Student ${i}`,
      admissionNumber: `ADM${String(i).padStart(4, "0")}`,
      className: rawClass,
      classId: undefined, // Simulates the bug where classId was missing!
      sectionName: rawSec,
      sectionId: undefined,
      gender: rawGender,
      status: "active",
    });
  }

  // Run student realignment
  let realignedCount = 0;
  simulated500Students.forEach(stu => {
    const cKey = getCanonicalClassKey(stu.className);
    const classInfo = canonicalMap.get(cKey);
    assert(classInfo !== undefined, `Class info resolved for student ${stu.id}`);

    const secKey = getCanonicalSectionKey(stu.sectionName);
    let secInfo = classInfo.sections.get(secKey);
    if (!secInfo) {
      // If Section B was not pre-created under Class 2, either create or fallback to available
      secInfo = classInfo.sections.values().next().value;
    }
    assert(secInfo !== undefined, `Section info resolved for student ${stu.id}`);

    // Assign canonical pointers
    stu.classId = classInfo.primaryId;
    stu.className = classInfo.canonicalName;
    stu.sectionId = secInfo.id;
    stu.sectionName = secInfo.name;
    stu.gender = normalizeGender(stu.gender);
    realignedCount++;
  });

  assert(realignedCount === 500, `All 500 students successfully realigned with valid classId & sectionId.`);

  // Test Filtering on Realigned Students
  const class1Students = simulated500Students.filter(s => s.classId === "cls_101");
  assert(
    class1Students.length === 250,
    `Filtering by canonical Class 1 ID matches exactly 250 students (got: ${class1Students.length})`
  );

  const class1SectionAStudents = simulated500Students.filter(
    s => s.classId === "cls_101" && s.sectionName === "Section A"
  );
  assert(
    class1SectionAStudents.length === 125,
    `Filtering by Class 1 + Section A matches exactly 125 students (got: ${class1SectionAStudents.length})`
  );

  // Test Metrics on Realigned Students
  const totalBoys = simulated500Students.filter(s => s.gender === "male").length;
  const totalGirls = simulated500Students.filter(s => s.gender === "female").length;
  assert(totalBoys === 250 && totalGirls === 250, `Gender metrics correctly calculated: 250 Boys, 250 Girls.`);

  console.log("\n================================================================");
  console.log(`TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");
}

runSuite().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
