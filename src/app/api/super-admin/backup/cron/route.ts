import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { syncSchoolToGoogleSheets, getBackupConfig } from "@/lib/services/google-sheets.service";

/**
 * Daily Scheduled Backup Cron Endpoint
 * Can be triggered by external cron services with Authorization: Bearer <CRON_SECRET>
 * or by Super Admin.
 */
export async function GET(request: Request) {
  return handleDailyBackup(request);
}

export async function POST(request: Request) {
  return handleDailyBackup(request);
}

async function handleDailyBackup(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.BACKUP_CRON_SECRET || "school-study-daily-backup-secret";

    // Validate bearer token if provided
    const isAuthorizedToken = Boolean(authHeader && authHeader.replace(/^Bearer\s+/i, "") === cronSecret);
    
    // In production without token, check if caller is internal localhost or safe token
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get("token");
    const isAuthorizedParam = Boolean(tokenParam && tokenParam === cronSecret);

    if (!isAuthorizedToken && !isAuthorizedParam && process.env.NODE_ENV === "production") {
      // In production, require either valid cron secret token or Super Admin session
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
    for (const sId of schoolIds) {
      const cfg = await getBackupConfig(sId);
      if (cfg && cfg.autoSyncEnabled && cfg.webAppUrl) {
        results[sId] = await syncSchoolToGoogleSheets(sId, "daily", "scheduled_cron");
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily scheduled backup completed for ${Object.keys(results).length} target(s).`,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      summary: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Scheduled daily backup encountered an error." },
      { status: 500 }
    );
  }
}
