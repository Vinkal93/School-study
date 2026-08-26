import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isSuperAdminUser,
} from "../index";
import type { AppUser } from "@/types";
import { Timestamp } from "firebase/firestore";

/**
 * Self-contained Test Verification Runner for Centralized Permissions
 */
export function runPermissionSecurityTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  const dummyTimestamp = Timestamp.now();

  const superAdminUser: AppUser = {
    uid: "sa-1",
    name: "Super Administrator",
    email: "superadmin@platform.com",
    role: "super_admin",
    schoolId: undefined,
    status: "active",
    createdAt: dummyTimestamp,
    updatedAt: dummyTimestamp,
  };

  const schoolAdminUser: AppUser = {
    uid: "admin-1",
    name: "Principal Admin",
    email: "admin@school.com",
    role: "school_admin",
    schoolId: "school-123",
    status: "active",
    createdAt: dummyTimestamp,
    updatedAt: dummyTimestamp,
  };

  const teacherUser: AppUser = {
    uid: "tch-1",
    name: "Math Teacher",
    email: "teacher@school.com",
    role: "teacher",
    schoolId: "school-123",
    status: "active",
    createdAt: dummyTimestamp,
    updatedAt: dummyTimestamp,
  };

  const studentUser: AppUser = {
    uid: "stu-1",
    name: "Student One",
    email: "student@school.com",
    role: "student",
    schoolId: "school-123",
    status: "active",
    createdAt: dummyTimestamp,
    updatedAt: dummyTimestamp,
  };

  const disabledSuperAdmin: AppUser = {
    ...superAdminUser,
    status: "disabled",
  };

  function assert(condition: boolean, description: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${description}`);
    }
    results.push(`✓ Passed: ${description}`);
  }

  try {
    // 1. Super Admin Privileged Access
    assert(hasPermission(superAdminUser, "schools.read"), "Super admin can read schools");
    assert(hasPermission(superAdminUser, "schools.create"), "Super admin can create schools");
    assert(hasPermission(superAdminUser, "schools.status"), "Super admin can change school status");
    assert(hasPermission(superAdminUser, "users.restrict"), "Super admin can restrict users");
    assert(hasPermission(superAdminUser, "audit.read"), "Super admin can read audit logs");
    assert(hasPermission(superAdminUser, "analytics.read"), "Super admin can read analytics");
    assert(isSuperAdminUser(superAdminUser), "isSuperAdminUser identifies active super admin");

    // 2. Disabled Account Denial
    assert(!hasPermission(disabledSuperAdmin, "schools.read"), "Disabled super admin is denied permission");
    assert(!hasPermission(disabledSuperAdmin, "users.restrict"), "Disabled super admin cannot restrict");
    assert(!hasPermission(disabledSuperAdmin, "audit.read"), "Disabled super admin cannot read audit logs");
    assert(!isSuperAdminUser(disabledSuperAdmin), "isSuperAdminUser rejects disabled super admin");

    // 3. Role Escalation Prevention
    assert(!hasPermission(schoolAdminUser, "schools.status"), "School admin cannot modify school status");
    assert(!hasPermission(schoolAdminUser, "schools.delete"), "School admin cannot delete school");
    assert(!hasPermission(schoolAdminUser, "users.restrict"), "School admin cannot restrict platform users");
    assert(!hasPermission(schoolAdminUser, "audit.read"), "School admin cannot read platform audit logs");
    assert(!hasPermission(schoolAdminUser, "analytics.read"), "School admin cannot read platform analytics");
    assert(!isSuperAdminUser(schoolAdminUser), "isSuperAdminUser rejects school admin");

    // 4. Multi-permission logic
    assert(
      hasAllPermissions(superAdminUser, ["schools.read", "audit.read", "users.status"]),
      "hasAllPermissions succeeds for super admin"
    );
    assert(
      !hasAllPermissions(schoolAdminUser, ["schools.read", "audit.read"]),
      "hasAllPermissions fails when school admin lacks audit.read"
    );
    assert(
      hasAnyPermission(schoolAdminUser, ["audit.read", "teachers.create"]),
      "hasAnyPermission matches teachers.create for school admin"
    );

    return { passed: true, results };
  } catch (error: any) {
    return { passed: false, results: [...results, `✗ Error: ${error?.message}`] };
  }
}
