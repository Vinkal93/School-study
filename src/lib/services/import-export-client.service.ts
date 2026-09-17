/**
 * PURE CLIENT-SIDE DATA EXPORT SERVICE
 * 
 * Safely generates XLSX, CSV, and JSON data exports directly in the browser
 * using client Firestore credentials. Completely free of Node.js dependencies
 * (such as child_process, fs, or firebase-admin).
 */

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { SupportedImportModule, ImportExecutionResult } from "@/types/backup";
import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  getCanonicalSectionKey,
  normalizeGender,
} from "@/lib/utils/academic-normalizer";

export async function exportSchoolDataClient(
  schoolId: string,
  targetModule: SupportedImportModule | "all",
  format: "xlsx" | "csv" | "json",
  filterOptions?: { classId?: string; academicYearId?: string }
): Promise<{
  blob: Blob;
  filename: string;
}> {
  const XLSX = await import("xlsx");
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore client database not initialized.");

  const fetchCollection = async (collName: string) => {
    let rows: Record<string, any>[] = [];
    try {
      if (collName === "fees") {
        const [paySnap, structSnap] = await Promise.all([
          getDocs(query(collection(db, "feePayments"), where("schoolId", "==", schoolId))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "feeStructures"), where("schoolId", "==", schoolId))).catch(() => ({ docs: [] })),
        ]);
        const payments = (paySnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const structures = (structSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        rows = [...payments, ...structures];
        if (rows.length === 0) {
          const snap = await getDocs(collection(db, "schools", schoolId, "fees")).catch(() => ({ docs: [] }));
          rows = (snap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
      } else if (collName === "attendance") {
        const snap = await getDocs(query(collection(db, "attendance"), where("schoolId", "==", schoolId))).catch(() => ({ docs: [] }));
        rows = (snap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        if (rows.length === 0) {
          const subSnap = await getDocs(collection(db, "schools", schoolId, "attendance")).catch(() => ({ docs: [] }));
          rows = (subSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
      } else {
        const snap = await getDocs(collection(db, "schools", schoolId, collName)).catch(async () => {
          return await getDocs(query(collection(db, collName), where("schoolId", "==", schoolId))).catch(() => ({ docs: [] }));
        });
        rows = (snap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn(`[Client Export] Notice fetching ${collName}:`, err);
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

  // 1. JSON format
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
    const blob = new Blob([jsonString], { type: "application/json" });
    return {
      blob,
      filename: `school_${targetModule}_backup_${dateTag}.json`,
    };
  }

  // 2. XLSX or CSV format
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
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      return {
        blob,
        filename: `school_full_backup_${dateTag}.csv`,
      };
    }

    const xlsxArray = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([xlsxArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return {
      blob,
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
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    return {
      blob,
      filename: `school_${targetModule}_${dateTag}.csv`,
    };
  }

  const xlsxArray = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([xlsxArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return {
    blob,
    filename: `school_${targetModule}_${dateTag}.xlsx`,
  };
}

/**
 * PURE CLIENT-SIDE DATA IMPORT SERVICE
 * 
 * Directly executes chunked batch imports in the browser using the active Firebase Auth user.
 * Guarantees zero 500 server errors, works seamlessly without serverless service account keys,
 * and reports progress in real time.
 */
export async function importSchoolDataClient(
  schoolId: string,
  targetModule: SupportedImportModule,
  records: Record<string, any>[],
  onProgress?: (processed: number, total: number) => void
): Promise<ImportExecutionResult> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Client Firestore database is not initialized.");
  }
  if (!schoolId) {
    throw new Error("School ID is required for import.");
  }
  if (!records || records.length === 0) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      preImportSnapshotId: "",
      summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
      error: { code: "NO_RECORDS", message: "No valid records provided for import." },
    };
  }

  // 1. Fetch existing identity keys to differentiate creates from updates
  const existingMap = new Map<string, string>();
  try {
    const snap = await getDocs(collection(db, "schools", schoolId, targetModule)).catch(async () => {
      if (targetModule === "students") {
        return await getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)));
      }
      return { docs: [] } as any;
    });

    snap.docs.forEach((d: any) => {
      const data = d.data();
      existingMap.set(`id:${d.id}`, d.id);
      if (data.admissionNumber) existingMap.set(`adm:${String(data.admissionNumber).trim().toLowerCase()}`, d.id);
      if (data.studentId) existingMap.set(`adm:${String(data.studentId).trim().toLowerCase()}`, d.id);
      if (data.email) existingMap.set(`email:${String(data.email).trim().toLowerCase()}`, d.id);
      if (data.teacherCode) existingMap.set(`code:${String(data.teacherCode).trim().toLowerCase()}`, d.id);
    });
  } catch (err) {
    console.warn("[Client Import] Notice: Preload existing keys failed, proceeding with fresh IDs:", err);
  }

  // Pre-load class & section master for students module
  const classMasterMap = new Map<
    string,
    { id: string; name: string; sections: Map<string, { id: string; name: string }> }
  >();

  if (targetModule === "students") {
    try {
      const clsSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
      for (const cDoc of clsSnap.docs) {
        const cData = cDoc.data();
        const cCanonicalName = normalizeClassName(cData.name);
        const cKey = getCanonicalClassKey(cCanonicalName);

        const secSnap = await getDocs(collection(db, "schools", schoolId, "classes", cDoc.id, "sections"));
        const secMap = new Map<string, { id: string; name: string }>();
        secSnap.docs.forEach((sDoc) => {
          const sName = normalizeSectionName(sDoc.data().name);
          secMap.set(getCanonicalSectionKey(sName), { id: sDoc.id, name: sName });
        });

        if (!classMasterMap.has(cKey)) {
          classMasterMap.set(cKey, {
            id: cDoc.id,
            name: cCanonicalName,
            sections: secMap,
          });
        } else {
          // Merge sections into primary class entry
          const existing = classMasterMap.get(cKey)!;
          secMap.forEach((val, key) => {
            if (!existing.sections.has(key)) existing.sections.set(key, val);
          });
        }
      }
    } catch (cErr) {
      console.warn("[Client Import] Preload class master notice:", cErr);
    }
  }

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Helper to sanitize each record
  const sanitizeClientRecord = (rec: Record<string, any>) => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (k.startsWith("_")) continue;
      if (v === undefined) continue;
      if (v === null) {
        clean[k] = null;
      } else if (typeof v === "string") {
        clean[k] = v.trim();
      } else {
        clean[k] = v;
      }
    }
    return clean;
  };

  // Process in concurrent pools of 15 using setDoc to avoid Firestore's 10-get batch security rule limit
  const CONCURRENCY = 15;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const chunk = records.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (rec) => {
        if (rec._hasErrors) {
          skippedCount++;
          return;
        }

        const admNo = String(rec.admissionNumber || rec.studentId || "").trim().toLowerCase();
        const existingId = (admNo && existingMap.get(`adm:${admNo}`)) || (rec.id && existingMap.get(`id:${rec.id}`));
        const isUpdate = Boolean(existingId || (rec._isDuplicate && rec._existingId));
        const docId = existingId || rec._existingId || rec.id || doc(collection(db, "schools", schoolId, targetModule)).id;

        const cleanData = sanitizeClientRecord(rec);

        if (targetModule === "students") {
          cleanData.studentId = cleanData.admissionNumber || cleanData.studentId || docId;
          if (cleanData.rollNumber !== undefined && cleanData.rollNumber !== "") {
            cleanData.rollNumber = Number(cleanData.rollNumber) || 0;
          }
          if (cleanData.parentName && !cleanData.guardianName) cleanData.guardianName = cleanData.parentName;
          if (cleanData.guardianName && !cleanData.parentName) cleanData.parentName = cleanData.guardianName;
          if (cleanData.parentPhone && !cleanData.guardianPhone) cleanData.guardianPhone = cleanData.parentPhone;
          if (cleanData.guardianPhone && !cleanData.parentPhone) cleanData.parentPhone = cleanData.guardianPhone;
          if (!cleanData.status) cleanData.status = "active";
          if (!cleanData.admissionDate) cleanData.admissionDate = new Date().toISOString().split("T")[0];
          cleanData.gender = normalizeGender(cleanData.gender);

          // RESOLVE CLASS FROM INSTITUTE CLASS MASTER
          const rawCls = cleanData.className || cleanData.class || cleanData.classId || "Class 1";
          const canonicalClsName = normalizeClassName(rawCls);
          const clsKey = getCanonicalClassKey(canonicalClsName);

          let classEntry = classMasterMap.get(clsKey);
          if (!classEntry) {
            // Atomically create in institute Class Master
            const newClassRef = doc(collection(db, "schools", schoolId, "classes"));
            const newClassId = newClassRef.id;
            await setDoc(newClassRef, {
              id: newClassId,
              schoolId,
              name: canonicalClsName,
              order: getCanonicalClassOrder(canonicalClsName),
              academicYearId: "",
              status: "active",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            classEntry = { id: newClassId, name: canonicalClsName, sections: new Map() };
            classMasterMap.set(clsKey, classEntry);
          }

          // RESOLVE SECTION FROM INSTITUTE SECTION MASTER
          const rawSec = cleanData.sectionName || cleanData.section || cleanData.sectionId || "A";
          const canonicalSecName = normalizeSectionName(rawSec);
          const secKey = getCanonicalSectionKey(canonicalSecName);

          let sectionEntry = classEntry.sections.get(secKey);
          if (!sectionEntry) {
            const newSecRef = doc(collection(db, "schools", schoolId, "classes", classEntry.id, "sections"));
            const newSecId = newSecRef.id;
            await setDoc(newSecRef, {
              id: newSecId,
              schoolId,
              classId: classEntry.id,
              name: canonicalSecName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            sectionEntry = { id: newSecId, name: canonicalSecName };
            classEntry.sections.set(secKey, sectionEntry);
          }

          cleanData.classId = classEntry.id;
          cleanData.className = classEntry.name;
          cleanData.sectionId = sectionEntry.id;
          cleanData.sectionName = sectionEntry.name;
        }

        const schoolDocRef = doc(db, "schools", schoolId, targetModule, docId);

        try {
          if (isUpdate) {
            await setDoc(schoolDocRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
            if (targetModule === "students") {
              await setDoc(doc(db, "students", docId), { ...cleanData, schoolId, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
            }
            updatedCount++;
          } else {
            const fullDoc = {
              id: docId,
              schoolId,
              ...cleanData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(schoolDocRef, fullDoc);
            if (targetModule === "students") {
              await setDoc(doc(db, "students", docId), fullDoc).catch(() => {});
            }
            importedCount++;
            if (admNo) existingMap.set(`adm:${admNo}`, docId);
          }
        } catch (itemErr: any) {
          console.error(`[Client Import] Item error on record ${docId}:`, itemErr?.message);
          errors.push(itemErr?.message || "Write error");
        }
      })
    );

    if (onProgress) {
      onProgress(Math.min(i + chunk.length, records.length), records.length);
    }
  }

  return {
    success: true,
    importedCount,
    updatedCount,
    skippedCount,
    preImportSnapshotId: "",
    summary: {
      total: records.length,
      created: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      failed: errors.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

