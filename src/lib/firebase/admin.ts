// Server-only — this file must NEVER be imported in client components
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

export interface ServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let parsedServiceAccount: ServiceAccountCredentials | null | undefined = undefined;

export function resetAdminAppCache(): void {
  parsedServiceAccount = undefined;
  _adminApp = null;
}

/**
 * Normalizes a raw PEM private key string:
 * - Unwraps quotes
 * - Replaces escaped newlines (\\n, \r\n, \n)
 * - Decodes Base64 if needed
 */
export function normalizePrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  let key = rawKey.trim();

  // Strip wrapping single or double quotes
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Handle literal escaped newlines and carriage returns
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  // Auto-detect and decode Base64-encoded private key if standard header is missing
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("BEGIN PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY")) {
        key = decoded.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
      }
    } catch {}
  }

  return key;
}

/**
 * Resolves Firebase Service Account credentials from environment variables or credentials file.
 * Supports:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or Base64 encoded JSON)
 *  2. FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 (Base64 string)
 *  3. Discrete variables: FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (+ optional FIREBASE_PROJECT_ID)
 *  4. File path: FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS
 */
export function getServiceAccount(): ServiceAccountCredentials | null {
  // Only use cached credential if it resolved successfully; do not permanently cache null
  if (parsedServiceAccount) return parsedServiceAccount;

  const defaultProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "school-study-c8991";

  // 1. Check FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
  const rawKey =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  if (rawKey && rawKey.trim()) {
    try {
      let jsonString = rawKey.trim();
      // Auto-detect Base64 string if not starting with JSON braces
      if (!jsonString.startsWith("{") && !jsonString.startsWith("[")) {
        try {
          jsonString = Buffer.from(jsonString, "base64").toString("utf-8");
        } catch {}
      }
      const parsed = JSON.parse(jsonString);
      if (parsed.client_email && parsed.private_key) {
        parsedServiceAccount = {
          projectId: parsed.project_id || defaultProjectId,
          clientEmail: parsed.client_email.trim(),
          privateKey: normalizePrivateKey(parsed.private_key),
        };
        return parsedServiceAccount;
      }
    } catch (e) {
      console.warn("Notice: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable:", e);
    }
  }

  // 2. Check discrete variables (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    const cleanedKey = normalizePrivateKey(privateKey);

    parsedServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || defaultProjectId,
      clientEmail: clientEmail.trim(),
      privateKey: cleanedKey,
    };
    return parsedServiceAccount;
  }

  // 2b. Check runtime FIREBASE_CONFIG JSON if set by hosting platform
  const firebaseConfigStr = process.env.FIREBASE_CONFIG;
  if (firebaseConfigStr && firebaseConfigStr.trim().startsWith("{")) {
    try {
      const cfg = JSON.parse(firebaseConfigStr);
      if (cfg.client_email && cfg.private_key) {
        parsedServiceAccount = {
          projectId: cfg.project_id || defaultProjectId,
          clientEmail: cfg.client_email.trim(),
          privateKey: normalizePrivateKey(cfg.private_key),
        };
        return parsedServiceAccount;
      }
    } catch {}
  }

  // 3. Check file path (FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS)
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (filePath && typeof window === "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath);

      if (fs.existsSync(resolved)) {
        const fileContent = fs.readFileSync(resolved, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed.client_email && parsed.private_key) {
          parsedServiceAccount = {
            projectId: parsed.project_id || defaultProjectId,
            clientEmail: parsed.client_email.trim(),
            privateKey: normalizePrivateKey(parsed.private_key),
          };
          return parsedServiceAccount;
        }
      }
    } catch (e) {
      console.warn("Notice: Could not read service account from file path:", e);
    }
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return (
    getServiceAccount() !== null ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB))
  );
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

    // Emulator support without credentials
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      _adminApp = initializeApp({
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          "school-study-c8991",
      });
      return _adminApp;
    }

    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      _adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
      return _adminApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      _adminApp = initializeApp();
      return _adminApp;
    }

    // Default initialization (fallback for GCP cloud run / app engine ADC or emulator)
    _adminApp = initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "school-study-c8991",
    });
    return _adminApp;
  } catch (e) {
    console.warn("Notice: Failed to initialize Firebase Admin App:", e);
    return null;
  }
}

export function getSafeAdminAuth(): Auth | null {
  if (!isFirebaseAdminConfigured()) {
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
  if (!isFirebaseAdminConfigured()) {
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
