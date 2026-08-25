import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize Firebase when config is available (skips during build)
function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) {
    return null;
  }
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

const app = getFirebaseApp();

// Lazy getters that throw helpful errors if Firebase is not configured
function requireApp(): FirebaseApp {
  if (!app) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY in .env.local"
    );
  }
  return app;
}

// These will be null during build but available at runtime
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

export function getFirebaseAuth(): Auth {
  return getAuth(requireApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(requireApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(requireApp());
}

export default app;
