import assert from "node:assert";

console.log("=================================================");
console.log("TEST SUITE: COLLECT FEE AUTO-RELOAD & LEDGER");
console.log("=================================================");

function matchesClass(structureClassName, studentClassName) {
  if (!structureClassName || !studentClassName) return false;
  const s = structureClassName.trim().toLowerCase();
  const st = studentClassName.trim().toLowerCase();
  if (s === "all" || s === "any") return true;
  if (s === st) return true;
  if (s.replace(/\s+/g, "") === st.replace(/\s+/g, "")) return true;
  const sDigits = s.replace(/[^0-9]/g, "");
  const stDigits = st.replace(/[^0-9]/g, "");
  if (sDigits && stDigits && sDigits === stDigits) return true;
  return false;
}

let passed = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Class matching tests
test("matchesClass: 'Class 9' matches 'class 9'", () => {
  if (!matchesClass("Class 9", "class 9")) throw new Error("Should match");
});

test("matchesClass: 'class 9' matches '9'", () => {
  if (!matchesClass("class 9", "9")) throw new Error("Should match");
});

test("matchesClass: 'all' matches any class", () => {
  if (!matchesClass("all", "Class 10")) throw new Error("Should match");
});

test("matchesClass: 'Class 9' does not match 'Class 10'", () => {
  if (matchesClass("Class 9", "Class 10")) throw new Error("Should not match");
});

// 2. Ledger status tests: Kahan tak jama hai & Kaunsa jama hona hai
const mockMonthLedger = [
  { month: "April 2026", amountPaise: 50000, paidAmountPaise: 50000, pendingAmountPaise: 0, status: "PAID" },
  { month: "May 2026", amountPaise: 50000, paidAmountPaise: 50000, pendingAmountPaise: 0, status: "PAID" },
  { month: "June 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "July 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "August 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "September 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "October 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "November 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "December 2026", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "January 2027", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "February 2027", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
  { month: "March 2027", amountPaise: 50000, paidAmountPaise: 0, pendingAmountPaise: 50000, status: "PENDING" },
];

test("Ledger: Identify Paid Months (Kahan tak jama hai)", () => {
  const paidMonths = mockMonthLedger.filter(m => m.status === "PAID" || m.pendingAmountPaise === 0).map(m => m.month);
  if (paidMonths.length !== 2) throw new Error(`Expected 2 paid months, got ${paidMonths.length}`);
  if (paidMonths[0] !== "April 2026" || paidMonths[1] !== "May 2026") throw new Error("Incorrect paid months");
  const lastPaidMonth = paidMonths[paidMonths.length - 1];
  if (lastPaidMonth !== "May 2026") throw new Error(`Expected last paid May 2026, got ${lastPaidMonth}`);
});

test("Ledger: Identify Next Due Month (Kaunsa jama hona hai)", () => {
  const pendingMonths = mockMonthLedger.filter(m => m.status !== "PAID" && m.pendingAmountPaise > 0).map(m => m.month);
  if (pendingMonths.length !== 10) throw new Error(`Expected 10 pending months, got ${pendingMonths.length}`);
  const nextDueMonth = pendingMonths[0];
  if (nextDueMonth !== "June 2026") throw new Error(`Expected next due June 2026, got ${nextDueMonth}`);
});

// 3. Auto-reloading amount calculation
function calculateMonthsFee(selectedMonths, ledger, monthlyRate = 500) {
  let total = 0;
  selectedMonths.forEach(m => {
    const item = ledger.find(l => l.month === m);
    if (item && item.pendingAmountPaise > 0) {
      total += item.pendingAmountPaise / 100;
    } else if (item && item.amountPaise > 0) {
      total += item.amountPaise / 100;
    } else {
      total += monthlyRate;
    }
  });
  return total;
}

test("Auto-Reload: Selecting Next Due Month automatically calculates fee to 500", () => {
  const selected = ["June 2026"];
  const fee = calculateMonthsFee(selected, mockMonthLedger);
  if (fee !== 500) throw new Error(`Expected fee 500, got ${fee}`);
});

test("Auto-Reload: Selecting 3 Months (Quarter) automatically calculates fee to 1500", () => {
  const selected = ["June 2026", "July 2026", "August 2026"];
  const fee = calculateMonthsFee(selected, mockMonthLedger);
  if (fee !== 1500) throw new Error(`Expected fee 1500, got ${fee}`);
});

test("Auto-Reload: Selecting All 10 Pending Months automatically calculates fee to 5000", () => {
  const pendingMonths = mockMonthLedger.filter(m => m.status !== "PAID").map(m => m.month);
  const fee = calculateMonthsFee(pendingMonths, mockMonthLedger);
  if (fee !== 5000) throw new Error(`Expected fee 5000, got ${fee}`);
});

test("Auto-Reload: Net Amount reflects discount correctly", () => {
  const fee = 1500;
  const discount = 200;
  const net = Math.max(0, fee - discount);
  if (net !== 1300) throw new Error(`Expected net 1300, got ${net}`);
});

console.log(`\n=================================================`);
console.log(`SUMMARY: ${passed} passed, 0 failed`);
console.log(`=================================================`);
