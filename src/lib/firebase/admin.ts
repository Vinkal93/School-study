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

export const adminApp = !getApps().length
  ? initializeApp(
      parsedServiceAccount
        ? { credential: cert(parsedServiceAccount) }
        : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991" }
    )
  : getApps()[0];

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
