import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
 * 1. Wraps window.localStorage.setItem to safely intercept QuotaExceededError during Firestore multi-tab sync.
 * 2. Catches unhandled QuotaExceededError rejections to prevent Next.js Fast Refresh from entering an infinite reload loop.
 * 3. Proactively clears stale fast caches if storage quota is constrained.
 */
export function initClientStorageGuards(): void {
  if (guardsInitialized || typeof window === "undefined") return;
  guardsInitialized = true;

  try {
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
              const keysToEvict: string[] = [];
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && (k.startsWith("ss_fast_") || k.startsWith("firestore_zombied_"))) {
                  keysToEvict.push(k);
                }
              }
              keysToEvict.forEach((k) => {
                try {
                  window.localStorage.removeItem(k);
                } catch {}
              });

              // Retry the write once space has been cleared
              originalSetItem(key, value);
              return;
            } catch {
              // If still exceeding quota, protect Firestore AsyncQueue from unhandled fatal crash
              if (
                key.startsWith("firestore_") ||
                key.includes("school-study-") ||
                key.includes("mutations")
              ) {
                console.warn(
                  `[Firebase Client] LocalStorage quota reached. Suppressed key "${key}" to avoid AsyncQueue crash.`
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
    // In Next.js dev mode, unhandled promise rejections trigger Fast Refresh rebuilds & reloads.
    // Intercepting QuotaExceededError here stops the infinite reload loop completely.
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const msg = String(reason?.message || reason || "");
      const name = String(reason?.name || "");

      if (
        name === "QuotaExceededError" ||
        msg.includes("exceeded the quota") ||
        msg.includes("firestore_mutations_") ||
        msg.includes("Failed to persist write")
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

// Proactively run guards in client environments
if (typeof window !== "undefined") {
  initClientStorageGuards();
}

/**
 * Validates that window.localStorage has at least 32KB of write headroom.
 * If this fails (e.g. in Edge/Chrome InPrivate mode with restricted quota),
 * Firestore will initialize in memoryLocalCache mode to guarantee zero reload loops.
 */
function isLocalStorageHealthyForMultiTab(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const probeKey = "__ss_storage_quota_probe__";
    const probePayload = "Q".repeat(32768);
    window.localStorage.setItem(probeKey, probePayload);
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    // Attempt cache cleanup and retry probe
    try {
      const keysToEvict: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("ss_fast_")) {
          keysToEvict.push(k);
        }
      }
      keysToEvict.forEach((k) => {
        try {
          window.localStorage.removeItem(k);
        } catch {}
      });

      const probeKey = "__ss_storage_quota_probe__";
      window.localStorage.setItem(probeKey, "OK");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch {
      return false;
    }
  }
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

      const canUsePersistentCache = isLocalStorageHealthyForMultiTab();

      if (canUsePersistentCache) {
        try {
          // High-speed persistent local cache with multi-tab coordination and long polling
          dbInstance = initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            experimentalForceLongPolling: true,
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch (cacheErr) {
          try {
            // Fallback to memory cache if persistent initialization fails
            dbInstance = initializeFirestore(app, {
              ignoreUndefinedProperties: true,
              experimentalAutoDetectLongPolling: true,
              localCache: memoryLocalCache(),
            });
          } catch {
            dbInstance = getFirestore(app);
          }
        }
      } else {
        // Safe memory cache: avoids writing mutations to localStorage in InPrivate mode or quota-constrained sessions
        try {
          dbInstance = initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            experimentalAutoDetectLongPolling: true,
            localCache: memoryLocalCache(),
          });
        } catch {
          dbInstance = getFirestore(app);
        }
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
