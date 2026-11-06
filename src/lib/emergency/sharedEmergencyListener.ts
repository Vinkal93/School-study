/**
 * School Study — Zero-Waste Shared Emergency & Security Subscription Multiplexer
 * Deduplicates multiple concurrent onSnapshot listeners to siteSettings/emergency_controls
 * and schoolEmergency/{schoolId} down to a single reference-counted Firestore listener.
 */

import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { GlobalEmergencyControls, SchoolEmergencyControl } from "./emergencyEngine";

// 1. Shared Global Emergency Controls Listener
type GlobalCallback = (data: GlobalEmergencyControls | null) => void;
const globalSubscribers = new Set<GlobalCallback>();
let globalUnsub: Unsubscribe | null = null;
let lastGlobalData: GlobalEmergencyControls | null = null;

export function subscribeSharedGlobalEmergency(callback: GlobalCallback): () => void {
  globalSubscribers.add(callback);

  // Replay last cached data immediately for instant paint
  if (lastGlobalData) {
    callback(lastGlobalData);
  }

  if (globalSubscribers.size === 1 && !globalUnsub) {
    try {
      const db = getFirebaseDb();
      if (db) {
        globalUnsub = onSnapshot(
          doc(db, "siteSettings", "emergency_controls"),
          (snap) => {
            if (snap.exists()) {
              lastGlobalData = snap.data() as GlobalEmergencyControls;
            } else {
              lastGlobalData = null;
            }
            globalSubscribers.forEach((cb) => {
              try {
                cb(lastGlobalData);
              } catch {}
            });
          },
          (err) => {
            if (err.code !== "permission-denied" && err.code !== "resource-exhausted") {
              console.warn("Shared global emergency listener notice:", err);
            }
          }
        );
      }
    } catch (e) {
      console.warn("Could not attach shared global emergency listener:", e);
    }
  }

  return () => {
    globalSubscribers.delete(callback);
    if (globalSubscribers.size === 0 && globalUnsub) {
      try {
        globalUnsub();
      } catch {}
      globalUnsub = null;
    }
  };
}

// 2. Shared School Emergency Controls Listener (keyed by schoolId)
type SchoolCallback = (data: SchoolEmergencyControl | null) => void;
interface SchoolListenerGroup {
  subscribers: Set<SchoolCallback>;
  unsub: Unsubscribe | null;
  lastData: SchoolEmergencyControl | null;
}
const schoolGroups = new Map<string, SchoolListenerGroup>();

export function subscribeSharedSchoolEmergency(
  schoolId: string,
  callback: SchoolCallback
): () => void {
  if (!schoolId || schoolId === "system" || schoolId === "school_default") {
    callback(null);
    return () => {};
  }

  let group = schoolGroups.get(schoolId);
  if (!group) {
    group = {
      subscribers: new Set(),
      unsub: null,
      lastData: null,
    };
    schoolGroups.set(schoolId, group);
  }

  group.subscribers.add(callback);

  if (group.lastData) {
    callback(group.lastData);
  }

  if (group.subscribers.size === 1 && !group.unsub) {
    try {
      const db = getFirebaseDb();
      if (db) {
        group.unsub = onSnapshot(
          doc(db, "schoolEmergency", schoolId),
          (snap) => {
            const currentGroup = schoolGroups.get(schoolId);
            if (!currentGroup) return;
            if (snap.exists()) {
              currentGroup.lastData = snap.data() as SchoolEmergencyControl;
            } else {
              currentGroup.lastData = null;
            }
            currentGroup.subscribers.forEach((cb) => {
              try {
                cb(currentGroup.lastData);
              } catch {}
            });
          },
          (err) => {
            if (err.code !== "permission-denied" && err.code !== "resource-exhausted") {
              console.warn(`Shared school emergency listener notice [${schoolId}]:`, err);
            }
          }
        );
      }
    } catch (e) {
      console.warn("Could not attach shared school emergency listener:", e);
    }
  }

  return () => {
    const currentGroup = schoolGroups.get(schoolId);
    if (!currentGroup) return;
    currentGroup.subscribers.delete(callback);
    if (currentGroup.subscribers.size === 0) {
      if (currentGroup.unsub) {
        try {
          currentGroup.unsub();
        } catch {}
      }
      schoolGroups.delete(schoolId);
    }
  };
}
