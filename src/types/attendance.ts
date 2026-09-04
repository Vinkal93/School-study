import { Timestamp } from "firebase/firestore";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface AttendanceRecord {
  id: string; // Deterministic ID: `${schoolId}_${studentId}_${date}`
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: number;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  teacherId: string;
  teacherName: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentAttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  percentage: number;
  records: AttendanceRecord[];
}
