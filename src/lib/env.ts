/**
 * Centralized Environment Variable Validation and Configuration
 * 
 * Client variables (NEXT_PUBLIC_*) are exposed to the browser.
 * Server variables (FIREBASE_*) must NEVER have the NEXT_PUBLIC_ prefix.
 */

export interface FirebaseClientEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getClientFirebaseConfig(): FirebaseClientEnvConfig {
  const config: FirebaseClientEnvConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  return config;
}

/**
 * Validates that all required client-side Firebase environment variables exist.
 * Throws a clean developer-facing error without leaking values.
 */
export function validateClientEnv(): { isValid: boolean; missing: string[] } {
  const required: Array<keyof FirebaseClientEnvConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  const config = getClientFirebaseConfig();
  const missing: string[] = [];

  for (const key of required) {
    if (!config[key]) {
      const envKey = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
      missing.push(envKey);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}
