import { connectAuthEmulator, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const connected = new WeakSet<object>();

function enabled(projectId?: string): boolean {
  if (typeof process === "undefined" || process.env?.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "true") return false;
  if (!projectId?.startsWith("demo-")) {
    throw new Error("Emulator mode requires a demo- Firebase project ID.");
  }
  return true;
}

export function configureAuthEmulator(auth: Auth): Auth {
  if (enabled(auth?.app?.options?.projectId) && !connected.has(auth)) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connected.add(auth);
  }
  return auth;
}

export function configureFirestoreEmulator(db: Firestore): Firestore {
  if (enabled(db?.app?.options?.projectId) && !connected.has(db)) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connected.add(db);
  }
  return db;
}

export function configureStorageEmulator(storage: FirebaseStorage): FirebaseStorage {
  if (enabled(storage?.app?.options?.projectId) && !connected.has(storage)) {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connected.add(storage);
  }
  return storage;
}
