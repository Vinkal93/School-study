import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseClientConfig } from "./config";

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  // Ensure apiKey is never empty during server-side build prerendering
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

  return initializeApp(config);
}

const app: FirebaseApp = getFirebaseApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export function getFirebaseAuth(): Auth {
  return getAuth(app);
}

export function getFirebaseDb(): Firestore {
  return getFirestore(app);
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(app);
}

export default app;
