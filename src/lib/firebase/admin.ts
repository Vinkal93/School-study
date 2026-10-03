// Server-only — this file must NEVER be imported in client components
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

let parsedServiceAccount: any = undefined;
function getServiceAccount() {
  if (parsedServiceAccount !== undefined) return parsedServiceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      parsedServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.warn("Notice: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
      parsedServiceAccount = null;
    }
  } else {
    parsedServiceAccount = null;
  }
  return parsedServiceAccount;
}

let _adminApp: App | null = null;
export function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  try {
    // Dynamic require prevents top-level module evaluation crashes in Vercel serverless functions
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const apps = getApps();
    if (apps.length > 0) {
      _adminApp = apps[0];
      return _adminApp;
    }
    const serviceAccount = getServiceAccount();
    _adminApp = initializeApp(
      serviceAccount
        ? { credential: cert(serviceAccount) }
        : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991" }
    );
    return _adminApp;
  } catch (e) {
    console.warn("Notice: Failed to initialize Firebase Admin App:", e);
    return null;
  }
}

export function getSafeAdminAuth(): Auth | null {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  try {
    const app = getAdminApp();
    if (!app) return null;
    const { getAuth } = require("firebase-admin/auth");
    return getAuth(app);
  } catch (e) {
    return null;
  }
}

export function getSafeAdminDb(): Firestore | null {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  try {
    const app = getAdminApp();
    if (!app) return null;
    const { getFirestore } = require("firebase-admin/firestore");
    return getFirestore(app);
  } catch (e) {
    return null;
  }
}

// Resilient Lazy Proxies: Prevents module evaluation crashes during Next.js static build / serverless analysis
export const adminApp: App = new Proxy({} as any, {
  get: (_, prop) => {
    const app = getAdminApp();
    return app ? (app as any)[prop] : undefined;
  },
});

export const adminAuth: Auth = new Proxy({} as any, {
  get: (_, prop) => {
    const auth = getSafeAdminAuth();
    if (!auth) return undefined;
    const val = (auth as any)[prop];
    return typeof val === "function" ? val.bind(auth) : val;
  },
});

export const adminDb: Firestore = new Proxy({} as any, {
  get: (_, prop) => {
    const db = getSafeAdminDb();
    if (!db) return undefined;
    const val = (db as any)[prop];
    return typeof val === "function" ? val.bind(db) : val;
  },
});
