import { timingSafeEqual, createHmac } from "node:crypto";

/**
 * Constant-time string comparison to protect against timing attacks.
 * Uses SHA-256 HMAC over both strings with a random or static ephemeral key
 * so that both buffers are guaranteed to be 32 bytes, eliminating length leakage.
 */
export function timingSafeEqualString(a?: string | null, b?: string | null): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const key = "timing-safe-comparison-key";
  const hmacA = createHmac("sha256", key).update(a).digest();
  const hmacB = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}
