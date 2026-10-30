// Server-only — this file must NEVER be imported in client components
if (typeof window !== "undefined") {
  throw new Error("SECURITY VIOLATION: Firebase Admin SDK cannot be imported into client-side code.");
}

import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

export interface ServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface FirebaseAdminDiagnostics {
  configured: boolean;
  environmentScope: "development" | "preview" | "production";
  detectedSource: string;
  projectId: {
    authoritative: string;
    client: string;
    isConsistent: boolean;
  };
  variables: {
    hasClientEmail: boolean;
    hasPrivateKey: boolean;
    hasServiceAccountKey: boolean;
    hasProjectId: boolean;
    hasCredentialFile: boolean;
  };
  formatValidation: {
    isClientEmailValid: boolean;
    privateKeyFormat: "valid_pem" | "invalid_format" | "missing";
  };
  adminAppStatus: "initialized" | "not_initialized" | "failed";
  connectivity: "connected" | "untested" | "error";
  connectivityMessage?: string;
  clientEmailMasked: string | null;
  isEmulator: boolean;
  instructions: string;
}

let parsedServiceAccount: ServiceAccountCredentials | null | undefined = undefined;
let _adminApp: App | null = null;

export function resetAdminAppCache(): void {
  parsedServiceAccount = undefined;
  _adminApp = null;
}

export function cleanEnvString(val?: string | null): string {
  if (!val) return "";
  let v = val.trim().replace(/[;,]+$/, "").trim();
  // Strip wrapping single or double quotes
  while (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/[;,]+$/, "").trim();
}

/**
 * Normalizes a raw PEM private key string:
 * - Unwraps outer and escaped quotes
 * - Replaces escaped newlines (\\n, \r\n, \n)
 * - Auto-extracts from JSON if full service account was pasted into variable
 * - Decodes Base64 if needed
 * - Safely extracts standard PEM block
 * - Ensures valid trailing newline
 */
export function normalizePrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  let key = rawKey.trim();

  // If entire JSON was pasted into private key variable by mistake, extract private_key field
  if (key.startsWith("{") && key.includes("private_key")) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) {
        key = String(parsed.private_key).trim();
      }
    } catch {}
  }

  // Strip trailing semicolons or commas before stripping quotes
  key = key.replace(/[;,]+$/, "").trim();

  // Unescape escaped quotes from shell or JSON stringification
  key = key.replace(/\\"/g, '"').replace(/\\'/g, "'");

  // Strip wrapping single or double quotes
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Handle literal escaped newlines and carriage returns
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\\r/g, "\r");

  // Strip wrapping quotes again in case they were around escaped newlines
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Auto-detect and decode Base64-encoded private key if standard header is missing
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("BEGIN PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY")) {
        key = decoded
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\r\n/g, "\n")
          .trim();
      }
    } catch {}
  }

  // Extract the exact PEM block if there is extraneous prefix or suffix text
  const pemMatch = key.match(/(-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----)/);
  if (pemMatch && pemMatch[1]) {
    key = pemMatch[1].trim();
  }

  // Remove trailing semicolons or commas again
  key = key.replace(/[;,]+$/, "").trim();

  // Ensure trailing newline for OpenSSL PKCS8 compatibility
  if (key && !key.endsWith("\n")) {
    key += "\n";
  }

  return key;
}

/**
 * Validates if the normalized key adheres to standard RSA / PKCS8 PEM format
 */
export function isPrivateKeyFormatValid(key: string): boolean {
  if (!key) return false;
  const normalized = normalizePrivateKey(key);
  const hasBegin =
    normalized.includes("-----BEGIN PRIVATE KEY-----") ||
    normalized.includes("-----BEGIN RSA PRIVATE KEY-----");
  const hasEnd =
    normalized.includes("-----END PRIVATE KEY-----") ||
    normalized.includes("-----END RSA PRIVATE KEY-----");
  return Boolean(hasBegin && hasEnd && normalized.length > 100);
}

/**
 * Resolves Firebase Service Account credentials from server-only environment variables or credentials file.
 * Supports:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY / FIREBASE_SERVICE_ACCOUNT (JSON string or Base64 encoded JSON)
 *  2. FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 (Base64 string)
 *  3. Discrete variables: FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (+ optional FIREBASE_PROJECT_ID)
 *  4. File path: FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS
 * 
 * STRICT SECURITY: Never reads from any NEXT_PUBLIC_ variable for private credentials.
 */
export function getServiceAccount(): ServiceAccountCredentials | null {
  // Only use cached credential if it resolved successfully; do not permanently cache null
  if (parsedServiceAccount) return parsedServiceAccount;

  const authoritativeProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "school-study-c8991";

  // Enforce project ID consistency
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    console.warn(
      `[Firebase Admin] Notice: Server FIREBASE_PROJECT_ID (${process.env.FIREBASE_PROJECT_ID}) differs from NEXT_PUBLIC_FIREBASE_PROJECT_ID (${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}). Server operations will use ${process.env.FIREBASE_PROJECT_ID}.`
    );
  }

  // 1. Check consolidated JSON variables
  const rawKey =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
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
        const clientEmail = parsed.client_email.trim();
        const privateKey = normalizePrivateKey(parsed.private_key);

        if (clientEmail.includes("@") && isPrivateKeyFormatValid(privateKey)) {
          parsedServiceAccount = {
            projectId: parsed.project_id || authoritativeProjectId,
            clientEmail,
            privateKey,
          };
          return parsedServiceAccount;
        }
      }
    } catch (e) {
      console.warn("Notice: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable:", e);
    }
  }

  // 2. Check discrete variables (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)
  const clientEmail = cleanEnvString(
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  );

  const privateKeyRaw = cleanEnvString(
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  if (clientEmail && privateKeyRaw) {
    const cleanedKey = normalizePrivateKey(privateKeyRaw);

    if (clientEmail.includes("@") && isPrivateKeyFormatValid(cleanedKey)) {
      const explicitProjectId = cleanEnvString(process.env.FIREBASE_PROJECT_ID);
      parsedServiceAccount = {
        projectId: explicitProjectId || authoritativeProjectId,
        clientEmail,
        privateKey: cleanedKey,
      };
      return parsedServiceAccount;
    }
  }

  // 2b. Check runtime FIREBASE_CONFIG JSON if set by hosting platform
  const firebaseConfigStr = process.env.FIREBASE_CONFIG;
  if (firebaseConfigStr && firebaseConfigStr.trim().startsWith("{")) {
    try {
      const cfg = JSON.parse(firebaseConfigStr);
      if (cfg.client_email && cfg.private_key) {
        const clientEmail = cleanEnvString(cfg.client_email);
        const privateKey = normalizePrivateKey(cfg.private_key);
        if (clientEmail.includes("@") && isPrivateKeyFormatValid(privateKey)) {
          parsedServiceAccount = {
            projectId: cleanEnvString(cfg.project_id) || authoritativeProjectId,
            clientEmail,
            privateKey,
          };
          return parsedServiceAccount;
        }
      }
    } catch {}
  }

  // 3. Check file path (FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS)
  const filePath = cleanEnvString(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

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
          const clientEmail = cleanEnvString(parsed.client_email);
          const privateKey = normalizePrivateKey(parsed.private_key);
          if (clientEmail.includes("@") && isPrivateKeyFormatValid(privateKey)) {
            parsedServiceAccount = {
              projectId: cleanEnvString(parsed.project_id) || authoritativeProjectId,
              clientEmail,
              privateKey,
            };
            return parsedServiceAccount;
          }
        }
      }
    } catch (e) {
      console.warn("Notice: Could not read service account from file path:", e);
    }
  }

  return null;
}

/**
 * Checks whether Firebase Admin has valid server credentials configured.
 */
export function isFirebaseAdminConfigured(): boolean {
  return (
    getServiceAccount() !== null ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    Boolean(
      process.env.FIRESTORE_EMULATOR_HOST &&
        (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB)
    )
  );
}

/**
 * Retrieves or initializes the single Firebase Admin App instance for this process.
 * Safely handles serverless function reuse and prevents duplicate initialization.
 */
export function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  try {
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
          cleanEnvString(process.env.FIREBASE_PROJECT_ID) ||
          cleanEnvString(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
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

    // Strictly DO NOT initialize an unauthenticated app without credentials.
    // Return null so callers know Admin is not configured and getApps() is never poisoned.
    return null;
  } catch (e) {
    console.warn("Notice: Failed to initialize Firebase Admin App:", e);
    return null;
  }
}

/**
 * Retrieves the Firebase Admin Auth service if configured.
 */
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
    console.error("[Firebase Admin] Safe Admin Auth error:", e);
    return null;
  }
}

/**
 * Retrieves the Firebase Admin Firestore service if configured.
 */
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
    console.error("[Firebase Admin] Safe Admin DB error:", e);
    return null;
  }
}

/**
 * Diagnostic utility for reporting configuration health safely without exposing secrets.
 */
export async function getFirebaseAdminDiagnostics(probeConnectivity: boolean = false): Promise<FirebaseAdminDiagnostics> {
  const isConfigured = isFirebaseAdminConfigured();
  const serviceAccount = getServiceAccount();

  const clientEmail = serviceAccount?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
  const maskedEmail = clientEmail
    ? clientEmail.replace(/^(.)(.*)(@.*)$/, (_, first, mid, rest) => `${first}***${rest}`)
    : null;

  let detectedSource = "none";
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
    detectedSource = "FIREBASE_SERVICE_ACCOUNT_KEY";
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    detectedSource = "DISCRETE_VARS (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)";
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    detectedSource = "CREDENTIAL_FILE";
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    detectedSource = "EMULATOR";
  }

  const rawKey = serviceAccount?.privateKey || process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  let privateKeyFormat: "valid_pem" | "invalid_format" | "missing" = "missing";
  if (rawKey) {
    privateKeyFormat = isPrivateKeyFormatValid(rawKey) ? "valid_pem" : "invalid_format";
  }

  const serverProjectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.projectId || "school-study-c8991";
  const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991";
  const isConsistent = !process.env.FIREBASE_PROJECT_ID || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serverProjectId === clientProjectId;

  const envScope: "development" | "preview" | "production" =
    process.env.VERCEL_ENV === "production"
      ? "production"
      : process.env.VERCEL_ENV === "preview"
      ? "preview"
      : process.env.NODE_ENV === "production"
      ? "production"
      : "development";

  let adminAppStatus: "initialized" | "not_initialized" | "failed" = "not_initialized";
  if (isConfigured) {
    try {
      const app = getAdminApp();
      adminAppStatus = app ? "initialized" : "failed";
    } catch {
      adminAppStatus = "failed";
    }
  }

  let connectivity: "connected" | "untested" | "error" = "untested";
  let connectivityMessage: string | undefined = undefined;

  if (probeConnectivity && isConfigured) {
    try {
      const db = getSafeAdminDb();
      if (db) {
        const probePromise = db.collection("siteSettings").doc("system_health").get();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database probe timeout (3s)")), 3000)
        );
        await Promise.race([probePromise, timeoutPromise]);
        connectivity = "connected";
      }
    } catch (probeErr: any) {
      connectivity = "error";
      connectivityMessage = probeErr?.message || "Failed to reach Firestore service.";
    }
  }

  return {
    configured: isConfigured,
    environmentScope: envScope,
    detectedSource,
    projectId: {
      authoritative: serverProjectId,
      client: clientProjectId,
      isConsistent,
    },
    variables: {
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      hasServiceAccountKey: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64),
      hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
      hasCredentialFile: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    },
    formatValidation: {
      isClientEmailValid: Boolean(clientEmail && clientEmail.includes("@")),
      privateKeyFormat,
    },
    adminAppStatus,
    connectivity,
    ...(connectivityMessage ? { connectivityMessage } : {}),
    clientEmailMasked: maskedEmail,
    isEmulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST),
    instructions: !isConfigured
      ? envScope === "development"
        ? "To enable native Firebase Admin SDK features in local development, configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local"
        : "To enable native Firebase Admin SDK features on Vercel, configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel Project Settings > Environment Variables."
      : "Firebase Admin is successfully configured and active.",
  };
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
