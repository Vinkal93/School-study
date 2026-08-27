export {};

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

function extractFirstName(fullName: string): string {
  if (!fullName) return "Student";
  return fullName.trim().split(" ")[0] || "Student";
}

function getTimeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatNotificationBadge(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  if (unreadCount >= 10) return "9+";
  return String(unreadCount);
}

function runStudentHeaderTests() {
  console.log("\n==========================================");
  console.log("PHASE 1 STUDENT DASHBOARD HEADER TEST SUITE");
  console.log("==========================================\n");

  // 1. First Name Dynamic Extraction
  assert(extractFirstName("Rahul Kumar") === "Rahul", "1. First name extraction: 'Rahul Kumar' -> 'Rahul'");
  assert(extractFirstName("Aman Kumar") === "Aman", "2. First name extraction: 'Aman Kumar' -> 'Aman'");
  assert(extractFirstName("Priya Singh") === "Priya", "3. First name extraction: 'Priya Singh' -> 'Priya'");

  // 2. Time-of-day greeting calculation
  assert(getTimeOfDayGreeting(9) === "Good Morning", "4. Time-of-day greeting (09:00) -> 'Good Morning'");
  assert(getTimeOfDayGreeting(14) === "Good Afternoon", "5. Time-of-day greeting (14:00) -> 'Good Afternoon'");
  assert(getTimeOfDayGreeting(19) === "Good Evening", "6. Time-of-day greeting (19:00) -> 'Good Evening'");

  // 3. Notification Badge Formatting Rules
  assert(formatNotificationBadge(0) === null, "7. Notification count 0 -> no badge (null)");
  assert(formatNotificationBadge(1) === "1", "8. Notification count 1 -> badge '1'");
  assert(formatNotificationBadge(3) === "3", "9. Notification count 3 -> badge '3'");
  assert(formatNotificationBadge(9) === "9", "10. Notification count 9 -> badge '9'");
  assert(formatNotificationBadge(10) === "9+", "11. Notification count 10 -> badge '9+'");
  assert(formatNotificationBadge(25) === "9+", "12. Notification count 25 -> badge '9+'");

  console.log("\n==========================================");
  console.log("ALL 12/12 STUDENT HEADER TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runStudentHeaderTests();
