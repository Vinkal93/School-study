import { getClientFirebaseConfig, type FirebaseClientEnvConfig } from "@/lib/env";

/**
 * Public Firebase Web SDK configuration.
 * Consumed by client.ts and secondary auth instances.
 */
export const firebaseClientConfig: FirebaseClientEnvConfig = getClientFirebaseConfig();
