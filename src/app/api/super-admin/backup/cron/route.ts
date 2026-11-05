import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { syncSchoolToGoogleSheets, getBackupConfig } from "@/lib/services/google-sheets.service";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { timingSafeEqualString } from "@/lib/security/timing-safe";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

/**
 * Daily Scheduled Backup Cron Endpoint
 * Can be triggered by external cron services with Authorization: Bearer <CRON_SECRET>
 * or by an authenticated Super Admin.
 */
export async function GET(request: Request) {
  return handleDailyBackup(request);
}

export async function POST(request: Request) {
  return handleDailyBackup(request);
}

async function handleDailyBackup(request: Request) {
  try {
    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.SCHEDULED_TASK);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const url = new URL(request.url);
    const tokenParam = (url.searchParams.get("token") || "").trim();

    const configuredCronSecret = process.env.CRON_SECRET || process.env.BACKUP_CRON_SECRET || "";
    let isAuthorized = false;

    if (configuredCronSecret) {
      if (bearerToken && timingSafeEqualString(bearerToken, configuredCronSecret)) {
        isAuthorized = true;
      } else if (tokenParam && timingSafeEqualString(tokenParam, configuredCronSecret)) {
        isAuthorized = true;
      }
    }

    // If cron secret token not matched, check if caller is an authorized Super Admin session
    if (!isAuthorized) {
      const superAdminAuth = await requireSuperAdmin(request);
      if (!superAdminAuth.errorResponse) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized cron trigger." }, { status: 401 });
    }

    const startTime = Date.now();
    const results: Record<string, any> = {};

    // 1. Sync Global Master Sheet if configured
    const globalConfig = await getBackupConfig("global");
    if (globalConfig && globalConfig.autoSyncEnabled && globalConfig.webAppUrl) {
      results["global"] = await syncSchoolToGoogleSheets("global", "daily", "scheduled_cron");
    }

    // 2. Discover all schools that have individual Google Sheet configs
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    let schoolIds: string[] = [];

    if (adminDb) {
      const snap = await adminDb.collection("backup_configs").get();
      schoolIds = snap.docs.map((d) => d.id).filter((id) => id !== "global");
    } else if (clientDb) {
      const snap = await getDocs(collection(clientDb, "backup_configs"));
      schoolIds = snap.docs.map((d) => d.id).filter((id) => id !== "global");
    }

    // 3. Process each school
    for (const sid of schoolIds) {
      try {
        const sc = await getBackupConfig(sid);
        if (sc && sc.autoSyncEnabled && sc.webAppUrl) {
          results[sid] = await syncSchoolToGoogleSheets(sid, "daily", "scheduled_cron");
        }
      } catch (err: any) {
        results[sid] = { error: err.message };
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: "Daily automated backup sync completed.",
      duration: `${duration}ms`,
      schoolsProcessed: schoolIds.length,
      results,
    });
  } catch (error: any) {
    console.error("Backup cron error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Backup cron execution failed" },
      { status: 500 }
    );
  }
}
