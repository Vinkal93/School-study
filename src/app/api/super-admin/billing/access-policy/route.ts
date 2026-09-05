import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { getGlobalAccessPolicy, updateGlobalAccessPolicy } from "@/lib/billing/accessPolicy";
import type { GlobalAccessPolicy } from "@/types";

/**
 * GET /api/super-admin/billing/access-policy
 * Fetches the global access policy and renewal notice threshold.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const policy = await getGlobalAccessPolicy();
    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    console.error("GET /api/super-admin/billing/access-policy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load access policy" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super-admin/billing/access-policy
 * Updates the global access policy and renewal threshold with validation and audit logging.
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();

    // Input Validation
    if (body.renewalNoticeThresholdDays !== undefined) {
      const threshold = Number(body.renewalNoticeThresholdDays);
      if (isNaN(threshold) || threshold < 0 || threshold > 90) {
        return NextResponse.json(
          { error: "Renewal notice threshold must be a number between 0 and 90 days." },
          { status: 400 }
        );
      }
      body.renewalNoticeThresholdDays = Math.round(threshold);
    }

    if (body.gracePeriodDays !== undefined) {
      const grace = Number(body.gracePeriodDays);
      if (isNaN(grace) || grace < 0 || grace > 60) {
        return NextResponse.json(
          { error: "Grace period must be a number between 0 and 60 days." },
          { status: 400 }
        );
      }
      body.gracePeriodDays = Math.round(grace);
    }

    if (body.reminderDays !== undefined && !Array.isArray(body.reminderDays)) {
      return NextResponse.json(
        { error: "reminderDays must be an array of numbers." },
        { status: 400 }
      );
    }

    const updated = await updateGlobalAccessPolicy(
      body,
      auth.user?.email || "super_admin"
    );

    return NextResponse.json({
      success: true,
      message: "Global subscription renewal threshold and access policy updated successfully.",
      policy: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/super-admin/billing/access-policy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update access policy" },
      { status: 500 }
    );
  }
}

export const POST = PUT;
