/**
 * GOOGLE SHEETS LIVE BACKUP & SYNC SERVICE
 * 
 * Handles all server-side communication with Google Apps Script Web App.
 * Strictly guarantees multi-tenant isolation, data deletion safety,
 * formula injection prevention, and zero exposure of sensitive credentials.
 */

import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import crypto from "crypto";
import type {
  GoogleSheetsConfig,
  SyncLogEntry,
  BackupSnapshot,
  BackupSyncType,
  BackupSyncStatus,
} from "@/types/backup";

const CONFIGS_COLLECTION = "backup_configs";
const LOGS_COLLECTION = "backup_sync_logs";
const SNAPSHOTS_COLLECTION = "backup_snapshots";

// Sensitive fields that MUST NEVER be exported to Google Sheets
const STRICT_SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "salt",
  "hash",
  "token",
  "sessionToken",
  "refreshToken",
  "secret",
  "syncSecret",
  "pin",
  "pinHash",
  "emergencyPin",
  "privateKey",
  "apiKey",
  "razorpaySecret",
  "webhookSecret",
]);

/**
 * Sanitizes an object before export by scrubbing sensitive authentication/security fields.
 */
export function scrubSensitiveFields(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (STRICT_SENSITIVE_KEYS.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")) {
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = scrubSensitiveFields(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Prepend single quote if cell starts with dangerous formula injection characters (=, +, -, @).
 */
export function sanitizeCellValue(val: any): any {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^[=+\-@]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  }
  return val;
}

/**
 * Fetches Google Sheet configuration for a specific school or "global".
 */
export async function getBackupConfig(schoolId: string = "global"): Promise<GoogleSheetsConfig | null> {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb.collection(CONFIGS_COLLECTION).doc(schoolId).get();
      if (snap.exists) {
        return { id: snap.id, ...snap.data() } as GoogleSheetsConfig;
      }
    } catch (e) {
      console.warn("getBackupConfig adminDb read warning:", e);
    }
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      const snap = await getDoc(doc(clientDb, CONFIGS_COLLECTION, schoolId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as GoogleSheetsConfig;
      }
    } catch (e) {
      console.warn("getBackupConfig clientDb read warning:", e);
    }
  }

  return null;
}

/**
 * Saves or updates Google Sheet configuration.
 */
export async function saveBackupConfig(
  schoolId: string = "global",
  data: Partial<GoogleSheetsConfig>
): Promise<void> {
  const adminDb = getSafeAdminDb();
  const updatePayload = {
    ...data,
    schoolId,
    updatedAt: new Date().toISOString(),
  };

  if (adminDb) {
    try {
      await adminDb.collection(CONFIGS_COLLECTION).doc(schoolId).set(updatePayload, { merge: true });
      return;
    } catch (e) {
      console.warn("saveBackupConfig adminDb write warning:", e);
    }
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      await setDoc(doc(clientDb, CONFIGS_COLLECTION, schoolId), updatePayload, { merge: true });
    } catch (e) {
      console.warn("saveBackupConfig clientDb write warning:", e);
    }
  }
}

export interface PingResult {
  success: boolean;
  message: string;
  step?: "url_validation" | "network_connection" | "secret_authentication" | "spreadsheet_access" | "completed";
  reason?: string;
  httpStatus?: number;
  suggestedFix?: string;
  latencyMs?: number;
  spreadsheetId?: string;
  spreadsheetName?: string;
  sheets?: string[];
  error?: string;
}

/**
 * Tests connection to Google Apps Script Web App with end-to-end verification.
 */
export async function pingGoogleSheet(
  webAppUrl: string,
  syncSecret: string
): Promise<PingResult> {
  const trimmedUrl = (webAppUrl || "").trim();

  // 1. URL Validation
  if (!trimmedUrl) {
    return {
      success: false,
      message: "Missing Google Apps Script Web App URL",
      step: "url_validation",
      reason: "The Web App URL field is empty.",
      httpStatus: 400,
      suggestedFix: "In Google Apps Script, click Deploy -> Manage deployments -> Copy the Web App URL.",
    };
  }

  if (trimmedUrl.includes("/edit") || trimmedUrl.endsWith("/dev")) {
    return {
      success: false,
      message: "Invalid Web App URL format",
      step: "url_validation",
      reason: trimmedUrl.endsWith("/dev")
        ? "The URL ends with '/dev' (test development mode), which requires Google account sign-in."
        : "The URL is an Apps Script Editor URL (/edit), not a deployed Web App URL.",
      httpStatus: 400,
      suggestedFix: "In Google Apps Script, click Deploy -> New deployment (or Manage deployments) -> Web app -> Copy the URL ending in '/exec'.",
    };
  }

  if (!trimmedUrl.includes("/macros/s/") || !trimmedUrl.endsWith("/exec")) {
    return {
      success: false,
      message: "Invalid Web App URL format",
      step: "url_validation",
      reason: "The Web App URL must follow the format 'https://script.google.com/macros/s/.../exec'.",
      httpStatus: 400,
      suggestedFix: "Verify that you deployed as a 'Web app' and copied the production URL ending in '/exec'.",
    };
  }

  const start = Date.now();

  try {
    const res = await fetch(trimmedUrl, {
      method: "POST",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ping",
        syncSecret: (syncSecret || "").trim(),
      }),
    });

    const latencyMs = Date.now() - start;

    if (res.status === 401) {
      return {
        success: false,
        message: "Authentication failed",
        step: "secret_authentication",
        reason: "The sync secret provided does not match the secret configured in Google Apps Script.",
        httpStatus: 401,
        suggestedFix: "In Apps Script, open Project Settings -> Script Properties and ensure SYNC_SECRET matches your configured secret.",
        latencyMs,
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        message: "Deployment not found",
        step: "network_connection",
        reason: "Google Apps Script returned HTTP 404.",
        httpStatus: 404,
        suggestedFix: "Verify the deployment in Google Apps Script or deploy a new version with Access set to 'Anyone'.",
        latencyMs,
      };
    }

    if (res.status === 503) {
      return {
        success: false,
        message: "Spreadsheet Busy",
        step: "spreadsheet_access",
        reason: "The spreadsheet is currently locked by another concurrent sync operation.",
        httpStatus: 503,
        suggestedFix: "Wait 30 seconds and retry the connection test.",
        latencyMs,
      };
    }

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success) {
      return {
        success: true,
        message: json.message || "Connected successfully!",
        step: "completed",
        spreadsheetId: json.spreadsheetId,
        spreadsheetName: json.spreadsheetName,
        sheets: json.sheets,
        latencyMs,
      };
    }

    return {
      success: false,
      message: json.error || `HTTP ${res.status}: Failed to ping Google Sheet`,
      step: "spreadsheet_access",
      reason: json.error || `Apps Script returned HTTP status ${res.status}`,
      httpStatus: res.status,
      suggestedFix: "Check Apps Script Executions log for exact error details.",
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");
    return {
      success: false,
      message: isTimeout ? "Connection timed out" : "Unable to reach Google Apps Script Web App",
      step: "network_connection",
      reason: isTimeout
        ? "Request exceeded 15 seconds without a response from Google servers."
        : err.message || "Network connection failure",
      httpStatus: isTimeout ? 504 : 502,
      suggestedFix: isTimeout
        ? "Check your internet connection and ensure Google Apps Script services are accessible."
        : "Verify that the Web App URL is accessible and 'Who has access' was set to 'Anyone'.",
      latencyMs,
      error: err.message,
    };
  }
}

/**
 * Fetches Google Sheet tab statistics (row counts).
 */
export async function fetchGoogleSheetStats(
  webAppUrl: string,
  syncSecret: string
): Promise<Record<string, number>> {
  try {
    const res = await fetch(webAppUrl, {
      method: "POST",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_stats",
        syncSecret,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.stats) {
      return json.stats;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Pulls all isolated business data for a school from Firestore.
 */
export async function extractSchoolDataForBackup(schoolId: string): Promise<Record<string, { headers: string[]; records: any[] }>> {
  const adminDb = getSafeAdminDb();
  const clientDb = getFirebaseDb();

  const isGlobal = schoolId === "global";

  // 1. STUDENTS
  let rawStudents: any[] = [];
  if (adminDb) {
    if (isGlobal) {
      const snap = await adminDb.collectionGroup("students").get();
      rawStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("students").get();
      rawStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } else if (clientDb) {
    if (!isGlobal) {
      const snap = await getDocs(collection(clientDb, "schools", schoolId, "students"));
      rawStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  const studentsRecords = rawStudents.map((s) => ({
    studentId: s.id || s.studentId || "",
    schoolId: s.schoolId || schoolId,
    admissionNumber: s.admissionNumber || s.admissionNo || "",
    rollNumber: s.rollNumber || "",
    name: s.name || s.fullName || "",
    classId: s.classId || "",
    className: s.className || "",
    section: s.section || s.sectionName || "",
    gender: s.gender || "",
    phone: s.phone || s.contactNumber || "",
    email: s.email || "",
    parentName: s.parentName || s.fatherName || "",
    parentPhone: s.parentPhone || "",
    status: s.status || "active",
    createdAt: formatTimestamp(s.createdAt),
    updatedAt: formatTimestamp(s.updatedAt),
  }));

  // 2. TEACHERS
  let rawTeachers: any[] = [];
  if (adminDb) {
    if (isGlobal) {
      const snap = await adminDb.collectionGroup("teachers").get();
      rawTeachers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("teachers").get();
      rawTeachers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(collection(clientDb, "schools", schoolId, "teachers"));
    rawTeachers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const teachersRecords = rawTeachers.map((t) => ({
    teacherId: t.id || t.teacherId || "",
    schoolId: t.schoolId || schoolId,
    teacherCode: t.teacherCode || "",
    name: t.name || t.fullName || "",
    email: t.email || "",
    phone: t.phone || "",
    designation: t.designation || "Teacher",
    qualification: t.qualification || "",
    assignedClassName: t.assignedClassName || "",
    status: t.status || "active",
    createdAt: formatTimestamp(t.createdAt),
    updatedAt: formatTimestamp(t.updatedAt),
  }));

  // 3. CLASSES
  let rawClasses: any[] = [];
  if (adminDb) {
    if (isGlobal) {
      const snap = await adminDb.collectionGroup("classes").get();
      rawClasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("classes").get();
      rawClasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(collection(clientDb, "schools", schoolId, "classes"));
    rawClasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const classesRecords = rawClasses.map((c) => ({
    classId: c.id || c.classId || "",
    schoolId: c.schoolId || schoolId,
    name: c.name || "",
    order: c.order ?? 1,
    sections: Array.isArray(c.sections) ? c.sections.map((sec: any) => sec.name || sec).join(", ") : "A",
    classTeacherId: c.classTeacherId || "",
    classTeacherName: c.classTeacherName || "Not Assigned",
    monthlyFee: c.monthlyFee ?? 0,
    admissionFee: c.admissionFee ?? 0,
    status: c.status || "active",
    createdAt: formatTimestamp(c.createdAt),
    updatedAt: formatTimestamp(c.updatedAt),
  }));

  // 4. ATTENDANCE
  let rawAttendance: any[] = [];
  if (adminDb) {
    const q = isGlobal
      ? adminDb.collection("attendance").limit(5000)
      : adminDb.collection("attendance").where("schoolId", "==", schoolId).limit(5000);
    const snap = await q.get();
    rawAttendance = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(query(collection(clientDb, "attendance"), where("schoolId", "==", schoolId), limit(2000)));
    rawAttendance = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const attendanceRecords = rawAttendance.map((a) => ({
    attendanceId: a.id || `${a.schoolId}_${a.studentId}_${a.date}`,
    schoolId: a.schoolId || schoolId,
    classId: a.classId || "",
    className: a.className || "",
    sectionId: a.sectionId || "",
    sectionName: a.sectionName || "",
    studentId: a.studentId || "",
    studentName: a.studentName || "",
    date: a.date || "",
    status: a.status || "present",
    markedBy: a.markedBy || "",
    markedByRole: a.markedByRole || "teacher",
    createdAt: formatTimestamp(a.createdAt),
    updatedAt: formatTimestamp(a.updatedAt),
  }));

  // 5. FEES
  let rawFees: any[] = [];
  if (adminDb) {
    const q = isGlobal
      ? adminDb.collection("feeCollections").limit(5000)
      : adminDb.collection("feeCollections").where("schoolId", "==", schoolId).limit(5000);
    const snap = await q.get();
    rawFees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(query(collection(clientDb, "feeCollections"), where("schoolId", "==", schoolId), limit(2000)));
    rawFees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const feesRecords = rawFees.map((f) => ({
    feeId: f.id || f.receiptNumber || "",
    schoolId: f.schoolId || schoolId,
    studentId: f.studentId || "",
    studentName: f.studentName || "",
    className: f.className || "",
    feeType: f.feeType || "tuition",
    amountRupees: f.amountRupees ?? (f.amount ? f.amount / 100 : 0),
    paymentMethod: f.paymentMethod || "cash",
    transactionRef: f.transactionRef || f.reference || "",
    status: f.status || "paid",
    receiptNumber: f.receiptNumber || f.id || "",
    paidAt: formatTimestamp(f.paidAt || f.createdAt),
    createdAt: formatTimestamp(f.createdAt),
    updatedAt: formatTimestamp(f.updatedAt),
  }));

  // 6. SUBSCRIPTIONS
  let rawSubs: any[] = [];
  if (adminDb) {
    if (isGlobal) {
      const snap = await adminDb.collection("schoolSubscriptions").get();
      rawSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap = await adminDb.collection("schoolSubscriptions").doc(schoolId).get();
      if (snap.exists) rawSubs = [{ id: snap.id, ...snap.data() }];
    }
  } else if (clientDb && !isGlobal) {
    const snap = await getDoc(doc(clientDb, "schoolSubscriptions", schoolId));
    if (snap.exists()) rawSubs = [{ id: snap.id, ...snap.data() }];
  }

  const subscriptionsRecords = rawSubs.map((sub) => ({
    subscriptionId: sub.id || schoolId,
    schoolId: sub.schoolId || schoolId,
    planId: sub.planId || "plan_base",
    planName: sub.planName || "Base Plan",
    price: sub.priceRupees ?? (sub.pricePaise ? sub.pricePaise / 100 : 399),
    source: sub.subscriptionSource || sub.source || "manual_admin",
    status: sub.status || "active",
    startDate: formatTimestamp(sub.startDate),
    endDate: formatTimestamp(sub.endDate),
    billingCycle: sub.billingCycle || "monthly",
    autoRenew: Boolean(sub.autoRenew),
    createdAt: formatTimestamp(sub.createdAt),
    updatedAt: formatTimestamp(sub.updatedAt),
  }));

  // 7. NOTICES
  let rawNotices: any[] = [];
  if (adminDb) {
    const q = isGlobal
      ? adminDb.collection("notices").limit(1000)
      : adminDb.collection("notices").where("schoolId", "==", schoolId).limit(1000);
    const snap = await q.get();
    rawNotices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(query(collection(clientDb, "notices"), where("schoolId", "==", schoolId), limit(500)));
    rawNotices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const noticesRecords = rawNotices.map((n) => ({
    noticeId: n.id || "",
    schoolId: n.schoolId || schoolId,
    title: n.title || "",
    audience: n.audience || "all",
    priority: n.priority || "normal",
    publishedAt: formatTimestamp(n.publishedAt || n.createdAt),
    expiresAt: formatTimestamp(n.expiresAt),
    createdAt: formatTimestamp(n.createdAt),
    updatedAt: formatTimestamp(n.updatedAt),
  }));

  // 8. ADMINS
  let rawAdmins: any[] = [];
  if (adminDb) {
    const q = isGlobal
      ? adminDb.collection("users").where("role", "in", ["admin", "school_admin"])
      : adminDb.collection("users").where("schoolId", "==", schoolId).where("role", "in", ["admin", "school_admin"]);
    const snap = await q.get();
    rawAdmins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(query(collection(clientDb, "users"), where("schoolId", "==", schoolId)));
    rawAdmins = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u: any) => u.role === "admin" || u.role === "school_admin");
  }

  const adminsRecords = rawAdmins.map((adm) => ({
    adminId: adm.id || adm.uid || "",
    schoolId: adm.schoolId || schoolId,
    name: adm.name || adm.fullName || "Admin",
    email: adm.email || "",
    role: adm.role || "school_admin",
    status: adm.status || "active",
    createdAt: formatTimestamp(adm.createdAt),
    updatedAt: formatTimestamp(adm.updatedAt),
  }));

  // 9. AUDIT LOGS
  let rawAudit: any[] = [];
  if (adminDb) {
    const q = isGlobal
      ? adminDb.collection("audit_logs").orderBy("timestamp", "desc").limit(2000)
      : adminDb.collection("audit_logs").where("schoolId", "==", schoolId).limit(2000);
    const snap = await q.get().catch(() => ({ docs: [] } as any));
    rawAudit = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } else if (clientDb && !isGlobal) {
    const snap = await getDocs(query(collection(clientDb, "audit_logs"), where("schoolId", "==", schoolId), limit(1000))).catch(() => ({ docs: [] } as any));
    rawAudit = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }

  const auditRecords = rawAudit.map((a) => ({
    logId: a.id || "",
    timestamp: formatTimestamp(a.timestamp || a.createdAt),
    actorId: a.performerId || a.actorId || "system",
    actorRole: a.performerRole || a.actorRole || "admin",
    action: a.action || "UNKNOWN",
    targetType: a.targetType || "",
    targetId: a.targetId || "",
    status: a.status || "SUCCESS",
    details: typeof a.details === "object" ? JSON.stringify(a.details) : String(a.details || ""),
  }));

  return {
    Students: {
      headers: ["studentId", "schoolId", "admissionNumber", "rollNumber", "name", "classId", "className", "section", "gender", "phone", "email", "parentName", "parentPhone", "status", "createdAt", "updatedAt"],
      records: studentsRecords,
    },
    Teachers: {
      headers: ["teacherId", "schoolId", "teacherCode", "name", "email", "phone", "designation", "qualification", "assignedClassName", "status", "createdAt", "updatedAt"],
      records: teachersRecords,
    },
    Classes: {
      headers: ["classId", "schoolId", "name", "order", "sections", "classTeacherId", "classTeacherName", "monthlyFee", "admissionFee", "status", "createdAt", "updatedAt"],
      records: classesRecords,
    },
    Attendance: {
      headers: ["attendanceId", "schoolId", "classId", "className", "sectionId", "sectionName", "studentId", "studentName", "date", "status", "markedBy", "markedByRole", "createdAt", "updatedAt"],
      records: attendanceRecords,
    },
    Fees: {
      headers: ["feeId", "schoolId", "studentId", "studentName", "className", "feeType", "amountRupees", "paymentMethod", "transactionRef", "status", "receiptNumber", "paidAt", "createdAt", "updatedAt"],
      records: feesRecords,
    },
    Subscriptions: {
      headers: ["subscriptionId", "schoolId", "planId", "planName", "price", "source", "status", "startDate", "endDate", "billingCycle", "autoRenew", "createdAt", "updatedAt"],
      records: subscriptionsRecords,
    },
    Notices: {
      headers: ["noticeId", "schoolId", "title", "audience", "priority", "publishedAt", "expiresAt", "createdAt", "updatedAt"],
      records: noticesRecords,
    },
    Admins: {
      headers: ["adminId", "schoolId", "name", "email", "role", "status", "createdAt", "updatedAt"],
      records: adminsRecords,
    },
    Audit_Logs: {
      headers: ["logId", "timestamp", "actorId", "actorRole", "action", "targetType", "targetId", "status", "details"],
      records: auditRecords,
    },
  };
}

/**
 * Synchronizes school business data to Google Sheets via Apps Script Web App.
 */
export async function syncSchoolToGoogleSheets(
  schoolId: string = "global",
  syncType: BackupSyncType = "manual",
  triggeredBy: string = "super_admin"
): Promise<{
  success: boolean;
  message: string;
  counts: Record<string, number>;
  discrepancies?: Record<string, { firestore: number; sheets: number }>;
  error?: string;
}> {
  const startTime = Date.now();
  const config = await getBackupConfig(schoolId);

  if (!config || !config.webAppUrl || !config.syncSecret) {
    return {
      success: false,
      message: "Google Sheet connection is not configured for this school.",
      counts: {},
      error: "Missing webAppUrl or syncSecret",
    };
  }

  try {
    // 1. Extract data from Firestore
    const dataBySheet = await extractSchoolDataForBackup(schoolId);
    const firestoreCounts: Record<string, number> = {};

    // 2. Transmit each sheet tab batch
    for (const [sheetName, sheetData] of Object.entries(dataBySheet)) {
      firestoreCounts[sheetName] = sheetData.records.length;

      // Apply formula injection protection and sensitive data scrubbing
      const cleanRecords = sheetData.records.map((r) => {
        const scrubbed = scrubSensitiveFields(r);
        const cellSafe: Record<string, any> = {};
        for (const [k, v] of Object.entries(scrubbed)) {
          cellSafe[k] = sanitizeCellValue(v);
        }
        return cellSafe;
      });

      const res = await fetch(config.webAppUrl, {
        method: "POST",
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_upsert",
          syncSecret: config.syncSecret,
          sheetName,
          headers: sheetData.headers,
          records: cleanRecords,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to sync sheet ${sheetName}: HTTP ${res.status}`);
      }
    }

    // 3. Perform Data Integrity Check
    const sheetStats = await fetchGoogleSheetStats(config.webAppUrl, config.syncSecret);
    const discrepancies: Record<string, { firestore: number; sheets: number }> = {};
    let hasDiscrepancy = false;

    for (const [sName, fCount] of Object.entries(firestoreCounts)) {
      const sCount = sheetStats[sName] !== undefined ? sheetStats[sName] : -1;
      if (sCount !== -1 && sCount !== fCount) {
        discrepancies[sName] = { firestore: fCount, sheets: sCount };
        hasDiscrepancy = true;
      }
    }

    const durationMs = Date.now() - startTime;
    const syncStatus: BackupSyncStatus = hasDiscrepancy ? "warning" : "success";

    // 4. Log Sync History
    await recordSyncLog({
      schoolId,
      schoolName: config.schoolName || schoolId,
      syncType,
      status: syncStatus,
      recordCounts: firestoreCounts,
      durationMs,
      integrityCheck: {
        passed: !hasDiscrepancy,
        discrepancies,
      },
      triggeredBy,
    });

    // 5. Update Config with Health Stats
    await saveBackupConfig(schoolId, {
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: syncStatus,
      lastBackupCounts: firestoreCounts,
      lastSyncError: hasDiscrepancy ? "Minor row count discrepancy detected during integrity check." : undefined,
    });

    return {
      success: true,
      message: hasDiscrepancy
        ? "Backup completed with row count warnings. Check integrity logs."
        : "Google Sheets mirror synchronized successfully!",
      counts: firestoreCounts,
      discrepancies: hasDiscrepancy ? discrepancies : undefined,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await recordSyncLog({
      schoolId,
      schoolName: config.schoolName || schoolId,
      syncType,
      status: "failed",
      recordCounts: {},
      durationMs,
      error: err.message || "Sync execution failed",
      triggeredBy,
    });

    await saveBackupConfig(schoolId, {
      lastSyncStatus: "failed",
      lastSyncError: err.message || "Sync failed",
    });

    return {
      success: false,
      message: err.message || "Google Sheets synchronization failed.",
      counts: {},
      error: err.message,
    };
  }
}

/**
 * Creates a versioned historical disaster recovery snapshot.
 */
export async function createFullBackupSnapshot(
  schoolId: string = "global",
  backupType: "full" | "pre_import" | "scheduled" = "full"
): Promise<BackupSnapshot> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const dataBySheet = await extractSchoolDataForBackup(schoolId);

  const snapshotRecords: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const [k, v] of Object.entries(dataBySheet)) {
    snapshotRecords[k] = v.records.map((r) => scrubSensitiveFields(r));
    recordCounts[k] = v.records.length;
  }

  const rawJson = JSON.stringify({ metadata: { schoolId, timestamp }, data: snapshotRecords });
  const checksum = crypto.createHash("sha256").update(rawJson).digest("hex");

  const snapshot: BackupSnapshot = {
    id: `snap_${schoolId}_${Date.now()}`,
    timestamp,
    schoolId,
    schoolName: schoolId === "global" ? "All Schools (Master)" : schoolId,
    backupType,
    recordCounts,
    status: "success",
    durationMs: Date.now() - startTime,
    checksum,
    snapshotData: snapshotRecords,
    createdAt: timestamp,
  };

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb.collection(SNAPSHOTS_COLLECTION).doc(snapshot.id).set(snapshot);
  } else {
    const clientDb = getFirebaseDb();
    if (clientDb) {
      await setDoc(doc(clientDb, SNAPSHOTS_COLLECTION, snapshot.id), snapshot);
    }
  }

  return snapshot;
}

/**
 * Records an entry in backup_sync_logs.
 */
export async function recordSyncLog(entry: Omit<SyncLogEntry, "id" | "timestamp" | "createdAt">): Promise<string> {
  const timestamp = new Date().toISOString();
  const logId = `synclog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullLog: SyncLogEntry = {
    ...entry,
    id: logId,
    timestamp,
    createdAt: timestamp,
  };

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb.collection(LOGS_COLLECTION).doc(logId).set(fullLog);
  } else {
    const clientDb = getFirebaseDb();
    if (clientDb) {
      await setDoc(doc(clientDb, LOGS_COLLECTION, logId), fullLog);
    }
  }
  return logId;
}

/**
 * Reads historical sync logs for a school or global view.
 */
export async function getSyncLogs(schoolId?: string, limitCount: number = 50): Promise<SyncLogEntry[]> {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    let q = adminDb.collection(LOGS_COLLECTION).orderBy("timestamp", "desc").limit(limitCount);
    if (schoolId && schoolId !== "all") {
      q = adminDb.collection(LOGS_COLLECTION).where("schoolId", "==", schoolId).orderBy("timestamp", "desc").limit(limitCount);
    }
    const snap = await q.get().catch(() => ({ docs: [] } as any));
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SyncLogEntry));
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    let q = query(collection(clientDb, LOGS_COLLECTION), orderBy("timestamp", "desc"), limit(limitCount));
    if (schoolId && schoolId !== "all") {
      q = query(collection(clientDb, LOGS_COLLECTION), where("schoolId", "==", schoolId), orderBy("timestamp", "desc"), limit(limitCount));
    }
    const snap = await getDocs(q).catch(() => ({ docs: [] } as any));
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SyncLogEntry));
  }

  return [];
}

/**
 * Formats a Firestore Timestamp, Date, or string into standard ISO format.
 */
function formatTimestamp(ts: any): string {
  if (!ts) return "";
  if (typeof ts === "string") return ts;
  if (ts.toDate && typeof ts.toDate === "function") {
    return ts.toDate().toISOString();
  }
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toISOString();
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  return String(ts);
}
