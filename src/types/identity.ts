export type UserRolePrefix = "SUP" | "SCH" | "ADM" | "TEC" | "STU" | string;

export interface IdentityPrefixes {
  super_admin: string;
  school_admin: string;
  teacher: string;
  student: string;
  school: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_IDENTITY_PREFIXES: IdentityPrefixes = {
  super_admin: "SUP",
  school_admin: "ADM",
  teacher: "TEC",
  student: "STU",
  school: "SCH",
};

export interface UniqueUserRecord {
  userId: string; // normalized e.g. "STU564534"
  uid: string;
  email: string;
  role: string;
  schoolId?: string;
  name?: string;
  createdAt: string;
  createdBy?: string;
  status: "active" | "inactive" | "suspended" | "deleted";
}

export interface UniqueSchoolRecord {
  schoolId: string; // normalized e.g. "SCH564534"
  uid?: string; // admin UID
  name: string;
  code?: string;
  createdAt: string;
  status: "active" | "inactive" | "suspended";
}

export interface IDAvailabilityResult {
  id: string;
  available: boolean;
  role?: string;
  message?: string;
}
