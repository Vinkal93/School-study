import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  PortalKey,
  PortalUIVersion,
  PortalUISettings,
  DEFAULT_PORTAL_UI_SETTINGS,
  PortalUIHistoryItem,
} from "@/types/portal-ui";

const SETTINGS_COLLECTION = "siteSettings";
const PORTAL_UI_DOC = "portalUI";

/**
 * Subscribes to real-time Portal UI/UX settings from Firestore.
 * If document does not exist, automatically falls back to default ("classic").
 */
export function subscribeToPortalUISettings(
  callback: (settings: PortalUISettings) => void
): () => void {
  try {
    const db = getFirebaseDb();
    if (!db) {
      callback(DEFAULT_PORTAL_UI_SETTINGS);
      return () => {};
    }

    const docRef = doc(db, SETTINGS_COLLECTION, PORTAL_UI_DOC);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const settings: PortalUISettings = {
            schoolAdmin: data.schoolAdmin === "new" ? "new" : "classic",
            teacher: data.teacher === "new" ? "new" : "classic",
            student: data.student === "new" ? "new" : "classic",
            superAdmin: data.superAdmin === "new" ? "new" : "classic",
            landingPage: data.landingPage === "new" ? "new" : "classic",
            updatedAt: data.updatedAt || null,
            updatedByUid: data.updatedByUid || "",
            updatedByName: data.updatedByName || "",
            history: Array.isArray(data.history) ? data.history : [],
          };
          callback(settings);
        } else {
          // Document does not exist yet; provide defaults
          callback(DEFAULT_PORTAL_UI_SETTINGS);
        }
      },
      (error) => {
        console.warn("[PortalUIService] Real-time subscription error, using defaults:", error);
        callback(DEFAULT_PORTAL_UI_SETTINGS);
      }
    );
  } catch (err) {
    console.warn("[PortalUIService] Failed to initialize listener:", err);
    callback(DEFAULT_PORTAL_UI_SETTINGS);
    return () => {};
  }
}

/**
 * Fetches current Portal UI settings snapshot.
 */
export async function getPortalUISettings(): Promise<PortalUISettings> {
  try {
    const db = getFirebaseDb();
    if (!db) return DEFAULT_PORTAL_UI_SETTINGS;

    const docRef = doc(db, SETTINGS_COLLECTION, PORTAL_UI_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        schoolAdmin: data.schoolAdmin === "new" ? "new" : "classic",
        teacher: data.teacher === "new" ? "new" : "classic",
        student: data.student === "new" ? "new" : "classic",
        superAdmin: data.superAdmin === "new" ? "new" : "classic",
        landingPage: data.landingPage === "new" ? "new" : "classic",
        updatedAt: data.updatedAt || null,
        updatedByUid: data.updatedByUid || "",
        updatedByName: data.updatedByName || "",
        history: Array.isArray(data.history) ? data.history : [],
      };
    }
    return DEFAULT_PORTAL_UI_SETTINGS;
  } catch (err) {
    console.warn("[PortalUIService] Error fetching settings:", err);
    return DEFAULT_PORTAL_UI_SETTINGS;
  }
}

/**
 * Updates a specific portal's UI version in real-time.
 */
export async function updatePortalUIVersion(
  portal: PortalKey,
  version: PortalUIVersion,
  operator: { uid: string; name: string }
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable");

  const current = await getPortalUISettings();
  const fromVersion = current[portal] || "classic";

  const historyItem: PortalUIHistoryItem = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    portal,
    from: fromVersion,
    to: version,
    changedAt: new Date().toISOString(),
    changedByUid: operator.uid,
    changedByName: operator.name || "Super Admin",
  };

  const updatedHistory = [historyItem, ...(current.history || [])].slice(0, 50); // Keep last 50 entries

  const docRef = doc(db, SETTINGS_COLLECTION, PORTAL_UI_DOC);
  await setDoc(
    docRef,
    {
      ...current,
      [portal]: version,
      updatedAt: serverTimestamp(),
      updatedByUid: operator.uid,
      updatedByName: operator.name || "Super Admin",
      history: updatedHistory,
    },
    { merge: true }
  );
}

/**
 * Emergency Rollback: Instantly resets all 4 portals to Classic.
 */
export async function resetAllPortalsToClassic(
  operator: { uid: string; name: string }
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable");

  const current = await getPortalUISettings();

  const historyItem: PortalUIHistoryItem = {
    id: `${Date.now()}_emergency_reset`,
    portal: "superAdmin",
    from: current.superAdmin,
    to: "classic",
    changedAt: new Date().toISOString(),
    changedByUid: operator.uid,
    changedByName: operator.name || "Super Admin (Emergency Reset All)",
  };

  const updatedHistory = [historyItem, ...(current.history || [])].slice(0, 50);

  const docRef = doc(db, SETTINGS_COLLECTION, PORTAL_UI_DOC);
  await setDoc(
    docRef,
    {
      schoolAdmin: "classic",
      teacher: "classic",
      student: "classic",
      superAdmin: "classic",
      landingPage: "classic",
      updatedAt: serverTimestamp(),
      updatedByUid: operator.uid,
      updatedByName: operator.name || "Super Admin",
      history: updatedHistory,
    },
    { merge: true }
  );
}
