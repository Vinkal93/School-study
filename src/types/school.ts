import { Timestamp } from "firebase/firestore";

export type SchoolStatus = "active" | "inactive";
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
  adminEmail?: string;
  setupCompleted?: boolean;
  setupStep?: number;
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
