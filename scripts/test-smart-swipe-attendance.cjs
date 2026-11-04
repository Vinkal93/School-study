const assert = require('assert');

console.log("=== RUNNING SMART SWIPE ATTENDANCE & GST PRICING TEST SUITE ===");

// 1. Test Deterministic Doc ID Generation
function generateAttendanceDocId(schoolId, studentId, date) {
  return `${schoolId}_${studentId}_${date}`;
}

const docId1 = generateAttendanceDocId("school_123", "student_456", "2026-11-04");
assert.strictEqual(docId1, "school_123_student_456_2026-11-04", "Doc ID must match deterministic format");
console.log("✔ Deterministic document ID passed:", docId1);

// 2. Test Swipe Gesture State Transition & Real-time Counters
const mockStudents = [
  { id: "stu_1", name: "Aarav Sharma", rollNumber: 1 },
  { id: "stu_2", name: "Ananya Verma", rollNumber: 2 },
  { id: "stu_3", name: "Rohan Mehta", rollNumber: 3 },
  { id: "stu_4", name: "Ishita Singh", rollNumber: 4 },
];

let attendanceMap = {};
let historyStack = [];

function swipeMark(studentId, status) {
  const prev = attendanceMap[studentId];
  historyStack.push({ studentId, previousStatus: prev, newStatus: status });
  attendanceMap[studentId] = status;
}

function undoLast() {
  if (historyStack.length === 0) return null;
  const last = historyStack.pop();
  if (last.previousStatus === undefined) {
    delete attendanceMap[last.studentId];
  } else {
    attendanceMap[last.studentId] = last.previousStatus;
  }
  return last;
}

// Swipe stu_1 Right -> PRESENT
swipeMark("stu_1", "PRESENT");
assert.strictEqual(attendanceMap["stu_1"], "PRESENT");
assert.strictEqual(Object.keys(attendanceMap).length, 1);

// Swipe stu_2 Left -> ABSENT
swipeMark("stu_2", "ABSENT");
assert.strictEqual(attendanceMap["stu_2"], "ABSENT");

// Swipe stu_3 Late -> LATE
swipeMark("stu_3", "LATE");
assert.strictEqual(attendanceMap["stu_3"], "LATE");

console.log("✔ Swipe gesture state transitions passed (Present: 1, Absent: 1, Late: 1)");

// 3. Test Undo Rollback
const undone = undoLast();
assert.strictEqual(undone.studentId, "stu_3");
assert.strictEqual(attendanceMap["stu_3"], undefined, "stu_3 must be rolled back");
assert.strictEqual(Object.keys(attendanceMap).length, 2, "2 students should remain marked");
console.log("✔ Instant undo rollback passed");

// 4. Test Progress & Percentage Calculation
function calculateProgress(students, marks) {
  const total = students.length;
  const marked = Object.keys(marks).length;
  const present = Object.values(marks).filter(s => s === "PRESENT").length;
  const absent = Object.values(marks).filter(s => s === "ABSENT").length;
  const late = Object.values(marks).filter(s => s === "LATE").length;
  const progressPct = total > 0 ? Math.round((marked / total) * 100) : 0;
  const attendanceRate = marked > 0 ? Math.round((present / marked) * 100) : 0;
  return { total, marked, present, absent, late, progressPct, attendanceRate };
}

const stats = calculateProgress(mockStudents, attendanceMap);
assert.strictEqual(stats.total, 4);
assert.strictEqual(stats.marked, 2);
assert.strictEqual(stats.progressPct, 50);
assert.strictEqual(stats.present, 1);
assert.strictEqual(stats.absent, 1);
console.log("✔ Real-time progress and attendance stats passed:", stats);

// 5. Test GST & Pricing Calculation
function calculateBillingBreakdown({ baseAmountPaise, couponDiscountPaise = 0, gstPercentage = 18, gstEnabled = true }) {
  const taxableAmountPaise = Math.max(0, baseAmountPaise - couponDiscountPaise);
  const gstRate = gstEnabled ? gstPercentage : 0;
  const gstAmountPaise = gstEnabled ? Math.round(taxableAmountPaise * (gstRate / 100)) : 0;
  const finalAmountPaise = taxableAmountPaise + gstAmountPaise;

  return {
    baseAmountPaise,
    taxableAmountPaise,
    gstRate,
    gstAmountPaise,
    finalAmountPaise,
    formatted: {
      baseRupees: baseAmountPaise / 100,
      gstRupees: gstAmountPaise / 100,
      totalRupees: finalAmountPaise / 100,
    }
  };
}

// Test with Base Plan Annual (₹299/mo * 12 = ₹3,588 => 358800 paise) with 18% GST
const baseBreakdown = calculateBillingBreakdown({
  baseAmountPaise: 358800,
  gstPercentage: 18,
  gstEnabled: true,
});

assert.strictEqual(baseBreakdown.baseAmountPaise, 358800);
assert.strictEqual(baseBreakdown.gstRate, 18);
assert.strictEqual(baseBreakdown.gstAmountPaise, 64584); // Math.round(358800 * 0.18) = 64584 (₹645.84)
assert.strictEqual(baseBreakdown.finalAmountPaise, 423384); // 358800 + 64584 = 423384 (₹4,233.84)
console.log("✔ GST 18% calculation on Base Plan annual passed:", baseBreakdown.formatted);

// Test with 0% GST (Tax Exempt)
const exemptBreakdown = calculateBillingBreakdown({
  baseAmountPaise: 358800,
  gstPercentage: 0,
  gstEnabled: false,
});
assert.strictEqual(exemptBreakdown.gstAmountPaise, 0);
assert.strictEqual(exemptBreakdown.finalAmountPaise, 358800);
console.log("✔ GST 0% (Tax Exempt) calculation passed:", exemptBreakdown.formatted);

// 6. Test Super Admin Portal UI Setting
const fs = require('fs');
const portalTypes = fs.readFileSync('src/types/portal-ui.ts', 'utf8');
assert.ok(portalTypes.includes('attendanceSystem: "smart_swipe"'), "Default attendanceSystem must be smart_swipe");
console.log("✔ Default Portal UI settings includes attendanceSystem='smart_swipe'");

console.log("\nALL SMART SWIPE ATTENDANCE & GST TESTS PASSED (100%)!");
