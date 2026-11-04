import type { UserRole } from "@/types";

export const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/super-admin",
  school_admin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/**
 * Normalizes legacy or shorthand roles to canonical UserRole.
 * E.g. "admin" -> "school_admin"
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return "student";
  const r = role.toLowerCase().trim();
  if (r === "admin" || r === "school_admin" || r === "principal") return "school_admin";
  if (r === "super_admin" || r === "superadmin") return "super_admin";
  if (r === "teacher" || r === "faculty") return "teacher";
  return "student";
}

/**
 * Returns the dashboard route for a given user role.
 */
export function getRedirectByRole(role: UserRole | string): string {
  const normalized = normalizeRole(role);
  return ROLE_ROUTES[normalized] || ROLE_ROUTES[role] || "/admin";
}

/**
 * Returns the allowed role for a given route prefix.
 * e.g. "/super-admin" → "super_admin", "/admin" → "school_admin"
 */
export function getRoleFromPath(pathname: string): UserRole | null {
  for (const [role, route] of Object.entries(ROLE_ROUTES)) {
    if (role === "admin") continue; // canonical is school_admin
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return role as UserRole;
    }
  }
  return null;
}

/**
 * Checks if a user role is allowed to access a given path.
 */
export function isRoleAllowedForPath(
  role: UserRole | string,
  pathname: string
): boolean {
  const normalized = normalizeRole(role);
  if (normalized === "super_admin") {
    return true; // Super Admin has universal platform visibility
  }
  const requiredRole = getRoleFromPath(pathname);
  if (!requiredRole) return true; // not a role-protected route
  return normalized === requiredRole;
}
