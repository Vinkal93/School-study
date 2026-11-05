import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseClientConfig } from "./config";
import { configureAuthEmulator, configureFirestoreEmulator, configureStorageEmulator } from "./emulators";

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let guardsInitialized = false;

/**
 * Enterprise Storage Resilience & Crash Barrier
 * 1. Purges orphaned firestore_ and ss_fast_ keys from window.localStorage to recover browser quota.
 * 2. Wraps window.localStorage.setItem to safely intercept any QuotaExceededError.
 * 3. Intercepts unhandled QuotaExceededError rejections to prevent Next.js Fast Refresh from entering a reload loop.
 */
export function purgeCloggedFirestoreStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith("firestore_") ||
          k.startsWith("ss_fast_") ||
          k.includes("school-study-c8991"))
      ) {
        keysToRemove.push(k);
      }
    }
    for (const key of keysToRemove) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  } catch {}
}

export function initClientStorageGuards(): void {
  if (guardsInitialized || typeof window === "undefined") return;
  guardsInitialized = true;

  try {
    // Purge any clogged legacy firestore keys from localStorage immediately
    purgeCloggedFirestoreStorage();

    // 1. Transparent LocalStorage Quota Guard
    if (typeof window.localStorage !== "undefined") {
      const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

      window.localStorage.setItem = function (key: string, value: string): void {
        try {
          originalSetItem(key, value);
        } catch (err: any) {
          const isQuota =
            err?.name === "QuotaExceededError" ||
            err?.code === 22 ||
            err?.code === 1014 ||
            err?.number === -2147024882;

          if (isQuota) {
            // Aggressively prune non-essential fast-cache blobs to create headroom
            try {
              purgeCloggedFirestoreStorage();
              originalSetItem(key, value);
              return;
            } catch {
              // If still exceeding quota, suppress firestore keys to prevent assertion crashes
              if (
                key.startsWith("firestore_") ||
                key.includes("school-study-") ||
                key.includes("mutations")
              ) {
                console.warn(
                  `[Firebase Client] LocalStorage quota reached. Suppressed key "${key}" to prevent crash.`
                );
                return;
              }
            }
          }
          throw err;
        }
      };
    }

    // 2. Global Unhandled Rejection Crash Barrier
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const msg = String(reason?.message || reason || "");
      const name = String(reason?.name || "");

      if (
        name === "QuotaExceededError" ||
        msg.includes("exceeded the quota") ||
        msg.includes("firestore_mutations_") ||
        msg.includes("Failed to persist write") ||
        msg.includes("INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)")
      ) {
        event.preventDefault();
        console.warn(
          "[Firebase Client] Protected against QuotaExceededError from triggering Fast Refresh reload loop:",
          msg
        );
      }
    });
  } catch (initErr) {
    console.warn("[Firebase Client] Storage guard initialization notice:", initErr);
  }
}

// Proactively run guards and storage purge in browser environments
if (typeof window !== "undefined") {
  initClientStorageGuards();
}

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseClientConfig);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = configureAuthEmulator(getAuth(getFirebaseApp()));
    if (typeof window !== "undefined") {
      const isIframe = window.self !== window.top || window.location.search.includes("preview=true");
      if (isIframe) {
        setPersistence(authInstance, inMemoryPersistence).catch(() => {});
      } else {
        setPersistence(authInstance, browserLocalPersistence).catch(() => {});
      }
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    if (typeof window !== "undefined") {
      initClientStorageGuards();

      try {
        // Resilient memory cache with auto-detect long polling
        // Completely eliminates LocalStorage 5MB quota exhaustion, assertion b815 failures,
        // and multi-tab mutation serialization crashes across all browsers & InPrivate sessions.
        dbInstance = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          experimentalAutoDetectLongPolling: true,
          localCache: memoryLocalCache(),
        });
      } catch {
        dbInstance = getFirestore(app);
      }
    } else {
      try {
        dbInstance = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
        });
      } catch {
        dbInstance = getFirestore(app);
      }
    }
  }
  return configureFirestoreEmulator(dbInstance);
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = configureStorageEmulator(getStorage(getFirebaseApp()));
  }
  return storageInstance;
}

// Resilient Lazy Proxies: Prevents module evaluation crashes during Next.js static build worker analysis
export const auth: Auth = new Proxy({} as Auth, {
  get: (_, prop) => {
    const inst = getFirebaseAuth();
    const val = (inst as any)[prop];
    return typeof val === "function" ? val.bind(inst) : val;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get: (_, prop) => {
    const inst = getFirebaseDb();
    const val = (inst as any)[prop];
    return typeof val === "function" ? val.bind(inst) : val;
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get: (_, prop) => {
    const inst = getFirebaseStorage();
    const val = (inst as any)[prop];
    return typeof val === "function" ? val.bind(inst) : val;
  },
});

export default getFirebaseApp;
