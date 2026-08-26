import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseClientConfig } from "./config";

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      const config = {
        apiKey:
          firebaseClientConfig.apiKey ||
          "AIzaSyAXjKi7fCJrjT6NERRM4OaKIAyT8jRFqAw",
        authDomain:
          firebaseClientConfig.authDomain ||
          "school-study-c8991.firebaseapp.com",
        projectId:
          firebaseClientConfig.projectId ||
          "school-study-c8991",
        storageBucket:
          firebaseClientConfig.storageBucket ||
          "school-study-c8991.firebasestorage.app",
        messagingSenderId:
          firebaseClientConfig.messagingSenderId ||
          "108412631999",
        appId:
          firebaseClientConfig.appId ||
          "1:108412631999:web:9c8af9689a884d29b4ff0a",
      };
      appInstance = initializeApp(config);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
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
