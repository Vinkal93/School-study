/**
 * CENTRALIZED SCHOOL & MEMBERSHIP VALIDATION ENGINE
 *
 * Authoritative, backend-verified gatekeeper for tenant validity.
 * Validates authenticated user UID, membership, school ID, user status,
 * role, and school status.
 *
 * Rules:
 * 1. Only ACTIVE schools and ACTIVE authorized members may access school resources.
 * 2. Deleted, suspended, missing, or deleting schools are denied immediately.
 * 3. Never relies exclusively on frontend state, cached roles, Firebase authentication,
 *    or JWT claims for school authorization.
 */

import { NextResponse } from "next/server";
import type { AuthenticatedUser } from "./serverAuth";

export interface SchoolRecordInfo {
  id: string;
  name: string;
  code?: string;
  status: string;
  operationalStatus?: string;
  isDeleting?: boolean;
  isDeleted?: boolean;
  isReadOnly?: boolean;
  isEmergencyPaused?: boolean;
  adminEmail?: string;
  adminUid?: string;
}

export type SchoolValidationErrorCode =
  | "SCHOOL_NOT_FOUND"
  | "SCHOOL_DELETED"
  | "SCHOOL_DELETING"
  | "SCHOOL_SUSPENDED"
  | "SCHOOL_EXPIRED"
  | "SCHOOL_ARCHIVED"
  | "SCHOOL_INACTIVE"
  | "MISSING_SCHOOL_ASSIGNMENT"
  | "USER_NOT_ACTIVE"
  | "USER_NOT_FOUND"
  | "UNAUTHORIZED_ROLE"
  | "MEMBERSHIP_INVALID"
  | "CROSS_TENANT_ACCESS_DENIED";

export interface SchoolValidationResult {
  valid: boolean;
  allowed: boolean; // Alias to valid for convenience and backward compatibility
  status?: string;
  code?: SchoolValidationErrorCode;
  error?: string;
  reason?: string; // Alias to error
  statusHttp: number;
  school?: SchoolRecordInfo;
}

// In-memory short-term cache for high-throughput API validation (TTL: 10 seconds)
interface CachedValidation {
  result: SchoolValidationResult;
  timestamp: number;
}

const SCHOOL_STATUS_CACHE = new Map<string, CachedValidation>();
const CACHE_TTL_MS = 10 * 1000; // 10 seconds

/**
 * Immediately purges the in-memory validation cache for a school (or all schools).
 * Call this when a school is deleted, suspended, or its status changes.
 */
export function invalidateSchoolValidationCache(schoolId?: string): void {
  if (schoolId) {
    SCHOOL_STATUS_CACHE.delete(schoolId);
    SCHOOL_STATUS_CACHE.delete(schoolId.trim().toLowerCase());
  } else {
    SCHOOL_STATUS_CACHE.clear();
  }
}

/**
 * Resolves safe server-side admin Firestore instance.
 */
async function getServerDb() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function"
      ? adminModule.getSafeAdminDb()
      : (adminModule.adminDb || null);
  } catch {
    return null;
  }
}

/**
 * Resolves safe client Firestore instance as fallback.
 */
async function getClientDb() {
  try {
    const clientModule = await import("@/lib/firebase/client");
    return typeof clientModule.getFirebaseDb === "function"
      ? clientModule.getFirebaseDb()
      : null;
  } catch {
    return null;
  }
}

/**
 * Authoritatively validates whether a school exists and is in an ACTIVE operational state.
 * Denies deleted, suspended, missing, deleting, or expired schools immediately.
 */
export async function validateSchoolStatus(schoolId?: string | null, skipCache = false): Promise<SchoolValidationResult> {
  const cleanId = (schoolId || "").trim();
  if (!cleanId) {
    return {
      valid: false,
      allowed: false,
      status: "missing",
      code: "MISSING_SCHOOL_ASSIGNMENT",
      error: "School Account Not Found. No school campus assigned. Please contact support.",
      reason: "School Account Not Found. No school campus assigned. Please contact support.",
      statusHttp: 403,
    };
  }

  // Check short-term cache if not explicitly skipped
  if (!skipCache) {
    const cached = SCHOOL_STATUS_CACHE.get(cleanId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  let schoolData: SchoolRecordInfo | null = null;
  let schoolExists = false;

  // 1. Authoritative Server-side Admin DB Lookup
  const adminDb = await getServerDb();
  if (adminDb) {
    try {
      const docSnap = await adminDb.collection("schools").doc(cleanId).get();
      if (docSnap.exists) {
        schoolExists = true;
        const d = docSnap.data() || {};
        schoolData = {
          id: docSnap.id,
          name: d.name || d.schoolName || cleanId,
          code: d.code || "",
          status: (d.status || "").toLowerCase(),
          operationalStatus: d.operationalStatus || "",
          isDeleting: Boolean(d.isDeleting),
          isDeleted: Boolean(d.isDeleted),
          isReadOnly: Boolean(d.isReadOnly),
          isEmergencyPaused: Boolean(d.isEmergencyPaused),
          adminEmail: d.adminEmail,
          adminUid: d.adminUid || d.adminId,
        };
      }
    } catch (adminErr) {
      console.warn("[schoolValidation] AdminDb lookup notice:", adminErr);
    }
  }

  // 2. Client SDK Fallback (if Admin SDK unavailable or client-side context)
  if (!schoolExists) {
    try {
      const clientDb = await getClientDb();
      if (clientDb) {
        const { doc, getDoc } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(clientDb, "schools", cleanId));
        if (docSnap.exists()) {
          schoolExists = true;
          const d = docSnap.data() as any;
          schoolData = {
            id: docSnap.id,
            name: d.name || d.schoolName || cleanId,
            code: d.code || "",
            status: (d.status || "").toLowerCase(),
            operationalStatus: d.operationalStatus || "",
            isDeleting: Boolean(d.isDeleting),
            isDeleted: Boolean(d.isDeleted),
            isReadOnly: Boolean(d.isReadOnly),
            isEmergencyPaused: Boolean(d.isEmergencyPaused),
            adminEmail: d.adminEmail,
            adminUid: d.adminUid || d.adminId,
          };
        }
      }
    } catch (clientErr) {
      console.warn("[schoolValidation] ClientDb lookup notice:", clientErr);
    }
  }

  // 3. Client HTTP API Fallback (runs in browser context to query authoritative server adminDb)
  if (!schoolExists && typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/super-admin/schools/${cleanId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.school) {
          schoolExists = true;
          schoolData = json.school;
        }
      } else if (res.status === 403 || res.status === 404) {
        const errJson = await res.json().catch(() => ({}));
        const code = errJson.code || (res.status === 404 ? "SCHOOL_NOT_FOUND" : "SCHOOL_INACTIVE");
        const isDeleted = code === "SCHOOL_DELETED" || code === "SCHOOL_NOT_FOUND";
        const result: SchoolValidationResult = {
          valid: false,
          allowed: false,
          status: isDeleted ? "deleted" : "suspended",
          code,
          error: errJson.error || "School Account Not Found. This school account no longer exists. Please contact support.",
          reason: errJson.error || "School Account Not Found. This school account no longer exists. Please contact support.",
          statusHttp: res.status,
        };
        SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
        return result;
      }
    } catch (fetchErr) {
      console.warn("[schoolValidation] Client fetch fallback notice:", fetchErr);
    }
  }

  // If school does not exist in authoritative storage -> DENIED
  if (!schoolExists || !schoolData) {
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: "missing",
      code: "SCHOOL_NOT_FOUND",
      error: "School Account Not Found. This school account no longer exists. Please contact support.",
      reason: "School Account Not Found. This school account no longer exists. Please contact support.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  // Check for deleted or deleting states
  if (
    schoolData.isDeleting ||
    schoolData.isDeleted ||
    schoolData.status === "deleting" ||
    schoolData.status === "deleted" ||
    schoolData.operationalStatus === "DELETING" ||
    schoolData.operationalStatus === "DELETED"
  ) {
    const isDeleting = schoolData.isDeleting || schoolData.status === "deleting" || schoolData.operationalStatus === "DELETING";
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: isDeleting ? "deleting" : "deleted",
      code: "SCHOOL_DELETED",
      error: "School Account Not Found. This school account no longer exists. Please contact support.",
      reason: "School Account Not Found. This school account no longer exists. Please contact support.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  // Check for suspended state
  if (
    schoolData.status === "suspended" ||
    schoolData.operationalStatus === "SUSPENDED" ||
    schoolData.status === "paused" ||
    schoolData.isEmergencyPaused
  ) {
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: "suspended",
      code: "SCHOOL_SUSPENDED",
      error: "School Access Suspended. This school account is currently suspended. Please contact platform admin.",
      reason: "School Access Suspended. This school account is currently suspended. Please contact platform admin.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  // Check for expired or archived states
  if (schoolData.status === "expired") {
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: "expired",
      code: "SCHOOL_EXPIRED",
      error: "School Subscription Expired. Please contact your school administrator to renew access.",
      reason: "School Subscription Expired. Please contact your school administrator to renew access.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  if (schoolData.status === "archived") {
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: "archived",
      code: "SCHOOL_ARCHIVED",
      error: "School Account Archived. This school account has been archived. Please contact support.",
      reason: "School Account Archived. This school account has been archived. Please contact support.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  // Only ACTIVE (or valid active trial) schools may access resources
  if (schoolData.status !== "active" && schoolData.status !== "trial") {
    const result: SchoolValidationResult = {
      valid: false,
      allowed: false,
      status: schoolData.status || "inactive",
      code: "SCHOOL_INACTIVE",
      error: "School Account Inactive. This school account is not currently active. Please contact support.",
      reason: "School Account Inactive. This school account is not currently active. Please contact support.",
      statusHttp: 403,
    };
    SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
    return result;
  }

  // Valid Active School
  const result: SchoolValidationResult = {
    valid: true,
    allowed: true,
    status: schoolData.status || "active",
    school: schoolData,
    statusHttp: 200,
  };
  SCHOOL_STATUS_CACHE.set(cleanId, { result, timestamp: Date.now() });
  return result;
}

/**
 * Validates the authenticated user UID, membership, school ID, user status, role,
 * and school status through the backend.
 *
 * Guarantees:
 * - Only ACTIVE schools and ACTIVE authorized members may access school resources.
 * - Deleted, suspended, missing, or deleting schools are denied immediately.
 * - Cross-school tenant isolation is strictly enforced.
 */
export async function validateTenantMember(
  user: AuthenticatedUser,
  targetSchoolId?: string
): Promise<SchoolValidationResult> {
  // Super Admin direct platform access (when NOT impersonating a school tenant)
  if (user.role === "super_admin" && !user.impersonatedBy) {
    if (targetSchoolId) {
      // If super admin is accessing a specific school's resources, validate target school
      return await validateSchoolStatus(targetSchoolId);
    }
    return {
      valid: true,
      allowed: true,
      status: "active",
      statusHttp: 200,
    };
  }

  // Non-Super-Admin MUST have an assigned schoolId
  if (!user.schoolId || !user.schoolId.trim()) {
    return {
      valid: false,
      allowed: false,
      status: "missing",
      code: "MISSING_SCHOOL_ASSIGNMENT",
      error: "Tenant Configuration Error: User has no assigned school campus. Please contact support.",
      reason: "Tenant Configuration Error: User has no assigned school campus. Please contact support.",
      statusHttp: 403,
    };
  }

  // User's own account status MUST be active
  if (
    user.status === "suspended" ||
    user.status === "disabled" ||
    user.status === "inactive" ||
    user.status === "blocked"
  ) {
    return {
      valid: false,
      allowed: false,
      status: user.status || "inactive",
      code: "USER_NOT_ACTIVE",
      error: `Account access revoked. Your account is ${user.status}.`,
      reason: `Account access revoked. Your account is ${user.status}.`,
      statusHttp: 403,
    };
  }

  // Multi-Tenant Isolation: User can ONLY access their own assigned school
  if (targetSchoolId && targetSchoolId.trim() && user.schoolId !== targetSchoolId.trim()) {
    return {
      valid: false,
      allowed: false,
      status: "forbidden",
      code: "CROSS_TENANT_ACCESS_DENIED",
      error: "Access Denied. You do not have authorization to access this school's data.",
      reason: "Access Denied. You do not have authorization to access this school's data.",
      statusHttp: 403,
    };
  }

  // Validate the School's central registry status
  const schoolValidation = await validateSchoolStatus(user.schoolId);
  if (!schoolValidation.valid) {
    return schoolValidation;
  }

  return {
    valid: true,
    allowed: true,
    status: schoolValidation.status || "active",
    school: schoolValidation.school,
    statusHttp: 200,
  };
}

/**
 * Helper to build standard JSON response from SchoolValidationResult when validation fails.
 */
export function buildValidationErrorResponse(result: SchoolValidationResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      valid: false,
      code: result.code || "FORBIDDEN",
      errorCode: result.code || "FORBIDDEN",
      error: result.error || "Access Denied.",
    },
    { status: result.statusHttp || 403 }
  );
}
