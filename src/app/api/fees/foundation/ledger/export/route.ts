import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getStudentLedger,
  getAccountLedger,
} from "@/lib/services/fee-ledger.service";
import { logFinancialAudit } from "@/lib/services/fee-foundation.service";
import type { PaymentMethod } from "@/types/fee-foundation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      exportType, // "student_ledger" | "cash_ledger" | "bank_ledger"
      studentId,
      accountType = "CASH",
      academicYearId,
      startDate,
      endDate,
    } = body;

    let targetSchoolId = "";
    if (authResult.isAuthenticated && authResult.user) {
      targetSchoolId =
        authResult.user.role === "super_admin"
          ? clientSchoolId || authResult.user.schoolId || ""
          : authResult.user.schoolId || "";
    } else if (clientSchoolId) {
      targetSchoolId = clientSchoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Unauthorized or missing schoolId" }, { status: 401 });
    }

    let csvContent = "";
    let filename = `ledger_export_${Date.now()}.csv`;

    if (exportType === "student_ledger") {
      if (!studentId) {
        return NextResponse.json({ error: "studentId is required for student ledger export" }, { status: 400 });
      }

      const { summary, entries } = await getStudentLedger(targetSchoolId, studentId, {
        academicYearId,
        startDate,
        endDate,
      });

      filename = `student_ledger_${summary.admissionNumber || studentId}_${Date.now()}.csv`;

      const headers = [
        "Date",
        "Reference",
        "Type",
        "Description",
        "Fee Head",
        "Debit (INR)",
        "Credit (INR)",
        "Running Balance (INR)",
        "Mode",
      ];

      const rows = entries.map((e) => [
        `"${e.dateFormatted || e.date.slice(0, 10)}"`,
        `"${e.reference}"`,
        `"${e.type}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.feeHeadName || "—"}"`,
        e.debitRupees,
        e.creditRupees,
        e.balanceRupees,
        `"${e.paymentMethod || "—"}"`,
      ]);

      // Add summary header block
      const meta = [
        `"Student Statement: ${summary.studentName} (${summary.admissionNumber}) - Class ${summary.className}"`,
        `"Opening Balance: ₹${summary.openingBalanceRupees}"`,
        `"Total Charges: ₹${summary.totalChargesRupees}"`,
        `"Total Concessions/Waivers: ₹${summary.totalDiscountsRupees}"`,
        `"Total Paid: ₹${summary.totalPaidRupees}"`,
        `"Total Refunds: ₹${summary.totalRefundsRupees}"`,
        `"Closing Outstanding Due: ₹${summary.closingOutstandingRupees}"`,
        "",
      ];

      csvContent = [...meta, headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      // Cash / Bank Account Ledger
      const targetAccount = (accountType || "ALL").toUpperCase() as PaymentMethod | "ALL";
      const { summary, entries } = await getAccountLedger(targetSchoolId, targetAccount, {
        academicYearId,
        startDate,
        endDate,
      });

      filename = `${targetAccount.toLowerCase()}_ledger_${Date.now()}.csv`;

      const headers = [
        "Date",
        "Reference",
        "Account",
        "Student Name",
        "Admission No",
        "Description",
        "Inflow / Debit (INR)",
        "Outflow / Credit (INR)",
        "Running Balance (INR)",
      ];

      const rows = entries.map((e) => [
        `"${e.dateFormatted || e.date.slice(0, 10)}"`,
        `"${e.reference}"`,
        `"${e.accountType}"`,
        `"${e.studentName || "—"}"`,
        `"${e.admissionNumber || "—"}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        e.inflowDebitRupees,
        e.outflowCreditRupees,
        e.balanceRupees,
      ]);

      const meta = [
        `"${summary.accountLabel} Statement"`,
        `"Total Receipts (Inflow): ₹${summary.totalReceiptsRupees}"`,
        `"Total Refunds (Outflow): ₹${summary.totalRefundsRupees}"`,
        `"Net Closing Balance: ₹${summary.closingBalanceRupees}"`,
        "",
      ];

      csvContent = [...meta, headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    // Log Financial Audit
    await logFinancialAudit(
      targetSchoolId,
      {
        id: authResult.user?.uid || "staff",
        role: authResult.user?.role || "admin",
        name: authResult.user?.name || "Staff",
      },
      "CREATE",
      "Adjustment",
      `ledger_export_${Date.now()}`,
      null,
      { exportType, studentId, accountType },
      `Exported ${exportType} as CSV`
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/ledger/export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to export ledger" },
      { status: 500 }
    );
  }
}
