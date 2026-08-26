import { Timestamp } from "firebase/firestore";
import { UserRole } from "./user";

export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_STUDENT"
  | "UPDATE_STUDENT"
  | "CREATE_TEACHER"
  | "UPDATE_TEACHER"
  | "MARK_ATTENDANCE"
  | "CREATE_NOTICE"
  | "UPDATE_PROFILE"
  | "ACCOUNT_RESTRICTED"
  | "ACCOUNT_UNRESTRICTED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_ACTIVATED"
  | "CREATE_SCHOOL"
  | "UPDATE_SCHOOL"
  | "SCHOOL_STATUS_CHANGE";

export type ActivityEntityType =
  | "user"
  | "school"
  | "student"
  | "teacher"
  | "attendance"
  | "notice"
  | "auth"
  | "system";

export interface ActivityLogEntry {
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  schoolId?: string | null;
  schoolName?: string;
  role: UserRole;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityName?: string;
  timestamp: Timestamp;
  status: "success" | "failure";
  failureReason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  platform?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
}
