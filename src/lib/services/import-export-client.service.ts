/**
 * PURE CLIENT-SIDE DATA EXPORT SERVICE
 * 
 * Safely generates XLSX, CSV, and JSON data exports directly in the browser
 * using client Firestore credentials. Completely free of Node.js dependencies
 * (such as child_process, fs, or firebase-admin).
 */

import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { SupportedImportModule } from "@/types/backup";

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
