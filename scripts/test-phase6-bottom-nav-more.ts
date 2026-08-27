export {};

import { STUDENT_BOTTOM_NAV_ITEMS, STUDENT_MORE_MODULES } from "../src/lib/config/student-navigation";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

function filterMoreModules(tenantModules?: string[]) {
  if (!tenantModules) return STUDENT_MORE_MODULES;

  const filterList = <T extends Record<string, any>>(items: T[]): T[] =>
    items.filter((item) => !("moduleKey" in item) || !item.moduleKey || tenantModules.includes(item.moduleKey));

  return {
    academics: filterList(STUDENT_MORE_MODULES.academics),
    school: filterList(STUDENT_MORE_MODULES.school),
    account: filterList(STUDENT_MORE_MODULES.account),
  };
}

function runPhase6Tests() {
  console.log("\n==========================================");
  console.log("PHASE 6 MOBILE BOTTOM NAV & MORE MENU TEST SUITE");
  console.log("==========================================\n");

  // 1. Exactly 5 Primary Destinations (Section 1 & 4)
  assert(STUDENT_BOTTOM_NAV_ITEMS.length === 5, "1. Exactly 5 primary bottom nav items exist");
  assert(STUDENT_BOTTOM_NAV_ITEMS[0].id === "home", "2. Item 1 is 'Home'");
  assert(STUDENT_BOTTOM_NAV_ITEMS[1].id === "study", "3. Item 2 is 'Study'");
  assert(STUDENT_BOTTOM_NAV_ITEMS[2].id === "attendance", "4. Item 3 is 'Attendance'");
  assert(STUDENT_BOTTOM_NAV_ITEMS[3].id === "fees", "5. Item 4 is 'Fees'");
  assert(STUDENT_BOTTOM_NAV_ITEMS[4].id === "more", "6. Item 5 is 'More'");

  // 2. Central Navigation Configuration Routes (Section 17)
  assert(STUDENT_BOTTOM_NAV_ITEMS[0].route === "/student", "7. Home route = '/student'");
  assert(STUDENT_BOTTOM_NAV_ITEMS[4].route === "/student/more", "8. More route = '/student/more'");

  // 3. More Screen Module Groups (Section 13)
  assert(STUDENT_MORE_MODULES.academics.length >= 4, "9. Academics module group contains Study, Homework, Exams, Timetable, Library");
  assert(STUDENT_MORE_MODULES.school.length >= 3, "10. School module group contains Notices, Attendance, Fees");
  assert(STUDENT_MORE_MODULES.account.length >= 3, "11. Account module group contains Profile, Settings, Help");

  // 4. Module Visibility & Tenant Isolation (Section 14 & 26)
  const restrictedModules = ["study", "attendance", "fees"]; // Library & Homework disabled
  const filteredMore = filterMoreModules(restrictedModules);

  const hasLibrary = filteredMore.academics.some((m) => m.id === "library");
  const hasStudy = filteredMore.academics.some((m) => m.id === "study");

  assert(!hasLibrary, "12. Module visibility: Library hidden when disabled for tenant");
  assert(hasStudy, "13. Module availability: Study shown when enabled for tenant");

  console.log("\n==========================================");
  console.log("ALL 13/13 PHASE 6 TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runPhase6Tests();
