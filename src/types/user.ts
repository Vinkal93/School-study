import { Timestamp } from "firebase/firestore";

export type UserRole = "super_admin" | "school_admin" | "teacher" | "student";

export type UserStatus = "active" | "disabled";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string; // null/undefined for super_admin
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
