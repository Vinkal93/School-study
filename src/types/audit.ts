import { Timestamp } from "firebase/firestore";
import { UserRole } from "./user";

export type AuditAction =
  | "USER_STATUS_CHANGE"
  | "USER_RESTRICT"
  | "USER_UNRESTRICT"
  | "USER_UPDATE_PROFILE"
  | "USER_RESET_PASSWORD"
  | "SCHOOL_CREATE"
  | "SCHOOL_UPDATE"
  | "SCHOOL_STATUS_CHANGE"
  | "PLATFORM_CONFIG_CHANGE"
  | "ADMIN_ACTION";

export type AuditTargetType = "user" | "school" | "system" | "class" | "notice";

export interface AuditPerformer {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  targetId: string;
  targetType: AuditTargetType;
  targetName?: string;
  performedBy: AuditPerformer;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp | any;
}

export interface LoginLogEntry {
  id?: string;
  uid: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
  status: "success" | "failed";
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp | any;
}
