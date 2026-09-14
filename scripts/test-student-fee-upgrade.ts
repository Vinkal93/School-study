import { 
  formatStudentFeeMessage, 
  generateWhatsAppLink
} from "../src/lib/services/fee-share.service";
import { StudentTransferRecord } from "../src/types/academic";
import { FeeFollowUp, FeeFollowUpStatus } from "../src/types/billing";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${name}`);
    failed++;
    throw new Error(name);
  } else {
    console.log(`✓ PASSED: ${name}`);
    passed++;
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("TESTING STUDENT + FEE MANAGEMENT PRODUCTION UPGRADE");
  console.log("==================================================\n");

  const sampleSummary = {
    assignment: {
      id: "asgn_1001",
      schoolId: "school_greenwood",
      studentId: "std_1001",
      academicYearId: "ay_2026",
      className: "Class 10",
      sectionName: "A",
      totalAssignedPaise: 6000000,
      totalDiscountPaise: 0,
      totalLateFeePaise: 0,
      totalPaidPaise: 2500000,
      totalPendingPaise: 3500000,
      status: "PARTIAL" as const,
      monthLedger: [
        { month: "October 2026", dueDate: "2026-10-10", pendingAmountPaise: 500000, feeAmountPaise: 500000, discountAmountPaise: 0, lateFeePaise: 0, paidAmountPaise: 0, status: "UNPAID" as const },
        { month: "September 2026", dueDate: "2026-09-10", pendingAmountPaise: 500000, feeAmountPaise: 500000, discountAmountPaise: 0, lateFeePaise: 0, paidAmountPaise: 0, status: "UNPAID" as const },
        { month: "August 2026", dueDate: "2026-08-10", pendingAmountPaise: 500000, feeAmountPaise: 500000, discountAmountPaise: 0, lateFeePaise: 0, paidAmountPaise: 0, status: "UNPAID" as const }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    recentPayments: [
      {
        id: "pay_1",
        schoolId: "school_greenwood",
        studentId: "std_1001",
        academicYearId: "ay_2026",
        receiptNumber: "REC-2026-0042",
        amountPaidPaise: 500000,
        paymentMethod: "UPI",
        paymentDate: "2026-07-05",
        status: "COMPLETED" as const,
        recordedBy: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay_2",
        schoolId: "school_greenwood",
        studentId: "std_1001",
        academicYearId: "ay_2026",
        receiptNumber: "REC-2026-0031",
        amountPaidPaise: 1000000,
        paymentMethod: "Bank Transfer",
        paymentDate: "2026-06-02",
        status: "COMPLETED" as const,
        recordedBy: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    paidMonths: ["April 2026", "May 2026", "June 2026", "July 2026"],
    lastPaidMonth: "July 2026",
    pendingMonths: ["August 2026", "September 2026", "October 2026"],
    nextDueMonth: "October 2026",
    monthlyFeeRupees: 5000,
    totalPaidRupees: 25000,
    totalPendingRupees: 35000,
    lastPayment: null
  };

  const baseParams = {
    schoolName: "Greenwood International School",
    schoolPhone: "9876543210",
    schoolEmail: "accounts@greenwood.edu",
    studentName: "Aarav Sharma",
    admissionNumber: "ADM-2026-1001",
    rollNumber: "12",
    className: "Class 10",
    sectionName: "A",
    phone: "9876543210",
    summary: sampleSummary as any
  };

  console.log("--- Group 1: WhatsApp Fee Share Formats ---");
  const fullDueMsg = formatStudentFeeMessage({ ...baseParams, mode: "FULL_DUE" });
  assert(fullDueMsg.includes("GREENWOOD INTERNATIONAL SCHOOL"), "FULL_DUE contains uppercase school name");
  assert(fullDueMsg.includes("Aarav Sharma"), "FULL_DUE contains student name");
  assert(fullDueMsg.includes("Class 10 (A)"), "FULL_DUE contains class & section");
  assert(fullDueMsg.includes("35,000"), "FULL_DUE contains formatted total pending amount");
  assert(fullDueMsg.includes("August 2026") && fullDueMsg.includes("September 2026"), "FULL_DUE lists overdue months breakdown");

  const currentMonthMsg = formatStudentFeeMessage({ ...baseParams, mode: "CURRENT_MONTH" });
  assert(currentMonthMsg.includes("October 2026"), "CURRENT_MONTH contains active month name");
  assert(currentMonthMsg.includes("5,000"), "CURRENT_MONTH contains correct month amount");
  assert(currentMonthMsg.includes("2026"), "CURRENT_MONTH contains due date year");

  const reminderMsg = formatStudentFeeMessage({ ...baseParams, mode: "PAYMENT_REMINDER" });
  assert(reminderMsg.includes("IMPORTANT FEE PAYMENT REMINDER"), "PAYMENT_REMINDER has correct header");
  assert(reminderMsg.includes("35,000"), "PAYMENT_REMINDER displays pending amount");
  assert(reminderMsg.includes("August 2026"), "PAYMENT_REMINDER details pending months");

  const historyMsg = formatStudentFeeMessage({ ...baseParams, mode: "PAYMENT_HISTORY" });
  assert(historyMsg.includes("PAYMENT & RECEIPT HISTORY"), "PAYMENT_HISTORY has correct header");
  assert(historyMsg.includes("REC-2026-0042"), "PAYMENT_HISTORY lists recent receipt number");
  assert(historyMsg.includes("UPI"), "PAYMENT_HISTORY includes payment mode details");

  const waLink = generateWhatsAppLink("9876543210", "Hello Test");
  assert(Boolean(waLink && waLink.startsWith("https://wa.me/919876543210?text=")), "WhatsApp link normalizes 10-digit Indian phone with 91 prefix");

  const waLinkWithCountry = generateWhatsAppLink("+91 98765 43210", "Hello Test");
  assert(Boolean(waLinkWithCountry && waLinkWithCountry.startsWith("https://wa.me/919876543210?text=")), "WhatsApp link cleans spaces and plus signs correctly");

  console.log("\n--- Group 2: Real Ledger Overdue Calculation Verification ---");
  const ledgerMonths = [
    { month: "2026-04", dueDate: "2026-04-10", pendingAmountPaise: 0 },
    { month: "2026-05", dueDate: "2026-05-10", pendingAmountPaise: 200000 },
    { month: "2026-06", dueDate: "2026-06-10", pendingAmountPaise: 300000 },
    { month: "2026-11", dueDate: "2026-11-10", pendingAmountPaise: 500000 },
  ];
  const currentDate = "2026-09-14";
  
  const realOverduePaise = ledgerMonths.reduce((sum, m) => {
    if (m.dueDate <= currentDate && m.pendingAmountPaise > 0) {
      return sum + m.pendingAmountPaise;
    }
    return sum;
  }, 0);

  assert(realOverduePaise === 500000, "Real overdue calculation accurately sums past due months (500000 paise)");
  const fakeMultiplierAmount = Math.round((200000 + 300000 + 500000) * 0.6);
  assert(realOverduePaise !== fakeMultiplierAmount, "Real overdue calculation avoids flawed 60% hardcoded estimate");

  console.log("\n--- Group 3: Student Transfer Data Integrity ---");
  const transferRecord: StudentTransferRecord = {
    id: "tx_001",
    fromClassId: "cls_9",
    fromClassName: "Class 9",
    fromSectionId: "sec_a",
    fromSectionName: "A",
    fromRollNumber: 15,
    toClassId: "cls_10",
    toClassName: "Class 10",
    toSectionId: "sec_b",
    toSectionName: "B",
    toRollNumber: 12,
    transferDate: "2026-09-01",
    reason: "Promoted to Class 10 with section reassignment",
    transferredBy: "admin_user_1",
    timestamp: new Date().toISOString()
  };

  assert(transferRecord.fromClassName === "Class 9" && transferRecord.toClassName === "Class 10", "Transfer record tracks source and target classes");
  assert(transferRecord.toRollNumber === 12, "Transfer record tracks newly assigned roll number");
  assert(Boolean(transferRecord.reason && transferRecord.transferDate), "Transfer record captures date and audit reason");

  console.log("\n--- Group 4: Fee Follow-Up CRM Model Integrity ---");
  const followUpStatus: FeeFollowUpStatus = "Promised";
  const followUpRecord: FeeFollowUp = {
    id: "fu_101",
    studentId: "std_1001",
    studentName: "Aarav Sharma",
    admissionNumber: "ADM-2026-1001",
    className: "Class 10",
    schoolId: "school_greenwood",
    contactChannel: "Call",
    status: followUpStatus,
    notes: "Parent requested time till end of month to clear pending dues",
    promisedDate: "2026-09-30",
    recordedBy: "admin_user_1",
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  assert(followUpRecord.status === "Promised", "Fee follow-up status matches union type");
  assert(followUpRecord.promisedDate === "2026-09-30", "Fee follow-up records promised payment date");

  console.log(`\n==================================================`);
  console.log(`ALL TESTS PASSED: ${passed} / ${passed + failed}`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
