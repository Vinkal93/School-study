import { NextResponse } from "next/server";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import { getFeeTransactions } from "@/lib/services/fee.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, format } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_exports");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee report export feature is not included in your current plan." }, { status: 403 });
    }

    const transactions = await getFeeTransactions(schoolId);

    if (format === "csv") {
      const headers = ["Receipt No", "Student Name", "Admission No", "Class", "Fee Type", "Paid Amount (₹)", "Discount (₹)", "Late Fee (₹)", "Payment Method", "Date", "Status"];
      const rows = transactions.map((t) => [
        t.receiptNumber,
        `"${t.studentName}"`,
        t.admissionNumber,
        t.className,
        t.feeType,
        (t.amountPaidPaise / 100).toFixed(2),
        (t.discountPaise / 100).toFixed(2),
        (t.lateFeePaise / 100).toFixed(2),
        t.paymentMethod,
        t.paymentDate.slice(0, 10),
        t.status,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fee_collection_report_${schoolId}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: transactions.length,
      reportUrl: `/api/fees/reports/export?schoolId=${schoolId}&format=csv`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate fee export" }, { status: 500 });
  }
}
