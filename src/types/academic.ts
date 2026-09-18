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
  classTeacherId?: string; // Teacher Profile ID or User UID
  classTeacherName?: string; // Teacher display name
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
  assignedClasses?: Array<{
    classId: string;
    className: string;
    sectionId?: string;
    sectionName?: string;
    subject?: string;
  }>;
  subjects?: string[];
  // HR Personal Details
  dob?: string;
  gender?: Gender;
  address?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  // HR Professional Details
  designation?: string; // e.g. "Senior Mathematics Teacher"
  employmentType?: "full_time" | "part_time" | "contract" | "visiting";
  qualification?: string; // e.g. "M.Sc. Mathematics, B.Ed."
  experienceYears?: number;
  experienceSummary?: string;
  // HR Salary Configuration
  salaryConfig?: {
    baseSalary: number;
    frequency: "monthly" | "biweekly";
    effectiveDate?: string;
    allowances?: Array<{ title: string; amount: number }>;
    deductions?: Array<{ title: string; amount: number }>;
    netSalary: number;
    bankAccount?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
  };
  // HR Documents
  documents?: Array<{
    id: string;
    title: string;
    category: "id_proof" | "qualification" | "joining" | "other";
    fileUrl: string;
    uploadedAt: string;
  }>;
  // Performance Tracking
  performanceSummary?: {
    rating: number;
    feedbackNotes?: Array<{
      date: string;
      note: string;
      adminName: string;
      rating?: number;
    }>;
  };
  status: "active" | "inactive" | "archived" | "deleted";
  deletedAt?: string | Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeacherTask {
  id: string;
  schoolId: string;
  teacherId: string;
  title: string;
  classTag?: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  createdAt?: any;
}

export interface StudyMaterial {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subject: string;
  title: string;
  description?: string;
  type: "document" | "pdf" | "image" | "link" | "video";
  fileUrl?: string;
  fileName?: string;
  externalUrl?: string;
  chapter?: string;
  createdAt: any;
}

export interface TeacherTest {
  id: string;
  schoolId: string;
  teacherId: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subject: string;
  title: string;
  maxMarks: number;
  testDate: string; // YYYY-MM-DD
  syllabus?: string;
  createdAt: any;
}

export interface TestScore {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  rollNumber?: number | string;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
  updatedAt: any;
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

export type StudentStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "left"
  | "dropped"
  | "not_continuing"
  | "graduated"
  | "transferred"
  | "archived"
  | "deleted";

export interface StudentPromotionRecord {
  id: string;
  fromClassId: string;
  fromClassName: string;
  toClassId: string;
  toClassName: string;
  fromYearId?: string;
  toYearId?: string;
  date: string;
  remarks?: string;
  promotedBy?: string;
}

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
  joinedClassId?: string;
  joinedClassName?: string;
  previousClasses?: Array<{
    classId: string;
    className: string;
    academicYearId?: string;
    yearName?: string;
    completedDate?: string;
  }>;
  promotionHistory?: StudentPromotionRecord[];
  guardianName?: string;
  fatherName?: string;
  motherName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelation?: string;
  bloodGroup?: string;
  status: StudentStatus;
  statusChangeReason?: string;
  statusChangedDate?: string;
  leavingDate?: string;
  leavingClass?: string;
  leavingReason?: string;
  transferHistory?: StudentTransferRecord[];
  deletedAt?: string | Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentTransferRecord {
  id: string;
  fromClassId: string;
  fromClassName: string;
  fromSectionId: string;
  fromSectionName: string;
  fromRollNumber?: number;
  toClassId: string;
  toClassName: string;
  toSectionId: string;
  toSectionName: string;
  toRollNumber: number;
  transferDate: string;
  reason?: string;
  transferredBy?: string;
  timestamp: string;
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
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelation?: string;
  bloodGroup?: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  academicYearId?: string;
  admissionDate?: string;
}

export interface TransferStudentsInput {
  sourceClassId: string;
  sourceClassName: string;
  sourceSectionId: string;
  sourceSectionName: string;
  sourceAcademicYearId?: string;
  targetClassId: string;
  targetClassName: string;
  targetSectionId: string;
  targetSectionName: string;
  targetAcademicYearId?: string;
  studentIds: string[];
  actionType: "promote" | "transfer" | "graduate";
  rollNumberMode: "keep" | "sequential";
  reason?: string;
  autoAssignFees?: boolean;
}
