import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { checkAndNotifyExpiringSchools } from "@/lib/billing/expiryNotifier";

/**
 * POST /api/super-admin/subscriptions/check-expiring
 * Runs authoritative scan of school subscriptions and creates idempotent notifications for Super Admin.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const summary = await checkAndNotifyExpiringSchools();
    return NextResponse.json({
      success: true,
      message: `Checked ${summary.checkedCount} schools. Found ${summary.expiringCount} expiring within ${summary.thresholdDays} days. Generated ${summary.notifiedCount} new notifications.`,
      summary,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/subscriptions/check-expiring error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run expiry notification check" },
      { status: 500 }
    );
  }
}

export const GET = POST;
