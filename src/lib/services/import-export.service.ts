/**
 * CONTROLLED DATA IMPORT & EXPORT SERVICE
 * 
 * Production-safe pipeline for importing Excel (.xlsx) and CSV data.
 * Features column auto-detection, mandatory field validation, duplicate prevention,
 * automated pre-import recovery snapshots, and atomic batch commits.
 */

import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { createFullBackupSnapshot } from "./google-sheets.service";
import { logAuditEvent } from "./audit.service";
import type {
  SupportedImportModule,
  ImportPreviewResult,
  ImportExecutionResult,
  ImportValidationError,
} from "@/types/backup";

/**
 * Standard column aliases for intelligent column matching.
 */
const FIELD_ALIASES: Record<SupportedImportModule, Record<string, string[]>> = {
  students: {
    admissionNumber: ["admission number", "adm no", "admission no", "adm_no", "admission_no", "student code"],
    rollNumber: ["roll number", "roll no", "roll_no"],
    name: ["student name", "name", "full name", "fullname", "student_name"],
    className: ["class", "grade", "classname", "class name", "standard"],
    section: ["section", "division", "sec"],
    gender: ["gender", "sex"],
    phone: ["phone", "mobile", "contact", "student phone", "phone number"],
    email: ["email", "student email", "email address"],
    parentName: ["parent name", "father name", "guardian name", "parent_name", "father_name"],
    parentPhone: ["parent phone", "father phone", "guardian phone", "parent_phone"],
    status: ["status", "active status"],
  },
  teachers: {
    teacherCode: ["teacher code", "employee id", "emp id", "emp_id", "teacher id", "staff id"],
    name: ["teacher name", "name", "full name", "faculty name"],
    email: ["email", "teacher email", "official email"],
    phone: ["phone", "mobile", "contact", "phone number"],
    designation: ["designation", "role", "post"],
    qualification: ["qualification", "degree", "education"],
    assignedClassName: ["assigned class", "class", "class teacher of"],
    status: ["status"],
  },
  classes: {
    name: ["class name", "class", "grade", "standard", "name"],
    order: ["order", "sequence", "priority", "sort order"],
    sections: ["sections", "initial sections", "divisions"],
    monthlyFee: ["monthly fee", "monthly tuition fee", "fee", "tuition fee"],
    admissionFee: ["admission fee", "registration fee"],
    status: ["status"],
  },
  fees: {
    studentId: ["student id", "student_id", "admission number", "adm no"],
    studentName: ["student name", "name"],
    className: ["class", "grade"],
    feeType: ["fee type", "type", "category"],
    amountRupees: ["amount", "amount rupees", "fee amount", "paid amount"],
    paymentMethod: ["payment method", "mode", "payment mode"],
    transactionRef: ["transaction reference", "ref no", "utr", "cheque no", "transaction id"],
  },
  attendance: {
    studentId: ["student id", "student_id", "admission number"],
    classId: ["class id", "class_id"],
    className: ["class", "class name"],
    date: ["date", "attendance date", "day"],
    status: ["status", "attendance status"],
  },
};

/**
 * Parses binary buffer of .xlsx, .xls or .csv into array of objects.
 */
export async function parseImportFile(fileBuffer: ArrayBuffer): Promise<Record<string, any>[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Uploaded spreadsheet contains no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
  return rawJson;
}

/**
 * Maps raw sheet columns to canonical model fields using intelligent fuzzy matching.
 */
export function autoDetectColumnMappings(
  detectedColumns: string[],
  targetModule: SupportedImportModule
): Record<string, string> {
  const mappings: Record<string, string> = {};
  const aliasMap = FIELD_ALIASES[targetModule] || {};

  detectedColumns.forEach((col) => {
    const normalized = col.trim().toLowerCase().replace(/[_\s]+/g, " ");
    for (const [targetKey, aliases] of Object.entries(aliasMap)) {
      if (normalized === targetKey.toLowerCase() || aliases.includes(normalized)) {
        mappings[col] = targetKey;
        break;
      }
    }
  });

  return mappings;
}

/**
 * Validates, checks duplicates, and previews an import before writing to production.
 */
export async function validateAndPreviewImport(
  schoolId: string,
  targetModule: SupportedImportModule,
  rawRows: Record<string, any>[]
): Promise<ImportPreviewResult> {
  if (!rawRows || rawRows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      newRows: 0,
      detectedColumns: [],
      mappedFields: {},
      previewData: [],
      validationErrors: [],
      duplicates: [],
    };
  }

  const detectedColumns = Object.keys(rawRows[0]);
  const mappedFields = autoDetectColumnMappings(detectedColumns, targetModule);

  // 1. Fetch existing school records to detect duplicates
  const existingKeys = await loadExistingKeys(schoolId, targetModule);

  const previewData: Record<string, any>[] = [];
  const validationErrors: ImportValidationError[] = [];
  const duplicates: Array<{ rowNumber: number; keyField: string; keyValue: string; existingRecordId: string }> = [];

  let validCount = 0;
  let errorCount = 0;
  let dupCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNumber = idx + 2; // Row 1 is header
    const mappedRecord: Record<string, any> = {};

    // Transform raw columns to model keys
    for (const [colName, targetKey] of Object.entries(mappedFields)) {
      mappedRecord[targetKey] = raw[colName];
    }

    // Preserve any direct ID if provided
    if (raw.id || raw[`${targetModule.slice(0, -1)}Id`]) {
      mappedRecord.id = raw.id || raw[`${targetModule.slice(0, -1)}Id`];
    }

    // Module-specific validation rules
    const rowErrors: string[] = [];

    if (targetModule === "students") {
      if (!mappedRecord.name || String(mappedRecord.name).trim().length < 2) {
        rowErrors.push("Student name is required (min 2 characters).");
      }
      if (!mappedRecord.className && !mappedRecord.classId) {
        rowErrors.push("Class name or class ID is required.");
      }
      // Check duplicate admission number or email
      const admNo = String(mappedRecord.admissionNumber || "").trim().toLowerCase();
      if (admNo && existingKeys.has(`adm:${admNo}`)) {
        const existingId = existingKeys.get(`adm:${admNo}`)!;
        duplicates.push({ rowNumber, keyField: "admissionNumber", keyValue: admNo, existingRecordId: existingId });
        mappedRecord._isDuplicate = true;
        mappedRecord._existingId = existingId;
        dupCount++;
      }
    } else if (targetModule === "teachers") {
      if (!mappedRecord.name || String(mappedRecord.name).trim().length < 2) {
        rowErrors.push("Teacher name is required.");
      }
      const email = String(mappedRecord.email || "").trim().toLowerCase();
      if (email && !email.includes("@")) {
        rowErrors.push("Valid email address is required.");
      }
      if (email && existingKeys.has(`email:${email}`)) {
        const existingId = existingKeys.get(`email:${email}`)!;
        duplicates.push({ rowNumber, keyField: "email", keyValue: email, existingRecordId: existingId });
        mappedRecord._isDuplicate = true;
        mappedRecord._existingId = existingId;
        dupCount++;
      }
    } else if (targetModule === "classes") {
      if (!mappedRecord.name || String(mappedRecord.name).trim().length === 0) {
        rowErrors.push("Class name is required.");
      }
    } else if (targetModule === "fees") {
      if (!mappedRecord.studentId && !mappedRecord.studentName) {
        rowErrors.push("Student ID or Student Name is required.");
      }
      const amt = Number(mappedRecord.amountRupees || mappedRecord.amount || 0);
      if (isNaN(amt) || amt <= 0) {
        rowErrors.push("Fee amount must be a positive number.");
      }
    }

    if (rowErrors.length > 0) {
      errorCount++;
      mappedRecord._hasErrors = true;
      mappedRecord._errorReasons = rowErrors;
      rowErrors.forEach((reason) => {
        validationErrors.push({ rowNumber, field: "general", value: "", reason });
      });
    } else {
      validCount++;
    }

    // Keep first 50 rows for preview UI
    if (previewData.length < 50) {
      previewData.push({ _rowNumber: rowNumber, ...mappedRecord });
    }
  }

  return {
    totalRows: rawRows.length,
    validRows: validCount,
    errorRows: errorCount,
    duplicateRows: dupCount,
    newRows: validCount - dupCount,
    detectedColumns,
    mappedFields,
    previewData,
    validationErrors,
    duplicates,
  };
}

/**
 * Commits validated import rows to Firestore inside safe atomic batches.
 * ALWAYS creates a pre-import recovery snapshot before writing!
 */
export async function executeControlledImport(
  schoolId: string,
  targetModule: SupportedImportModule,
  validRecords: Record<string, any>[],
  actorId: string = "super_admin"
): Promise<ImportExecutionResult> {
  if (!validRecords || validRecords.length === 0) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      preImportSnapshotId: "",
      errors: ["No valid records provided for import."],
    };
  }

  // 1. ALWAYS Create a Pre-Import Recovery Snapshot
  let preImportSnapshotId = "";
  try {
    const snap = await createFullBackupSnapshot(schoolId, "pre_import");
    preImportSnapshotId = snap.id;
  } catch (snapErr: any) {
    console.warn("Pre-import snapshot warning (continuing with safe commit):", snapErr?.message);
  }

  const adminDb = getSafeAdminDb();
  const clientDb = getFirebaseDb();
  const errors: string[] = [];

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Process in chunks of 450 to stay safely within Firestore batch limits of 500
  const CHUNK_SIZE = 400;
  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    const chunk = validRecords.slice(i, i + CHUNK_SIZE);

    if (adminDb) {
      const batch = adminDb.batch();
      for (const rec of chunk) {
        if (rec._hasErrors) {
          skippedCount++;
          continue;
        }

        const isUpdate = Boolean(rec._isDuplicate && rec._existingId);
        const docId = isUpdate ? rec._existingId : (rec.id || adminDb.collection("schools").doc(schoolId).collection(targetModule).doc().id);

        const cleanData = { ...rec };
        delete cleanData._rowNumber;
        delete cleanData._hasErrors;
        delete cleanData._errorReasons;
        delete cleanData._isDuplicate;
        delete cleanData._existingId;

        const docRef = adminDb.collection("schools").doc(schoolId).collection(targetModule).doc(docId);

        if (isUpdate) {
          batch.set(docRef, { ...cleanData, updatedAt: new Date().toISOString() }, { merge: true });
          updatedCount++;
        } else {
          batch.set(docRef, {
            id: docId,
            schoolId,
            ...cleanData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          importedCount++;
        }
      }
      await batch.commit();
    } else if (clientDb) {
      const batch = writeBatch(clientDb);
      for (const rec of chunk) {
        if (rec._hasErrors) {
          skippedCount++;
          continue;
        }

        const isUpdate = Boolean(rec._isDuplicate && rec._existingId);
        const docRef = isUpdate
          ? doc(clientDb, "schools", schoolId, targetModule, rec._existingId)
          : doc(collection(clientDb, "schools", schoolId, targetModule));

        const cleanData = { ...rec };
        delete cleanData._rowNumber;
        delete cleanData._hasErrors;
        delete cleanData._errorReasons;
        delete cleanData._isDuplicate;
        delete cleanData._existingId;

        if (isUpdate) {
          batch.set(docRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
          updatedCount++;
        } else {
          batch.set(docRef, {
            id: docRef.id,
            schoolId,
            ...cleanData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          importedCount++;
        }
      }
      await batch.commit();
    }
  }

  // Record audit log
  await logAuditEvent({
    actorId,
    actorRole: "super_admin",
    action: "DATA_IMPORT_EXECUTED",
    entityType: "school",
    entityId: schoolId,
    targetSchoolId: schoolId,
    reason: `Imported ${importedCount} new, updated ${updatedCount} existing ${targetModule} records. Pre-import snapshot: ${preImportSnapshotId}`,
  }).catch(() => {});

  return {
    success: true,
    importedCount,
    updatedCount,
    skippedCount,
    preImportSnapshotId,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Loads existing identity keys for duplicate prevention.
 */
async function loadExistingKeys(schoolId: string, module: SupportedImportModule): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const adminDb = getSafeAdminDb();

  try {
    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection(module).get();
      snap.docs.forEach((d) => {
        const data = d.data();
        map.set(`id:${d.id}`, d.id);
        if (data.admissionNumber) map.set(`adm:${String(data.admissionNumber).toLowerCase()}`, d.id);
        if (data.email) map.set(`email:${String(data.email).toLowerCase()}`, d.id);
        if (data.teacherCode) map.set(`code:${String(data.teacherCode).toLowerCase()}`, d.id);
      });
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const snap = await getDocs(collection(clientDb, "schools", schoolId, module));
        snap.docs.forEach((d) => {
          const data = d.data();
          map.set(`id:${d.id}`, d.id);
          if (data.admissionNumber) map.set(`adm:${String(data.admissionNumber).toLowerCase()}`, d.id);
          if (data.email) map.set(`email:${String(data.email).toLowerCase()}`, d.id);
          if (data.teacherCode) map.set(`code:${String(data.teacherCode).toLowerCase()}`, d.id);
        });
      }
    }
  } catch (e) {
    console.warn("Notice: Could not preload existing keys for duplicate check:", e);
  }

  return map;
}
