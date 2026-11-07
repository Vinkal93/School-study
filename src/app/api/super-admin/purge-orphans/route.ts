import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { purgeOrphanedData } from "@/lib/services/orphan-purge.service";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

/**
 * POST /api/super-admin/purge-orphans
 *
 * Authoritatively scans and wipes ghost/orphaned records belonging to deleted schools
 * across all root Firestore collections and deletes their Firebase Auth accounts.
 *
 * Restricted strictly to verified Super Admins.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(
      request,
      RATE_LIMIT_PROFILES.BULK_MUTATION,
      auth.user!.uid
    );
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const body = await request.json().catch(() => ({}));
    const targetSchoolId = typeof body.targetSchoolId === "string" ? body.targetSchoolId.trim() : undefined;
    const dryRun = Boolean(body.dryRun);

    const result = await purgeOrphanedData({
      targetSchoolId,
      dryRun,
      actorId: auth.user!.uid,
    });

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Scan complete: Found ${result.totalOrphanDocsFound} orphaned documents across ${result.orphanedSchoolsDetected.length} deleted schools.`
        : `Purge complete: Erased ${result.totalPurgedDocs} ghost records and ${result.totalPurgedAuthUsers} Auth accounts.`,
      result,
    });
  } catch (error: any) {
    console.error("[POST /api/super-admin/purge-orphans] Error:", error);

    const isQuotaExceeded =
      error?.code === 8 ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("FIRESTORE_QUOTA_EXCEEDED") ||
      error?.message?.includes("Quota exceeded");

    if (isQuotaExceeded) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "FIRESTORE_QUOTA_EXCEEDED",
          error:
            "Firestore daily read/write quota is currently exhausted on Google Cloud. Please upgrade the Firebase project to the Blaze (Pay-as-you-go) plan or wait for the quota reset.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to purge orphaned records.",
      },
      { status: 500 }
    );
  }
}
