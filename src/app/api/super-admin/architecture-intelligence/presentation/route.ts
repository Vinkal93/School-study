import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import {
  INVESTOR_PRESENTATION_SLIDES,
  getAuthoritativeBusinessMetrics,
  hasArchitecturePermission,
} from "@/lib/services/architecture-intelligence.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) return authResult.errorResponse;
    const user = authResult.user!;

    if (!hasArchitecturePermission(user.role, "architecture_intelligence.view")) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Missing architecture_intelligence.view permission." },
        { status: 403 }
      );
    }

    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.STANDARD_API, user.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const businessMetrics = await getAuthoritativeBusinessMetrics();

    // Enrich slides with live verified metrics where appropriate
    const slides = INVESTOR_PRESENTATION_SLIDES.map((slide) => {
      if (slide.id === 8 && slide.highlightMetrics) {
        return {
          ...slide,
          highlightMetrics: [
            { label: "Paying Schools", value: `${businessMetrics.paidSchools}+`, detail: "Actively subscribing institutions" },
            { label: "Students Managed", value: `${businessMetrics.totalStudents.toLocaleString()}+`, detail: "Active student profiles" },
            { label: "Annual Retention", value: `${(100 - businessMetrics.churnRatePercent).toFixed(1)}%`, detail: `${businessMetrics.churnRatePercent}% annualized churn rate` },
          ],
        };
      }
      if (slide.id === 9 && slide.highlightMetrics) {
        return {
          ...slide,
          highlightMetrics: [
            { label: "Annual Run Rate (ARR)", value: `₹${(businessMetrics.annualRecurringRevenueRunRateInr / 100000).toFixed(1)} Lakhs`, detail: "Month-over-month run rate" },
            { label: "Gross Margin", value: `${businessMetrics.grossMarginEstimatePercent}%`, detail: "High-margin serverless operational model" },
            { label: "ARPU", value: `₹${businessMetrics.averageRevenuePerPaidSchoolInr.toLocaleString()}`, detail: "Per paying institution / month" },
          ],
        };
      }
      return slide;
    });

    return NextResponse.json({
      success: true,
      data: {
        title: "School Study — Investor Deck & Architecture Overview",
        version: "5.0-Enterprise",
        lastFreshnessCheck: new Date().toISOString(),
        slides,
      },
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/architecture-intelligence/presentation error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load investor presentation." },
      { status: 500 }
    );
  }
}
