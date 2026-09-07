/**
 * STUDENT COMPLAINT & REPORT DATA CONTRACTS
 */

export type ComplaintCategory =
  | "DISCIPLINE"
  | "ATTENDANCE"
  | "ACADEMIC"
  | "BEHAVIOR"
  | "FEES"
  | "MISCONDUCT"
  | "OTHER";

export type ComplaintSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ComplaintStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export interface StudentComplaint {
  id: string;
  schoolId: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  className?: string;
  sectionName?: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  severity: ComplaintSeverity;
  incidentDate: string;
  attachmentRefs?: string[];
  status: ComplaintStatus;
  createdByUid: string;
  createdByName: string;
  createdByRole: "teacher" | "school_admin" | "admin" | "super_admin";
  notes?: string;
  createdAt: any;
  updatedAt: any;
  resolvedAt?: any;
  resolvedByUid?: string;
  resolvedByName?: string;
}

export interface CreateComplaintInput {
  studentId: string;
  studentUid?: string;
  studentName: string;
  className?: string;
  sectionName?: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  severity: ComplaintSeverity;
  incidentDate: string;
  attachmentRefs?: string[];
  notes?: string;
}

export interface UpdateComplaintStatusInput {
  status: ComplaintStatus;
  notes?: string;
}
