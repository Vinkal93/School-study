import { Timestamp } from "firebase/firestore";

export type SchoolStatus = "active" | "inactive" | "trial" | "suspended" | "expired" | "archived";
export type SchoolVerifyBadge = "none" | "basic" | "gold" | "premium";

export interface School {
  id: string;
  name: string;
  code: string; // unique short code (e.g. DPS001)
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  status: SchoolStatus;
  verificationBadge?: SchoolVerifyBadge | null;
  adminId?: string; // UID of primary school admin
  adminUid?: string;
  adminName?: string;
  adminEmail?: string;
  pincode?: string;
  website?: string;
  description?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  setupCompleted?: boolean;
  setupStep?: number;
  onboardingStatus?: "not_started" | "in_progress" | "completed";
  onboardingCurrentStep?: number;
  onboardingCompletedSteps?: number[];
  onboardingCompleted?: boolean;
  onboardingStartedAt?: any;
  onboardingCompletedAt?: any;
  planId?: string;
  planName?: string;
  studentCount?: number;
  teacherCount?: number;
  lastActivityAt?: any;
  isReadOnly?: boolean;
  isEmergencyPaused?: boolean;
  subscriptionExpiresAt?: string;
  subscriptionStatus?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateSchoolInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}
