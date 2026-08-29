import { NextResponse } from "next/server";
import {
  getFinanceSummary,
  getCashflowSummary,
  getRevenueChartData,
  getPlanWiseRevenue,
  getSchoolWiseRevenue,
  getBillingCycleAnalytics,
  getCouponImpactAnalytics,
  getPaymentHealthStats,
  detectFinancialAnomalies,
  DateFilterInput,
} from "@/lib/billing/finance";
import { createBillingAuditLog } from "@/lib/billing";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get("preset") as DateFilterInput["preset"] || "this_month";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const filter: DateFilterInput = { preset, startDate, endDate };

    const [summary, cashflow, chartData, planRevenue, schoolRevenue, cycleStats, couponStats, healthStats, anomalies] =
      await Promise.all([
        getFinanceSummary(filter),
        getCashflowSummary(filter),
        getRevenueChartData("daily", filter),
        getPlanWiseRevenue(filter),
        getSchoolWiseRevenue(filter),
        getBillingCycleAnalytics(filter),
        getCouponImpactAnalytics(filter),
        getPaymentHealthStats(filter),
        detectFinancialAnomalies(),
      ]);

    // Audit log
    await createBillingAuditLog(
      "super_admin",
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      "all",
      { actionType: "FINANCE_REPORT_VIEW", preset, startDate, endDate, timestamp: new Date().toISOString() }
    );

    return NextResponse.json({
      summary,
      cashflow,
      chartData,
      planRevenue,
      schoolRevenue,
      billingCycleStats: cycleStats,
      couponStats,
      paymentHealth: healthStats,
      anomaliesCount: anomalies.length,
    });
  } catch (error: any) {
    console.error("Super Admin Finance API Error:", error);
    return NextResponse.json(
      { error: "Failed to load super admin finance analytics: " + (error.message || "") },
      { status: 500 }
    );
  }
}
