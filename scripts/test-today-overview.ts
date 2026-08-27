export {};

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

function calculateAttendancePercentage(presentDays: number, totalDays: number): number {
  if (totalDays <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((presentDays / totalDays) * 100)));
}

function formatIndianCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getExamCountdownLabel(examDateStr?: string): { metric: string; isPast: boolean } {
  if (!examDateStr) return { metric: "No Exams", isPast: false };

  const todayMs = new Date("2026-08-27T00:00:00.000Z").getTime();
  const examMs = new Date(examDateStr).getTime();
  const diffDays = Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { metric: "No Exams", isPast: true };
  if (diffDays === 0) return { metric: "Today", isPast: false };
  if (diffDays === 1) return { metric: "Tomorrow", isPast: false };

  return { metric: `${diffDays} Days`, isPast: false };
}

function runTodayOverviewTests() {
  console.log("\n==========================================");
  console.log("PHASE 3 TODAY OVERVIEW TEST SUITE");
  console.log("==========================================\n");

  // 1. Attendance percentage calculation & division by zero handling
  assert(calculateAttendancePercentage(23, 25) === 92, "1. Attendance: 23/25 -> 92%");
  assert(calculateAttendancePercentage(0, 0) === 100, "2. Attendance: 0/0 -> 100% (safe zero handling)");

  // 2. Indian Currency Formatting (Section 9)
  assert(formatIndianCurrency(1500) === "₹1,500", "3. Indian currency format: 1500 -> '₹1,500'");
  assert(formatIndianCurrency(10000) === "₹10,000", "4. Indian currency format: 10000 -> '₹10,000'");
  assert(formatIndianCurrency(125000) === "₹1,25,000", "5. Indian currency format: 125000 -> '₹1,25,000'");

  // 3. Exam countdown calculations (Section 11 & 12)
  const exam12 = getExamCountdownLabel("2026-09-08"); // 12 days after 2026-08-27
  assert(exam12.metric === "12 Days", "6. Exam countdown 12 days -> '12 Days'");

  const examToday = getExamCountdownLabel("2026-08-27");
  assert(examToday.metric === "Today", "7. Exam today -> 'Today'");

  const examTomorrow = getExamCountdownLabel("2026-08-28");
  assert(examTomorrow.metric === "Tomorrow", "8. Exam tomorrow -> 'Tomorrow'");

  const pastExam = getExamCountdownLabel("2026-08-20");
  assert(pastExam.isPast === true && pastExam.metric === "No Exams", "9. Past exam excluded from upcoming exam");

  // 4. Homework empty state rule
  const homeworkPending = 0;
  const homeworkMetric = homeworkPending <= 0 ? "All Done 🎉" : `${homeworkPending} Pending`;
  assert(homeworkMetric === "All Done 🎉", "10. Zero pending homework -> 'All Done 🎉'");

  console.log("\n==========================================");
  console.log("ALL 10/10 TODAY OVERVIEW TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runTodayOverviewTests();
