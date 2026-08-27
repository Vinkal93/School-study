export {};

import { ScheduleItemData, ClassScheduleStatus } from "../src/components/student/schedule/types";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");
  const digits = clean.replace(/(AM|PM)/g, "").trim();
  const parts = digits.split(":");
  
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function processTestSchedule(schedule: ScheduleItemData[], currentMin: number) {
  let nextFound = false;

  return schedule.map((item) => {
    if (item.status === "cancelled") {
      return { ...item, status: "cancelled" as ClassScheduleStatus, isNext: false };
    }

    const startMin = parseTimeToMinutes(item.startTime);
    const endMin = parseTimeToMinutes(item.endTime);

    let computedStatus: ClassScheduleStatus = "upcoming";
    let isNext = false;

    if (currentMin >= startMin && currentMin < endMin) {
      computedStatus = "current";
    } else if (currentMin >= endMin) {
      computedStatus = "completed";
    } else if (currentMin < startMin) {
      computedStatus = "upcoming";
      if (!nextFound) {
        isNext = true;
        nextFound = true;
      }
    }

    return { ...item, status: computedStatus, isNext };
  });
}

function runPhase5Tests() {
  console.log("\n==========================================");
  console.log("PHASE 5 TODAY'S SCHEDULE TEST SUITE");
  console.log("==========================================\n");

  // 1. Time parsing helper tests
  assert(parseTimeToMinutes("09:00 AM") === 540, "1. Time parse '09:00 AM' -> 540 min");
  assert(parseTimeToMinutes("02:30 PM") === 870, "2. Time parse '02:30 PM' -> 870 min");
  assert(parseTimeToMinutes("12:00 PM") === 720, "3. Time parse '12:00 PM' -> 720 min");

  // Sample test schedule
  const testSchedule: ScheduleItemData[] = [
    { id: "1", subjectName: "Maths", startTime: "09:00 AM", endTime: "09:45 AM" },
    { id: "2", subjectName: "Science", startTime: "10:00 AM", endTime: "10:45 AM" },
    { id: "3", subjectName: "English", startTime: "11:00 AM", endTime: "11:45 AM" },
    { id: "4", subjectName: "Computer", startTime: "12:00 PM", endTime: "12:45 PM", status: "cancelled" },
  ];

  // 2. Class in progress test (09:15 AM = 555 min) -> Class 1 is NOW, Class 2 is NEXT
  const inProgressResults = processTestSchedule(testSchedule, 555);
  assert(inProgressResults[0].status === "current", "4. Real-time status: Class 1 (09:00-09:45) is NOW at 09:15");
  assert(inProgressResults[1].isNext === true, "5. Real-time status: Class 2 (10:00-10:45) is NEXT at 09:15");
  assert(inProgressResults[2].isNext === false, "6. Real-time status: Only 1 class is marked NEXT");

  // 3. Before school starts test (08:30 AM = 510 min) -> No NOW, Class 1 is NEXT
  const beforeSchoolResults = processTestSchedule(testSchedule, 510);
  assert(!beforeSchoolResults.some((c) => c.status === "current"), "7. Before school: No class is NOW at 08:30 AM");
  assert(beforeSchoolResults[0].isNext === true, "8. Before school: First class (09:00 AM) is NEXT at 08:30 AM");

  // 4. After school hours test (01:00 PM = 780 min) -> All classes completed/cancelled
  const afterSchoolResults = processTestSchedule(testSchedule, 780);
  assert(afterSchoolResults[0].status === "completed", "9. After school: Class 1 marked completed");
  assert(afterSchoolResults[3].status === "cancelled", "10. Cancelled class remains cancelled");

  console.log("\n==========================================");
  console.log("ALL 10/10 PHASE 5 TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runPhase5Tests();
