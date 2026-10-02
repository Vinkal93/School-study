import { Timestamp } from "firebase/firestore";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE";

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
  remarks?: string;
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

export interface EmployeeAttendanceRecord {
  id: string; // `${schoolId}_${employeeId}_${date}`
  schoolId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  employeePhone?: string;
  department?: string;
  designation?: string;
  role?: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  leaveType?: "CASUAL" | "SICK" | "DUTY" | "UNPAID" | "MATERNITY" | "OTHER";
  markedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface EmployeeAttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  halfDays: number;
  percentage: number;
  records: EmployeeAttendanceRecord[];
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  attendancePercentage: number;
  isMarked: boolean;
}

