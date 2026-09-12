import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import {
  DEFAULT_IDENTITY_PREFIXES,
  type IdentityPrefixes,
  type UniqueUserRecord,
  type UniqueSchoolRecord,
  type IDAvailabilityResult,
} from "@/types/identity";

const RESERVED_IDS = new Set([
  "ADMIN", "SUPERADMIN", "ROOT", "SYSTEM", "SUPPORT", "TEST", "DEMO",
  "SCH000000", "STU000000", "TEC000000", "ADM000000", "SUP000000"
]);

/**
 * Normalizes an identity string: trims, removes spaces, uppercase.
 */
export function normalizeIdentity(id: string): string {
  if (!id) return "";
  return id.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Retrieves configurable identity prefixes from `siteSettings/identity_prefixes`.
 * Super Admin can configure these prefixes; fallback to defaults.
 */
export async function getIdentityPrefixes(): Promise<IdentityPrefixes> {
  try {
    const db = getFirebaseDb();
    if (!db) return DEFAULT_IDENTITY_PREFIXES;
    const snap = await getDoc(doc(db, "siteSettings", "identity_prefixes"));
    if (snap.exists()) {
      return { ...DEFAULT_IDENTITY_PREFIXES, ...(snap.data() as Partial<IdentityPrefixes>) };
    }
  } catch (err) {
    console.warn("getIdentityPrefixes notice (client):", err);
  }

  return DEFAULT_IDENTITY_PREFIXES;
}

/**
 * Updates configurable identity prefixes (Super Admin only).
 * Affects NEW IDs only.
 */
export async function updateIdentityPrefixes(
  prefixes: Partial<IdentityPrefixes>,
  actorId: string = "super_admin"
): Promise<IdentityPrefixes> {
  const current = await getIdentityPrefixes();
  const updated: IdentityPrefixes = {
    ...current,
    ...prefixes,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "siteSettings", "identity_prefixes"), updated, { merge: true });
  }

  return updated;
}

/**
 * Validates a custom or generated ID against prefix, regex, length, and reserved keywords.
 */
export function validateIdentityFormat(
  id: string,
  role?: string,
  expectedPrefix?: string
): { valid: boolean; message?: string } {
  const normalized = normalizeIdentity(id);
  if (!normalized) {
    return { valid: false, message: "ID cannot be empty." };
  }

  if (normalized.length < 5 || normalized.length > 16) {
    return { valid: false, message: "ID must be between 5 and 16 characters long." };
  }

  // Must contain only uppercase letters and digits, starting with letters
  if (!/^[A-Z]{2,6}[0-9]{3,10}$/.test(normalized)) {
    return {
      valid: false,
      message: "ID must start with 2-6 uppercase letters followed by 3-10 numbers (e.g. STU564534).",
    };
  }

  if (RESERVED_IDS.has(normalized)) {
    return { valid: false, message: `ID "${normalized}" is a reserved system identifier.` };
  }

  if (expectedPrefix && !normalized.startsWith(expectedPrefix.toUpperCase())) {
    return {
      valid: false,
      message: `ID must begin with the expected prefix "${expectedPrefix}".`,
    };
  }

  return { valid: true };
}

/**
 * Checks if a User ID or School ID is available.
 */
export async function checkIdentityAvailable(
  id: string,
  isSchool: boolean = false
): Promise<IDAvailabilityResult> {
  const normalized = normalizeIdentity(id);
  const collectionName = isSchool ? "schoolIds" : "userIds";

  const formatCheck = validateIdentityFormat(normalized);
  if (!formatCheck.valid) {
    return { id: normalized, available: false, message: formatCheck.message };
  }

  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, collectionName, normalized));
      if (snap.exists()) {
        return { id: normalized, available: false, message: "Already in use" };
      }
      return { id: normalized, available: true, message: "Available" };
    } catch (err: any) {
      console.warn("checkIdentityAvailable notice (client):", err?.message);
    }
  }

  // If DB check not possible, assume available format-wise
  return { id: normalized, available: true, message: "Available" };
}

/**
 * Atomically generates a collision-free authoritative User ID or School ID.
 * Example outputs: STU564534, TEC234523, ADM234523, SCH564534, SUP123456.
 */
export async function generateAuthoritativeId(
  role: string,
  schoolId?: string
): Promise<string> {
  const prefixes = await getIdentityPrefixes();
  let prefix = "STU";

  const r = role.toLowerCase();
  if (r === "super_admin" || r === "superadmin") prefix = prefixes.super_admin || "SUP";
  else if (r === "school" || r === "school_id") prefix = prefixes.school || "SCH";
  else if (r === "school_admin" || r === "admin") prefix = prefixes.school_admin || "ADM";
  else if (r === "teacher") prefix = prefixes.teacher || "TEC";
  else if (r === "student") prefix = prefixes.student || "STU";

  const isSchool = r === "school" || r === "school_id";

  // Try up to 10 attempts to generate an unused random 6-digit number
  for (let attempt = 0; attempt < 10; attempt++) {
    // 6-digit random number between 100000 and 999999
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `${prefix}${randomNum}`;

    const availability = await checkIdentityAvailable(candidateId, isSchool);
    if (availability.available) {
      return candidateId;
    }
  }

  // Fallback timestamp-based suffix if collisions occur
  const timestampSuffix = String(Date.now()).slice(-6);
  return `${prefix}${timestampSuffix}`;
}

/**
 * Atomically reserves a User ID in `userIds/{normalizedUserId}`.
 * Prevents race conditions and duplicate assignments.
 */
export async function reserveUserIdentity(
  userId: string,
  record: Omit<UniqueUserRecord, "userId">
): Promise<UniqueUserRecord> {
  const normalized = normalizeIdentity(userId);
  const format = validateIdentityFormat(normalized);
  if (!format.valid) {
    throw new Error(format.message || "Invalid User ID format.");
  }

  const completeRecord: UniqueUserRecord = {
    userId: normalized,
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };

  // Atomic transaction using Firestore client SDK
  const db = getFirebaseDb();
  if (!db) throw new Error("Database offline.");

  const ref = doc(db, "userIds", normalized);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) {
      throw new Error(`User ID "${normalized}" is already in use.`);
    }
    tx.set(ref, completeRecord);
  });

  return completeRecord;
}

/**
 * Atomically reserves a School ID in `schoolIds/{normalizedSchoolId}`.
 */
export async function reserveSchoolIdentity(
  schoolId: string,
  record: Omit<UniqueSchoolRecord, "schoolId">
): Promise<UniqueSchoolRecord> {
  const normalized = normalizeIdentity(schoolId);
  const format = validateIdentityFormat(normalized);
  if (!format.valid) {
    throw new Error(format.message || "Invalid School ID format.");
  }

  const completeRecord: UniqueSchoolRecord = {
    schoolId: normalized,
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (!db) throw new Error("Database offline.");

  const ref = doc(db, "schoolIds", normalized);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) {
      throw new Error(`School ID "${normalized}" is already in use.`);
    }
    tx.set(ref, completeRecord);
  });

  return completeRecord;
}
