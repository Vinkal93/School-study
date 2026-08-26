import { UserRole, AppUser } from "@/types";

/**
 * Granular Platform Permission Tokens
 */
export type Permission =
  // School Management
  | "schools.read"
  | "schools.create"
  | "schools.update"
  | "schools.status"
  | "schools.delete"
  // User Management
  | "users.read"
  | "users.update"
  | "users.status"
  | "users.restrict"
  | "users.activity"
  // Analytics & Auditing
  | "analytics.read"
  | "audit.read"
  | "audit.write"
  // Academic & Operations
  | "teachers.read"
  | "teachers.create"
  | "teachers.update"
  | "teachers.delete"
  | "students.read"
  | "students.create"
  | "students.update"
  | "students.delete"
  | "classes.read"
  | "classes.manage"
  | "attendance.read"
  | "attendance.mark"
  | "notices.read"
  | "notices.create"
  | "notices.manage";

/**
 * Role-Based Permission Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "schools.read",
    "schools.create",
    "schools.update",
    "schools.status",
    "schools.delete",
    "users.read",
    "users.update",
    "users.status",
    "users.restrict",
    "users.activity",
    "analytics.read",
    "audit.read",
    "audit.write",
    "teachers.read",
    "teachers.create",
    "teachers.update",
    "teachers.delete",
    "students.read",
    "students.create",
    "students.update",
    "students.delete",
    "classes.read",
    "classes.manage",
    "attendance.read",
    "attendance.mark",
    "notices.read",
    "notices.create",
    "notices.manage",
  ],
  school_admin: [
    "schools.read",
    "users.read",
    "teachers.read",
    "teachers.create",
    "teachers.update",
    "teachers.delete",
    "students.read",
    "students.create",
    "students.update",
    "students.delete",
    "classes.read",
    "classes.manage",
    "attendance.read",
    "attendance.mark",
    "notices.read",
    "notices.create",
    "notices.manage",
  ],
  teacher: [
    "teachers.read",
    "students.read",
    "classes.read",
    "attendance.read",
    "attendance.mark",
    "notices.read",
    "notices.create",
  ],
  student: [
    "attendance.read",
    "notices.read",
  ],
};

/**
 * Checks if a user has a specific permission.
 */
export function hasPermission(user: AppUser | null | undefined, permission: Permission): boolean {
  if (!user || !user.role || user.status === "disabled") {
    return false;
  }
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

/**
 * Checks if a user has ALL required permissions.
 */
export function hasAllPermissions(user: AppUser | null | undefined, permissions: Permission[]): boolean {
  if (!user || !user.role || user.status === "disabled") {
    return false;
  }
  return permissions.every((p) => hasPermission(user, p));
}

/**
 * Checks if a user has ANY of the specified permissions.
 */
export function hasAnyPermission(user: AppUser | null | undefined, permissions: Permission[]): boolean {
  if (!user || !user.role || user.status === "disabled") {
    return false;
  }
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Checks if a role is Super Admin.
 */
export function isSuperAdminUser(user: AppUser | null | undefined): boolean {
  return !!user && user.role === "super_admin" && user.status === "active";
}
