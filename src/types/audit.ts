import { Timestamp } from "firebase/firestore";
import { UserRole } from "./user";

export type AuditAction =
  | "SCHOOL_CREATED"
  | "SCHOOL_UPDATED"
  | "SCHOOL_DISABLED"
  | "SCHOOL_ENABLED"
  | "USER_UPDATED"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_RESTRICTED"
  | "USER_UNRESTRICTED"
  | "TEACHER_CREATED"
  | "STUDENT_CREATED"
  | "ROLE_CHANGED"
  | "ADMIN_CREATED"
  | "USER_STATUS_CHANGE"
  | "USER_RESTRICT"
  | "USER_UNRESTRICT"
  | "USER_UPDATE_PROFILE"
  | "SCHOOL_CREATE"
  | "SCHOOL_UPDATE"
  | "SCHOOL_STATUS_CHANGE"
  | "ADMIN_ACTION";

export type AuditTargetType =
  | "user"
  | "school"
  | "teacher"
  | "student"
  | "admin"
  | "system"
  | "class"
  | "notice";

export interface AuditPerformer {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
}

export interface AuditLogEntry {
  id?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: UserRole;
  actorSchoolId?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  targetSchoolId?: string | null;
  targetSchoolName?: string | null;
  action: AuditAction;
  entityType: AuditTargetType;
  entityId?: string | null;
  timestamp: Timestamp | any;
  reason?: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  // Legacy backward-compatible fields
  targetId?: string;
  targetType?: AuditTargetType;
  targetName?: string;
  performedBy?: AuditPerformer;
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
  browser?: string;
  platform?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  timestamp: Timestamp | any;
}
