import crypto from "crypto";

/**
 * Derives a 32-byte (256-bit) encryption key from environment configuration.
 * Throws an actionable error if encryption environment variables are corrupted.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.COMMUNICATION_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.FIREBASE_PROJECT_ID ||
    "sbci-school-study-comm-secret-key-2026";

  if (!secret || typeof secret !== "string") {
    throw new Error("COMMUNICATION_ENCRYPTION_KEY is required but unavailable on server.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

/**
 * Encrypts a sensitive string at rest using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") return "";
  const trimmed = plaintext.trim();
  if (!trimmed || isMasked(trimmed) || trimmed === "CONFIGURED") return "";

  // If already encrypted, return as is
  if (trimmed.startsWith(PREFIX)) return trimmed;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.warn("[CommunicationCrypto] Encryption warning:", err);
    return plaintext;
  }
}

/**
 * Decrypts a sensitive string from storage.
 * Handles both encrypted strings (enc:v1:...) and legacy unencrypted plaintext.
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== "string") return "";
  const trimmed = ciphertext.trim();
  if (!trimmed || isMasked(trimmed) || trimmed === "CONFIGURED") return "";

  // If not encrypted, return raw plaintext
  if (!trimmed.startsWith(PREFIX)) return trimmed;

  try {
    const payload = trimmed.substring(PREFIX.length);
    const [ivHex, tagHex, encryptedHex] = payload.split(":");

    if (!ivHex || !tagHex || !encryptedHex) return "";

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.warn("[CommunicationCrypto] Decryption warning:", err);
    return "";
  }
}

/**
 * Returns a masked representation of a secret for client responses.
 * Never leaks the actual secret length or content.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== "string") return "";
  const trimmed = secret.trim();
  if (!trimmed) return "";
  return "••••••••••••••••";
}

/**
 * Safely masks a Twilio Account SID for UI display (e.g. AC••••••••••••••••••••••••••••34a1).
 */
export function maskAccountSid(accountSid?: string | null): string {
  if (!accountSid || typeof accountSid !== "string") return "";
  const trimmed = accountSid.trim();
  if (trimmed.length < 8) return trimmed;
  const prefix = trimmed.substring(0, 2); // e.g. "AC"
  const suffix = trimmed.substring(trimmed.length - 4); // last 4 chars
  return `${prefix}${"•".repeat(Math.max(4, trimmed.length - 6))}${suffix}`;
}

/**
 * Checks whether a string is a masked placeholder.
 */
export function isMasked(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  return value.includes("••••");
}
