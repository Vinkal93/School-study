import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-only — this file must NEVER be imported in client components
let parsedServiceAccount: any = undefined;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    parsedServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    console.warn("Notice: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
  }
}

let _adminApp: any = null;
function getAdminApp() {
  if (_adminApp) return _adminApp;
  const apps = getApps();
  if (apps.length > 0) {
    _adminApp = apps[0];
    return _adminApp;
  }
  try {
    _adminApp = initializeApp(
      parsedServiceAccount
        ? { credential: cert(parsedServiceAccount) }
        : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991" }
    );
    return _adminApp;
  } catch (e) {
    console.warn("Notice: Failed to initialize Firebase Admin App:", e);
    return null;
  }
}

export const adminApp = getAdminApp();

export function getSafeAdminAuth() {
  if (!parsedServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  try {
    const app = getAdminApp();
    return app ? getAuth(app) : null;
  } catch (e) {
    return null;
  }
}

export function getSafeAdminDb() {
  if (!parsedServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  try {
    const app = getAdminApp();
    return app ? getFirestore(app) : null;
  } catch (e) {
    return null;
  }
}

export const adminAuth = getSafeAdminAuth();
export const adminDb = getSafeAdminDb();
