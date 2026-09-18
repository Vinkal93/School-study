import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";

export interface ImportExportAuditLog {
  id?: string;
  operationId: string;
  type: "import" | "export";
  entity: string;
  schoolId: string;
  schoolName: string;
  performedBy: string;
  performedByUid: string;
  role: string;
  timestamp: string;
  source: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  status: "processing" | "success" | "partial" | "failed";
  filename: string;
  errorSummary?: string;
  durationMs: number;
  createdAt?: any;
}

export interface AuditFilters {
  schoolId?: string;
  type?: "import" | "export" | "all";
  entity?: string;
  status?: string;
  search?: string;
  limitCount?: number;
}

const AUDIT_COLLECTION = "importExportAuditLogs";

/**
 * Immutably logs an import or export operation for Super Admin compliance and monitoring.
 */
export async function logImportExportOperation(
  data: Omit<ImportExportAuditLog, "timestamp">
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) return "";

  try {
    const docRef = doc(collection(db, AUDIT_COLLECTION));
    const nowIso = new Date().toISOString();

    const entry: ImportExportAuditLog = {
      ...data,
      id: docRef.id,
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, entry);
    return docRef.id;
  } catch (err) {
    console.warn("[import-export-audit] Notice: Failed to write audit log:", err);
    return "";
  }
}

/**
 * Fetches and filters import/export operational audit records.
 */
export async function fetchImportExportAuditLogs(
  filters: AuditFilters = {}
): Promise<ImportExportAuditLog[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(filters.limitCount || 200)
    );

    const snap = await getDocs(q).catch(async () => {
      // Fallback without orderBy if index is still indexing
      return await getDocs(collection(db, AUDIT_COLLECTION));
    });

    let records = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ImportExportAuditLog[];

    // Client-side filtering across fields
    if (filters.schoolId && filters.schoolId !== "all") {
      records = records.filter((r) => r.schoolId === filters.schoolId);
    }
    if (filters.type && filters.type !== "all") {
      records = records.filter((r) => r.type === filters.type);
    }
    if (filters.entity && filters.entity !== "all") {
      records = records.filter((r) => r.entity?.toLowerCase() === filters.entity?.toLowerCase());
    }
    if (filters.status && filters.status !== "all") {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters.search && filters.search.trim()) {
      const qLower = filters.search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.operationId?.toLowerCase().includes(qLower) ||
          r.schoolName?.toLowerCase().includes(qLower) ||
          r.filename?.toLowerCase().includes(qLower) ||
          r.performedBy?.toLowerCase().includes(qLower) ||
          r.entity?.toLowerCase().includes(qLower)
      );
    }

    return records;
  } catch (err) {
    console.error("[import-export-audit] Fetch error:", err);
    return [];
  }
}
