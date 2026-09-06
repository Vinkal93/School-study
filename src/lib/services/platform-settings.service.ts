import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import {
  PlatformSettingsDoc,
  DEFAULT_PLATFORM_SETTINGS,
  validateAndSanitizePlatformSettings,
} from "@/lib/settings/platformSettings";

const SETTINGS_COLLECTION = "siteSettings";
const PLATFORM_SETTINGS_DOC = "platformSettings";

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Retrieves authoritative platform settings from siteSettings/platformSettings.
 * Falls back safely to DEFAULT_PLATFORM_SETTINGS if unconfigured.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsDoc> {
  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(SETTINGS_COLLECTION).doc(PLATFORM_SETTINGS_DOC).get();
      if (snap.exists) {
        const data = snap.data();
        const { sanitized } = validateAndSanitizePlatformSettings(data, DEFAULT_PLATFORM_SETTINGS);
        return sanitized;
      }
    }

    if (typeof window !== "undefined") {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, SETTINGS_COLLECTION, PLATFORM_SETTINGS_DOC));
        if (snap.exists()) {
          const data = snap.data();
          const { sanitized } = validateAndSanitizePlatformSettings(data, DEFAULT_PLATFORM_SETTINGS);
          return sanitized;
        }
      }
    }
  } catch (err) {
    console.warn("[PlatformSettingsService] Fetch failed, using defaults:", err);
  }

  return { ...DEFAULT_PLATFORM_SETTINGS };
}

/**
 * Subscribes to real-time updates for platform settings.
 */
export function subscribeToPlatformSettings(
  callback: (settings: PlatformSettingsDoc) => void
): () => void {
  try {
    const db = getFirebaseDb();
    if (!db) {
      callback(DEFAULT_PLATFORM_SETTINGS);
      return () => {};
    }

    const docRef = doc(db, SETTINGS_COLLECTION, PLATFORM_SETTINGS_DOC);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const { sanitized } = validateAndSanitizePlatformSettings(data, DEFAULT_PLATFORM_SETTINGS);
          callback(sanitized);
        } else {
          callback(DEFAULT_PLATFORM_SETTINGS);
        }
      },
      (error) => {
        console.warn("[PlatformSettingsService] Real-time listener error:", error);
        callback(DEFAULT_PLATFORM_SETTINGS);
      }
    );
  } catch (e) {
    callback(DEFAULT_PLATFORM_SETTINGS);
    return () => {};
  }
}

/**
 * Persists updated platform settings.
 */
export async function updatePlatformSettings(
  input: Partial<PlatformSettingsDoc>,
  actor: { uid: string; name: string }
): Promise<{ success: boolean; settings: PlatformSettingsDoc; errors?: string[] }> {
  const current = await getPlatformSettings();
  const { isValid, sanitized, errors } = validateAndSanitizePlatformSettings(input, current);

  if (!isValid) {
    return { success: false, settings: current, errors };
  }

  sanitized.updatedAt = new Date().toISOString();
  sanitized.updatedByUid = actor.uid;
  sanitized.updatedByName = actor.name;

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(SETTINGS_COLLECTION).doc(PLATFORM_SETTINGS_DOC).set(sanitized, { merge: true });
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, SETTINGS_COLLECTION, PLATFORM_SETTINGS_DOC), sanitized, { merge: true });
      }
    }
    return { success: true, settings: sanitized };
  } catch (err: any) {
    console.error("[PlatformSettingsService] Update error:", err);
    return { success: false, settings: current, errors: [err.message || "Failed to update settings."] };
  }
}
