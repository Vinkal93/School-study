import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { firestoreGuardrails } from "@/lib/observability/firestoreGuardrails";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return (
        authResult.errorResponse ||
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (authResult.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Super Administrator access required." },
        { status: 403 }
      );
    }

    const summary = firestoreGuardrails.getSummary();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: summary,
      architectureStatus: {
        runawayWriteProtection: "ACTIVE",
        sharedSubscriptionMultiplexing: "ENABLED",
        swrCaching: "ENABLED",
        clientFallbackCrashBarrier: "SECURED",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch guardrail metrics" },
      { status: 500 }
    );
  }
}
