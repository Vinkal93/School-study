import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
  type Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { AttendanceRecord, AttendanceStatus, StudentAttendanceStats } from "@/types";

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
