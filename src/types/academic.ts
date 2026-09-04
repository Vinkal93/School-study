import { Timestamp } from "firebase/firestore";

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string; // e.g. "2026-27"
  startDate: string; // "2026-04-01"
  endDate: string; // "2027-03-31"
  isCurrent: boolean;
  createdAt: Timestamp;
}

export interface SchoolClass {
  id: string; // Random auto-generated document ID (NOT class name)
  schoolId: string;
  academicYearId?: string;
  name: string; // e.g. "Class 10"
  order: number; // e.g. 10
  status: "active" | "inactive";
  monthlyFee?: number; // In INR (e.g. 1500)
  admissionFee?: number; // In INR (e.g. 3000)
  otherFee?: number;
  lastRollNumber?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sections?: Section[];
}

export interface Section {
  id: string; // Random auto-generated document ID
  schoolId: string;
  classId: string;
  name: string; // e.g. "Section A"
  lastRollNumber?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeacherProfile {
  id: string;
  schoolId: string;
  userId: string; // UID in Firebase Auth & users/{uid}
  teacherCode: string; // e.g. "TCH-001" (Employee ID)
  name: string; // "Rahul Sharma"
  email: string;
  phone?: string;
  photoUrl?: string;
  joiningDate?: string;
  assignedClassId?: string;
  assignedClassName?: string;
  assignedSectionId?: string;
  assignedSectionName?: string;
  subjects?: string[];
  status: "active" | "inactive" | "archived" | "deleted";
  deletedAt?: string | Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateTeacherInput {
  teacherCode: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  photoUrl?: string;
  joiningDate?: string;
  assignedClassId?: string;
  assignedClassName?: string;
  assignedSectionId?: string;
  assignedSectionName?: string;
  subjects?: string[];
}

export type Gender = "male" | "female" | "other";

export interface StudentProfile {
  id: string; // Random auto-generated document ID
  schoolId: string;
  userId: string; // UID in Firebase Auth & users/{uid}
  studentId: string; // School-scoped unique ID e.g. "SBCI1", "SBCI2"
  admissionNumber: string; // e.g. "SBCI1" or manual reference
  rollNumber: number; // Class-wise auto-assigned: 1, 2, 3...
  name: string;
  photoUrl?: string;
  dob?: string; // YYYY-MM-DD
  gender: Gender;
  phone?: string;
  email: string; // Student Login Username
  address?: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  academicYearId?: string;
  admissionDate?: string;
  status: "active" | "inactive" | "transferred" | "archived" | "deleted";
  deletedAt?: string | Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateStudentInput {
  studentId?: string; // Auto-generated if not provided: `${schoolCode}${seq}`
  admissionNumber?: string;
  rollNumber?: number; // Auto-assigned if not provided: 1, 2, 3...
  name: string;
  email: string;
  password: string;
  dob?: string;
  gender: Gender;
  phone?: string;
  photoUrl?: string;
  address?: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  academicYearId?: string;
  admissionDate?: string;
}
