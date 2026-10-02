import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  AttendanceRecord,
  AttendanceStatus,
  StudentAttendanceStats,
  EmployeeAttendanceRecord,
  EmployeeAttendanceStats,
  ClassAttendanceSummary,
  SchoolClass,
} from "@/types";

/**
 * Saves or updates student attendance for a class on a given date using deterministic IDs.
 * ID format: `${schoolId}_${studentId}_${date}`
 * This guarantees atomic updates and eliminates duplicate attendance records.
 */
export async function saveBatchAttendance(
  schoolId: string,
  payload: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    teacherId: string;
    teacherName: string;
    date: string; // "YYYY-MM-DD"
    records: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      rollNumber?: number;
      status: AttendanceStatus;
      remarks?: string;
    }>;
  }
): Promise<void> {
  if (!schoolId || schoolId === "system") {
    throw new Error("Cannot save attendance: No valid school assigned. Please complete school setup first.");
  }
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  payload.records.forEach((rec) => {
    // Deterministic Document ID
    const docId = `${schoolId}_${rec.studentId}_${payload.date}`;
    const docRef = doc(db, "attendance", docId);

    const recordData: any = {
      id: docId,
      schoolId,
      studentId: rec.studentId,
      studentName: rec.studentName,
      admissionNumber: rec.admissionNumber,
      classId: payload.classId,
      className: payload.className,
      sectionId: payload.sectionId,
      sectionName: payload.sectionName,
      teacherId: payload.teacherId,
      teacherName: payload.teacherName,
      date: payload.date,
      status: rec.status,
      updatedAt: serverTimestamp(),
    };

    if (rec.rollNumber !== undefined) {
      recordData.rollNumber = rec.rollNumber;
    }
    if (rec.remarks !== undefined) {
      recordData.remarks = rec.remarks;
    }

    // set with merge to preserve createdAt or update status
    batch.set(
      docRef,
      {
        ...recordData,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

/**
 * Loads existing attendance records for a specific class and date.
 * Returns a map of `[studentId]: AttendanceStatus`.
 */
export async function getClassAttendanceForDate(
  schoolId: string,
  classId: string,
  sectionId: string,
  date: string
): Promise<Record<string, AttendanceStatus>> {
  if (!schoolId || schoolId === "system") {
    return {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "attendance"),
    where("schoolId", "==", schoolId),
    where("classId", "==", classId),
    where("sectionId", "==", sectionId),
    where("date", "==", date)
  );

  const snapshot = await getDocs(q);
  const map: Record<string, AttendanceStatus> = {};

  snapshot.docs.forEach((d) => {
    const data = d.data() as AttendanceRecord;
    map[data.studentId] = data.status;
  });

  return map;
}

/**
 * Fetches attendance history and computes statistics for a single student.
 * (Used exclusively by the Student Portal with strict data isolation).
 */
export async function getStudentAttendanceHistory(
  schoolId: string,
  studentId: string
): Promise<StudentAttendanceStats> {
  if (!schoolId || schoolId === "system") {
    return { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, percentage: 100, records: [] };
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "attendance"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );

  const snapshot = await getDocs(q);
  const records = snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AttendanceRecord[];

  // Sort descending by date
  records.sort((a, b) => b.date.localeCompare(a.date));

  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;

  records.forEach((r) => {
    if (r.status === "PRESENT") presentDays++;
    else if (r.status === "ABSENT") absentDays++;
    else if (r.status === "LATE") lateDays++;
  });

  const totalDays = records.length;
  // Calculate percentage: Present and Late count towards attendance
  const effectivePresent = presentDays + lateDays;
  const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 100;

  return {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    percentage,
    records,
  };
}

/**
 * Real-time listener for a student's attendance records and statistics.
 */
export function subscribeToStudentAttendance(
  schoolId: string,
  studentId: string,
  callback: (stats: StudentAttendanceStats) => void
): () => void {
  if (!schoolId || !studentId) {
    callback({ totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, percentage: 100, records: [] });
    return () => {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "attendance"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AttendanceRecord[];

      records.sort((a, b) => b.date.localeCompare(a.date));

      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;

      records.forEach((r) => {
        const s = (r.status || "").toUpperCase();
        if (s === "PRESENT") presentDays++;
        else if (s === "ABSENT") absentDays++;
        else if (s === "LATE") lateDays++;
      });

      const totalDays = records.length;
      const effectivePresent = presentDays + lateDays;
      const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 100;

      callback({
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        percentage,
        records,
      });
    },
    (err) => {
      console.error("subscribeToStudentAttendance error:", err);
    }
  );
}

/**
 * Fetches attendance records for all students in a school on a specific date (for School Admin).
 */
export async function getSchoolAttendanceForDate(
  schoolId: string,
  date: string,
  classId?: string,
  sectionId?: string
): Promise<AttendanceRecord[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  const db = getFirebaseDb();
  let q = query(
    collection(db, "attendance"),
    where("schoolId", "==", schoolId),
    where("date", "==", date)
  );

  const snapshot = await getDocs(q);
  let records = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as AttendanceRecord[];

  if (classId && classId !== "all") {
    records = records.filter((r) => r.classId === classId);
  }
  if (sectionId && sectionId !== "all") {
    records = records.filter((r) => r.sectionId === sectionId);
  }

  return records.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/**
 * Saves or updates employee/staff attendance for a specific date using deterministic IDs.
 * ID format: `${schoolId}_emp_${employeeId}_${date}`
 */
export async function saveBatchEmployeeAttendance(
  schoolId: string,
  payload: {
    date: string; // "YYYY-MM-DD"
    markedBy?: string;
    records: Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail?: string;
      employeePhone?: string;
      department?: string;
      designation?: string;
      role?: string;
      status: AttendanceStatus;
      checkInTime?: string;
      checkOutTime?: string;
      remarks?: string;
      leaveType?: "CASUAL" | "SICK" | "DUTY" | "UNPAID" | "MATERNITY" | "OTHER";
    }>;
  }
): Promise<void> {
  if (!schoolId || schoolId === "system") {
    throw new Error("Cannot save employee attendance: No valid school assigned.");
  }
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  payload.records.forEach((rec) => {
    const docId = `${schoolId}_emp_${rec.employeeId}_${payload.date}`;
    const docRef = doc(db, "employee_attendance", docId);

    const recordData: any = {
      id: docId,
      schoolId,
      employeeId: rec.employeeId,
      employeeName: rec.employeeName,
      employeeEmail: rec.employeeEmail || "",
      employeePhone: rec.employeePhone || "",
      department: rec.department || "Teaching Staff",
      designation: rec.designation || rec.role || "Teacher",
      role: rec.role || "teacher",
      date: payload.date,
      status: rec.status,
      checkInTime: rec.checkInTime || "",
      checkOutTime: rec.checkOutTime || "",
      remarks: rec.remarks || "",
      leaveType: rec.leaveType || (rec.status === "ON_LEAVE" ? "CASUAL" : undefined),
      markedBy: payload.markedBy || "School Admin",
      updatedAt: serverTimestamp(),
    };

    batch.set(
      docRef,
      {
        ...recordData,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

/**
 * Fetches employee attendance records for a specific date.
 */
export async function getEmployeeAttendanceForDate(
  schoolId: string,
  date: string
): Promise<EmployeeAttendanceRecord[]> {
  if (!schoolId || schoolId === "system") return [];
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, "employee_attendance"),
      where("schoolId", "==", schoolId),
      where("date", "==", date)
    );
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as EmployeeAttendanceRecord[];

    return records.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  } catch (err) {
    console.error("Failed to load employee attendance for date:", err);
    return [];
  }
}

/**
 * Fetches employee monthly attendance records for a given month prefix (e.g. "2026-10").
 */
export async function getEmployeeMonthlyAttendance(
  schoolId: string,
  yearMonth: string
): Promise<EmployeeAttendanceRecord[]> {
  if (!schoolId || schoolId === "system") return [];
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, "employee_attendance"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    const records = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      })) as EmployeeAttendanceRecord[];

    return records
      .filter((r) => r.date && r.date.startsWith(yearMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("Failed to load monthly employee attendance:", err);
    return [];
  }
}

/**
 * Fetches student monthly attendance records for a given month prefix (e.g. "2026-10").
 */
export async function getStudentMonthlyAttendance(
  schoolId: string,
  yearMonth: string,
  classId?: string,
  sectionId?: string
): Promise<AttendanceRecord[]> {
  if (!schoolId || schoolId === "system") return [];
  const db = getFirebaseDb();
  try {
    let q = query(
      collection(db, "attendance"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    let records = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AttendanceRecord[];

    // Filter by yearMonth
    records = records.filter((r) => r.date && r.date.startsWith(yearMonth));

    if (classId && classId !== "all") {
      records = records.filter((r) => r.classId === classId);
    }
    if (sectionId && sectionId !== "all") {
      records = records.filter((r) => r.sectionId === sectionId);
    }

    return records.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("Failed to load student monthly attendance:", err);
    return [];
  }
}

/**
 * Computes class-wise attendance summary for a specific date across all classes & sections.
 */
export async function getClassWiseAttendanceSummary(
  schoolId: string,
  date: string,
  classesWithSections: SchoolClass[]
): Promise<ClassAttendanceSummary[]> {
  if (!schoolId || schoolId === "system" || !classesWithSections.length) return [];

  // Fetch all attendance records for date
  const records = await getSchoolAttendanceForDate(schoolId, date);
  const recordsByClassSection = new Map<string, AttendanceRecord[]>();

  records.forEach((r) => {
    const key = `${r.classId}_${r.sectionId}`;
    if (!recordsByClassSection.has(key)) {
      recordsByClassSection.set(key, []);
    }
    recordsByClassSection.get(key)!.push(r);
  });

  const summaries: ClassAttendanceSummary[] = [];

  classesWithSections.forEach((c) => {
    (c.sections || [{ id: "default", name: "Section A" }]).forEach((sec) => {
      const key = `${c.id}_${sec.id}`;
      const recs = recordsByClassSection.get(key) || [];

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;

      recs.forEach((r) => {
        const s = (r.status || "").toUpperCase();
        if (s === "PRESENT") presentCount++;
        else if (s === "ABSENT") absentCount++;
        else if (s === "LATE") lateCount++;
        else if (s === "HALF_DAY") halfDayCount++;
      });

      const totalMarked = recs.length;
      const effectivePresent = presentCount + lateCount + halfDayCount * 0.5;
      const percentage = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 0;

      summaries.push({
        classId: c.id,
        className: c.name,
        sectionId: sec.id,
        sectionName: sec.name,
        totalStudents: totalMarked,
        presentCount,
        absentCount,
        lateCount,
        halfDayCount,
        attendancePercentage: percentage,
        isMarked: totalMarked > 0,
      });
    });
  });

  return summaries;
}

