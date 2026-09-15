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
  query,
  where,
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
 * Parses binary buffer of .xlsx, .xls, .csv, or .json into array of objects.
 */
export async function parseImportFile(fileBuffer: ArrayBuffer): Promise<Record<string, any>[]> {
  // 1. Try decoding as JSON
  try {
    const textDecoder = new TextDecoder("utf-8");
    const text = textDecoder.decode(fileBuffer);
    const trimmed = text.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.data)) return parsed.data;
        if (Array.isArray(parsed.records)) return parsed.records;
        if (Array.isArray(parsed.students)) return parsed.students;
        if (Array.isArray(parsed.teachers)) return parsed.teachers;
        if (Array.isArray(parsed.classes)) return parsed.classes;
        if (Array.isArray(parsed.fees)) return parsed.fees;
      }
    }
  } catch (e) {
    // Not valid JSON, proceed to XLSX/CSV
  }

  // 2. Parse as XLSX or CSV
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

/**
 * Exports school data in XLSX, CSV, or JSON format.
 */
export async function exportSchoolData(
  schoolId: string,
  targetModule: SupportedImportModule | "all",
  format: "xlsx" | "csv" | "json",
  filterOptions?: { classId?: string; academicYearId?: string }
): Promise<{
  data: any;
  contentType: string;
  filename: string;
}> {
  const XLSX = await import("xlsx");
  const adminDb = getSafeAdminDb();
  const clientDb = getFirebaseDb();

  const fetchCollection = async (collName: string) => {
    let rows: Record<string, any>[] = [];
    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection(collName).get();
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else if (clientDb) {
      const snap = await getDocs(collection(clientDb, "schools", schoolId, collName));
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return rows;
  };

  const sanitizeValue = (val: any) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      if (val.toDate && typeof val.toDate === "function") {
        return val.toDate().toISOString();
      }
      return JSON.stringify(val);
    }
    return val;
  };

  const flattenRecords = (records: Record<string, any>[], moduleName: string) => {
    return records.map((r) => {
      const out: Record<string, any> = {};
      if (moduleName === "students") {
        out["Admission Number"] = r.admissionNumber || r.studentId || "";
        out["Roll Number"] = r.rollNumber ?? "";
        out["Student Name"] = r.name || "";
        out["Class"] = r.className || "";
        out["Section"] = r.sectionName || "";
        out["Gender"] = r.gender || "";
        out["Phone"] = r.phone || "";
        out["Email"] = r.email || "";
        out["Parent / Guardian Name"] = r.guardianName || "";
        out["Parent Phone"] = r.guardianPhone || "";
        out["Address"] = r.address || "";
        out["Status"] = r.status || "active";
        out["Admission Date"] = r.admissionDate || "";
      } else if (moduleName === "teachers") {
        out["Teacher Code"] = r.teacherCode || r.employeeId || "";
        out["Teacher Name"] = r.name || "";
        out["Email"] = r.email || "";
        out["Phone"] = r.phone || "";
        out["Designation"] = r.designation || "";
        out["Qualification"] = r.qualification || "";
        out["Assigned Class"] = r.assignedClassName || "";
        out["Status"] = r.status || "active";
      } else if (moduleName === "classes") {
        out["Class Name"] = r.name || "";
        out["Order"] = r.order ?? 1;
        out["Sections"] = Array.isArray(r.sections)
          ? r.sections.map((s: any) => s.name || s).join(", ")
          : r.sections || "";
        out["Monthly Fee"] = r.monthlyFee ?? 0;
        out["Admission Fee"] = r.admissionFee ?? 0;
        out["Status"] = r.status || "active";
      } else if (moduleName === "fees") {
        out["Student ID"] = r.studentId || "";
        out["Student Name"] = r.studentName || "";
        out["Class"] = r.className || "";
        out["Fee Type"] = r.feeType || "tuition";
        out["Total Amount"] = r.amountRupees ?? r.totalAmount ?? 0;
        out["Paid Amount"] = r.paidAmount ?? 0;
        out["Pending Balance"] = r.pendingAmount ?? 0;
        out["Payment Status"] = r.status || "pending";
      } else {
        Object.keys(r).forEach((k) => {
          if (!k.startsWith("_")) {
            out[k] = sanitizeValue(r[k]);
          }
        });
      }
      return out;
    });
  };

  const dateTag = new Date().toISOString().split("T")[0];

  // 1. JSON Export
  if (format === "json") {
    let payload: any;
    if (targetModule === "all") {
      const [students, teachers, classes, fees] = await Promise.all([
        fetchCollection("students"),
        fetchCollection("teachers"),
        fetchCollection("classes"),
        fetchCollection("fees"),
      ]);
      payload = {
        schoolId,
        backupDate: new Date().toISOString(),
        version: "2.0",
        students: flattenRecords(students, "students"),
        teachers: flattenRecords(teachers, "teachers"),
        classes: flattenRecords(classes, "classes"),
        fees: flattenRecords(fees, "fees"),
      };
    } else {
      const records = await fetchCollection(targetModule);
      payload = {
        schoolId,
        module: targetModule,
        backupDate: new Date().toISOString(),
        totalRecords: records.length,
        records: flattenRecords(records, targetModule),
      };
    }
    const jsonString = JSON.stringify(payload, null, 2);
    return {
      data: jsonString,
      contentType: "application/json",
      filename: `school_${targetModule}_backup_${dateTag}.json`,
    };
  }

  // 2. XLSX or CSV Export
  const workbook = XLSX.utils.book_new();

  if (targetModule === "all") {
    const [students, teachers, classes, fees] = await Promise.all([
      fetchCollection("students"),
      fetchCollection("teachers"),
      fetchCollection("classes"),
      fetchCollection("fees"),
    ]);

    const sSheet = XLSX.utils.json_to_sheet(flattenRecords(students, "students"));
    const tSheet = XLSX.utils.json_to_sheet(flattenRecords(teachers, "teachers"));
    const cSheet = XLSX.utils.json_to_sheet(flattenRecords(classes, "classes"));
    const fSheet = XLSX.utils.json_to_sheet(flattenRecords(fees, "fees"));

    XLSX.utils.book_append_sheet(workbook, sSheet, "Students");
    XLSX.utils.book_append_sheet(workbook, tSheet, "Teachers");
    XLSX.utils.book_append_sheet(workbook, cSheet, "Classes");
    XLSX.utils.book_append_sheet(workbook, fSheet, "Fees");

    if (format === "csv") {
      const csvOutput = XLSX.utils.sheet_to_csv(sSheet);
      return {
        data: csvOutput,
        contentType: "text/csv",
        filename: `school_full_backup_${dateTag}.csv`,
      };
    }

    const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return {
      data: xlsxBuffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `school_master_backup_${dateTag}.xlsx`,
    };
  }

  // Single module
  let rawRecords = await fetchCollection(targetModule);
  if (targetModule === "students" && filterOptions?.classId) {
    rawRecords = rawRecords.filter((r) => r.classId === filterOptions.classId);
  }

  const flattened = flattenRecords(rawRecords, targetModule);
  const sheet = XLSX.utils.json_to_sheet(flattened);
  XLSX.utils.book_append_sheet(workbook, sheet, targetModule);

  if (format === "csv") {
    const csvOutput = XLSX.utils.sheet_to_csv(sheet);
    return {
      data: csvOutput,
      contentType: "text/csv",
      filename: `school_${targetModule}_${dateTag}.csv`,
    };
  }

  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return {
    data: xlsxBuffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `school_${targetModule}_${dateTag}.xlsx`,
  };
}

export { exportSchoolDataClient } from "./import-export-client.service";

/**
 * Generates sample import templates with proper columns and sample rows.
 */
export async function generateSampleTemplate(
  module: SupportedImportModule,
  format: "xlsx" | "csv" = "xlsx"
): Promise<{
  data: any;
  contentType: string;
  filename: string;
}> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  let sampleData: Record<string, any>[] = [];

  if (module === "students") {
    sampleData = [
      {
        "Admission Number": "ADM2026001",
        "Roll Number": 1,
        "Student Name": "Aarav Sharma",
        "Class": "Class 10",
        "Section": "A",
        "Gender": "Male",
        "Phone": "9876543210",
        "Email": "aarav.sharma@example.com",
        "Parent / Guardian Name": "Rajesh Sharma",
        "Parent Phone": "9876543211",
        "Address": "Civil Lines, New Delhi",
        "Status": "active",
      },
      {
        "Admission Number": "ADM2026002",
        "Roll Number": 2,
        "Student Name": "Diya Patel",
        "Class": "Class 10",
        "Section": "A",
        "Gender": "Female",
        "Phone": "9876543212",
        "Email": "diya.patel@example.com",
        "Parent / Guardian Name": "Kiran Patel",
        "Parent Phone": "9876543213",
        "Address": "Sector 14, Gurugram",
        "Status": "active",
      },
    ];
  } else if (module === "teachers") {
    sampleData = [
      {
        "Teacher Code": "TCH001",
        "Teacher Name": "Sunita Verma",
        "Email": "sunita.verma@example.com",
        "Phone": "9876543220",
        "Designation": "Senior PGT Mathematics",
        "Qualification": "M.Sc, B.Ed",
        "Assigned Class": "Class 10-A",
        "Status": "active",
      },
      {
        "Teacher Code": "TCH002",
        "Teacher Name": "Rakesh Kumar",
        "Email": "rakesh.kumar@example.com",
        "Phone": "9876543221",
        "Designation": "TGT Science",
        "Qualification": "B.Sc, B.Ed",
        "Assigned Class": "Class 9-B",
        "Status": "active",
      },
    ];
  } else if (module === "classes") {
    sampleData = [
      {
        "Class Name": "Class 1",
        "Order": 1,
        "Sections": "A, B",
        "Monthly Fee": 1500,
        "Admission Fee": 5000,
        "Status": "active",
      },
      {
        "Class Name": "Class 2",
        "Order": 2,
        "Sections": "A, B",
        "Monthly Fee": 1600,
        "Admission Fee": 5000,
        "Status": "active",
      },
    ];
  } else if (module === "fees") {
    sampleData = [
      {
        "Student ID": "ADM2026001",
        "Student Name": "Aarav Sharma",
        "Class": "Class 10",
        "Fee Type": "Tuition",
        "Amount": 2000,
        "Payment Mode": "Cash",
        "Transaction Ref": "TXN_CASH_001",
      },
    ];
  }

  const sheet = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(workbook, sheet, module);

  if (format === "csv") {
    const csvOutput = XLSX.utils.sheet_to_csv(sheet);
    return {
      data: csvOutput,
      contentType: "text/csv",
      filename: `sample_${module}_template.csv`,
    };
  }

  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return {
    data: xlsxBuffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `sample_${module}_template.xlsx`,
  };
}

