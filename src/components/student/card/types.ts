/**
 * Phase 2 Student Profile Card Data Contracts (Section 19)
 */

export type StudentVerificationStatus = "verified" | "pending" | "unverified";
export type StudentAccountStatus = "active" | "inactive" | "suspended";

export interface StudentCardData {
  id: string;
  fullName: string;
  photoUrl?: string;
  verificationStatus?: StudentVerificationStatus;
  academicGroup?: string;
  className: string;
  section?: string;
  rollNumber?: string;
  admissionNumber?: string;
  status: StudentAccountStatus;
}

export interface TenantCardData {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface StudentProfileCardProps {
  student: StudentCardData;
  tenant: TenantCardData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCardClick?: () => void;
}
