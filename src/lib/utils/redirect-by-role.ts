import type { UserRole } from "@/types";

const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: "/super-admin",
  school_admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/**
 * Returns the dashboard route for a given user role.
 */
export function getRedirectByRole(role: UserRole): string {
  return ROLE_ROUTES[role];
}

/**
 * Returns the allowed role for a given route prefix.
 * e.g. "/super-admin" → "super_admin"
 */
export function getRoleFromPath(pathname: string): UserRole | null {
  for (const [role, route] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      return role as UserRole;
    }
  }
  return null;
}

/**
 * Checks if a user role is allowed to access a given path.
 */
export function isRoleAllowedForPath(
  role: UserRole,
  pathname: string
): boolean {
  const requiredRole = getRoleFromPath(pathname);
  if (!requiredRole) return true; // not a role-protected route
  return role === requiredRole;
}
