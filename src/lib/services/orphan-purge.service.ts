/**
 * AUTHORITATIVE ORPHAN DATA PURGE SERVICE
 *
 * Scans Firestore root collections and Firebase Auth for "ghost" records belonging to:
 * 1. A specifically targeted deleted school ID (e.g. 'nNuxKZJO')
 * 2. Any school that no longer exists in the central `schools` registry
 *
 * Safety guarantees:
 * - NEVER touches Super Admin accounts (`role === 'super_admin'` or `email === 'admin@schoolstudy.com'`).
 * - Batched deletions (max 400 docs per Firestore batch) to prevent payload overruns.
 * - Chunks of 1000 for `adminAuth.deleteUsers`.
 * - Dry-run mode support to preview orphaned records before irreversible deletion.
 * - Resumable and idempotent.
 */

import { invalidateSchoolValidationCache } from "@/lib/auth/schoolValidation";

export interface PurgeOrphansOptions {
  targetSchoolId?: string;
  dryRun?: boolean;
  actorId?: string;
}

export interface CollectionPurgeSummary {
  found: number;
  deleted: number;
}

export interface PurgeOrphansResult {
  success: boolean;
  dryRun: boolean;
  activeSchoolCount: number;
  activeSchoolIds: string[];
  totalOrphanDocsFound: number;
  totalPurgedDocs: number;
  totalPurgedAuthUsers: number;
  collectionsSummary: Record<string, CollectionPurgeSummary>;
  orphanedSchoolsDetected: string[];
  timestamp: string;
  error?: string;
}

const ROOT_COLLECTIONS_TO_SCAN = [
  "users",
  "students",
  "teachers",
  "staff",
  "parents",
  "classes",
  "sections",
  "subjects",
  "timetable",
  "exams",
  "grades",
  "assignments",
  "attendance",
  "employee_attendance",
  "orders",
  "invoices",
  "notices",
  "inquiries",
  "complaints",
  "activity_logs",
  "emergency_announcements",
  "feeDemands",
  "financialPayments",
  "paymentAllocations",
  "financialRefunds",
  "paymentReversals",
  "feeAdjustments",
  "studentLedgerEntries",
  "chartOfAccounts",
  "accountingJournals",
  "journalEntries",
  "cashBankAccounts",
  "cashBankTransactions",
  "financialStatements",
  "feeFollowUps",
  "schoolUsage",
  "schoolSubscriptions",
];

async function getServerAdminAuth() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminAuth === "function"
      ? adminModule.getSafeAdminAuth()
      : adminModule.adminAuth || null;
  } catch {
    return null;
  }
}

async function getServerAdminDb() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function"
      ? adminModule.getSafeAdminDb()
      : adminModule.adminDb || null;
  } catch {
    return null;
  }
}

/**
 * Purges orphaned records across root collections and Firebase Auth.
 */
export async function purgeOrphanedData(
  options: PurgeOrphansOptions = {}
): Promise<PurgeOrphansResult> {
  const { targetSchoolId, dryRun = false, actorId = "super_admin" } = options;
  const startedAt = new Date().toISOString();

  const adminDb = await getServerAdminDb();
  const adminAuth = await getServerAdminAuth();

  if (!adminDb) {
    throw new Error(
      "Admin Firestore is required to execute server-side orphan purge."
    );
  }

  // 1. Fetch all currently existing schools from the registry
  const schoolsSnap = await adminDb.collection("schools").get().catch((err: any) => {
    if (err?.code === 8 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("FIRESTORE_QUOTA_EXCEEDED: Daily Firestore quota is exhausted. Please upgrade or retry after reset.");
    }
    throw err;
  });

  const activeSchoolIds: string[] = [];
  const validSchoolIdSet = new Set<string>();

  for (const sDoc of schoolsSnap.docs) {
    const sData = sDoc.data() || {};
    // Only treat school as valid if not marked deleting or isDeleted
    if (!sData.isDeleted && sData.status !== "deleting") {
      validSchoolIdSet.add(sDoc.id);
      activeSchoolIds.push(sDoc.id);
    }
  }

  const collectionsSummary: Record<string, CollectionPurgeSummary> = {};
  const orphanedSchoolsFound = new Set<string>();
  const orphanedUserUids: string[] = [];
  let totalOrphanDocsFound = 0;
  let totalPurgedDocs = 0;
  let totalPurgedAuthUsers = 0;

  // If a specific targetSchoolId was requested, enforce that check
  const isTargeted = Boolean(targetSchoolId && targetSchoolId.trim());
  const cleanTargetId = targetSchoolId ? targetSchoolId.trim() : "";

  // Helper to determine if a record belongs to an orphaned/deleted school
  const isOrphan = (docSchoolId: any, role?: string): boolean => {
    if (role === "super_admin") return false;
    const sId = typeof docSchoolId === "string" ? docSchoolId.trim() : "";
    if (isTargeted) {
      return sId === cleanTargetId;
    }
    // General scan: orphan if schoolId is missing (for non-super-admins) or schoolId not in valid set
    if (!sId) return true;
    return !validSchoolIdSet.has(sId);
  };

  // ---------------------------------------------------------------------------
  // 2. Scan `users` collection specifically (to capture Auth UIDs for cleanup)
  // ---------------------------------------------------------------------------
  try {
    const usersSnap = await adminDb.collection("users").get();
    let usersFound = 0;
    let usersDeleted = 0;
    const userDocsToDelete: any[] = [];

    for (const uDoc of usersSnap.docs) {
      const data = uDoc.data() || {};
      if (data.role === "super_admin" || data.email === "admin@schoolstudy.com") {
        continue;
      }

      if (isOrphan(data.schoolId, data.role)) {
        usersFound++;
        if (data.schoolId) orphanedSchoolsFound.add(String(data.schoolId));
        orphanedUserUids.push(uDoc.id);
        userDocsToDelete.push(uDoc.ref);
      }
    }

    totalOrphanDocsFound += usersFound;

    if (!dryRun && userDocsToDelete.length > 0) {
      // Delete user documents in batches of 400
      for (let i = 0; i < userDocsToDelete.length; i += 400) {
        const batch = adminDb.batch();
        const chunk = userDocsToDelete.slice(i, i + 400);
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit().catch((err: any) => {
          console.warn("[OrphanPurge] Batch user deletion warning:", err?.message);
        });
        usersDeleted += chunk.length;
      }
      totalPurgedDocs += usersDeleted;
    }

    collectionsSummary["users"] = {
      found: usersFound,
      deleted: dryRun ? 0 : usersDeleted,
    };
  } catch (err: any) {
    console.error("[OrphanPurge] Error scanning users collection:", err);
  }

  // ---------------------------------------------------------------------------
  // 3. Scan all other root collections tied to schools
  // ---------------------------------------------------------------------------
  for (const colName of ROOT_COLLECTIONS_TO_SCAN) {
    if (colName === "users") continue; // already processed above

    try {
      let colQuery: any = adminDb.collection(colName);
      if (isTargeted) {
        colQuery = colQuery.where("schoolId", "==", cleanTargetId);
      }

      const snap = await colQuery.get().catch(() => null);
      if (!snap || snap.empty) {
        collectionsSummary[colName] = { found: 0, deleted: 0 };
        continue;
      }

      let found = 0;
      let deleted = 0;
      const docsToDelete: any[] = [];

      for (const d of snap.docs) {
        const data = d.data() || {};
        if (data.role === "super_admin") continue;

        if (isOrphan(data.schoolId, data.role)) {
          found++;
          if (data.schoolId) orphanedSchoolsFound.add(String(data.schoolId));
          docsToDelete.push(d.ref);
        }
      }

      totalOrphanDocsFound += found;

      if (!dryRun && docsToDelete.length > 0) {
        for (let i = 0; i < docsToDelete.length; i += 400) {
          const batch = adminDb.batch();
          const chunk = docsToDelete.slice(i, i + 400);
          chunk.forEach((ref) => batch.delete(ref));
          await batch.commit().catch((err: any) => {
            console.warn(`[OrphanPurge] Batch ${colName} deletion warning:`, err?.message);
          });
          deleted += chunk.length;
        }
        totalPurgedDocs += deleted;
      }

      collectionsSummary[colName] = {
        found,
        deleted: dryRun ? 0 : deleted,
      };
    } catch (err: any) {
      console.warn(`[OrphanPurge] Error processing ${colName}:`, err?.message);
      collectionsSummary[colName] = { found: 0, deleted: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Clean up `userIds` & `active_sessions` for orphaned user UIDs
  // ---------------------------------------------------------------------------
  if (!dryRun && orphanedUserUids.length > 0) {
    try {
      for (let i = 0; i < orphanedUserUids.length; i += 400) {
        const batch = adminDb.batch();
        const chunk = orphanedUserUids.slice(i, i + 400);
        chunk.forEach((uid) => {
          batch.delete(adminDb.collection("userIds").doc(uid));
        });
        await batch.commit().catch(() => {});
      }
    } catch {}

    try {
      for (let i = 0; i < orphanedUserUids.length; i += 30) {
        const chunk = orphanedUserUids.slice(i, i + 30);
        const sessSnap = await adminDb
          .collection("active_sessions")
          .where("userId", "in", chunk)
          .get()
          .catch(() => null);
        if (sessSnap && !sessSnap.empty) {
          const batch = adminDb.batch();
          sessSnap.docs.forEach((d: any) => batch.delete(d.ref));
          await batch.commit().catch(() => {});
        }
      }
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // 5. Firebase Auth user account deletion (chunks of 1000)
  // ---------------------------------------------------------------------------
  if (!dryRun && adminAuth && orphanedUserUids.length > 0) {
    for (let i = 0; i < orphanedUserUids.length; i += 1000) {
      const uidsChunk = orphanedUserUids.slice(i, i + 1000);
      try {
        if (typeof adminAuth.deleteUsers === "function") {
          const deleteResult = await adminAuth.deleteUsers(uidsChunk);
          totalPurgedAuthUsers += deleteResult.successCount;
        } else {
          // Fallback to sequential deletion if deleteUsers is not available
          for (const uid of uidsChunk) {
            await adminAuth.deleteUser(uid).then(() => totalPurgedAuthUsers++).catch(() => {});
          }
        }
      } catch (authErr: any) {
        console.warn("[OrphanPurge] Firebase Auth deletion warning:", authErr?.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Invalidate caches for all affected school IDs
  // ---------------------------------------------------------------------------
  orphanedSchoolsFound.forEach((sId) => {
    invalidateSchoolValidationCache(sId);
  });
  if (cleanTargetId) {
    invalidateSchoolValidationCache(cleanTargetId);
  }

  const result: PurgeOrphansResult = {
    success: true,
    dryRun,
    activeSchoolCount: activeSchoolIds.length,
    activeSchoolIds,
    totalOrphanDocsFound,
    totalPurgedDocs,
    totalPurgedAuthUsers,
    collectionsSummary,
    orphanedSchoolsDetected: Array.from(orphanedSchoolsFound),
    timestamp: startedAt,
  };

  // 7. Write audit log if actual deletion took place
  if (!dryRun && totalPurgedDocs > 0) {
    await adminDb.collection("ultra_security_audit_logs").add({
      action: "ORPHAN_DATA_PURGE",
      actorId,
      result,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  return result;
}
