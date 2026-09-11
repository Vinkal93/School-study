import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { ExperienceSettings, DEFAULT_EXPERIENCE_SETTINGS } from "@/types/experienceControl";

let cachedSettings: ExperienceSettings | null = null;

export async function getExperienceSettings(): Promise<ExperienceSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    const db = getFirebaseDb();
    if (db) {
      const snap = await getDoc(doc(db, "siteSettings", "experience_controls"));
      if (snap.exists()) {
        cachedSettings = {
          ...DEFAULT_EXPERIENCE_SETTINGS,
          ...(snap.data() as Partial<ExperienceSettings>),
        };
        return cachedSettings;
      }
    }
  } catch (err) {
    console.warn("Notice: Fetching experience settings fallback:", err);
  }

  return DEFAULT_EXPERIENCE_SETTINGS;
}

export async function saveExperienceSettings(
  settings: Partial<ExperienceSettings>,
  actorId: string = "super_admin"
): Promise<ExperienceSettings> {
  const merged: ExperienceSettings = {
    ...DEFAULT_EXPERIENCE_SETTINGS,
    ...(cachedSettings || {}),
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };

  cachedSettings = merged;

  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, "siteSettings", "experience_controls"), merged, { merge: true });
    }
  } catch (err) {
    console.warn("Notice: Saving experience settings client notice:", err);
  }

  return merged;
}

export function subscribeToExperienceSettings(
  callback: (settings: ExperienceSettings) => void
): () => void {
  try {
    const db = getFirebaseDb();
    if (!db) {
      callback(DEFAULT_EXPERIENCE_SETTINGS);
      return () => {};
    }

    const unsub = onSnapshot(
      doc(db, "siteSettings", "experience_controls"),
      (snap) => {
        if (snap.exists()) {
          const data = {
            ...DEFAULT_EXPERIENCE_SETTINGS,
            ...(snap.data() as Partial<ExperienceSettings>),
          };
          cachedSettings = data;
          callback(data);
        } else {
          callback(DEFAULT_EXPERIENCE_SETTINGS);
        }
      },
      (error) => {
        console.warn("Experience settings snapshot notice:", error);
        callback(DEFAULT_EXPERIENCE_SETTINGS);
      }
    );

    return unsub;
  } catch (e) {
    callback(DEFAULT_EXPERIENCE_SETTINGS);
    return () => {};
  }
}
