/**
 * Enterprise Error Sanitizer & Data Redaction Engine
 * Strict PII/Secret Protection: Redacts passwords, API secrets, tokens, private keys, and file paths
 */

// Keys matching these patterns are unconditionally scrubbed from payloads
const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /bearer/i,
  /cookie/i,
  /key/i,
  /private/i,
  /credential/i,
  /card/i,
  /cvv/i,
  /pan/i,
  /aadhaar/i,
  /ssn/i,
  /session/i,
  /pin/i,
];

// Patterns for strings within values that look like secrets or tokens
const SENSITIVE_STRING_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    // Firebase / Google PEM Private Keys
    pattern: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    // Bearer / JWT Tokens (Header.Payload.Signature or general token)
    pattern: /Bearer\s+[A-Za-z0-9-_.]+/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
  },
  {
    // Password / Secret in query or key-value format (password=... or secret=...)
    pattern: /(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*[^\s,;&]+/gi,
    replacement: "[REDACTED_SECRET]",
  },
  {
    // Google API Keys
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    replacement: "AIza[REDACTED_API_KEY]",
  },
  {
    // Emails
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    // Standard credit card numbers (13-16 digits with spaces or hyphens)
    pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replacement: "[REDACTED_CARD]",
  },
  {
    // Phone numbers (+91 91182 45636 or 10 digits)
    pattern: /(?:\+?\d{1,3}[ -]?)?\b\d{5}[ -]?\d{5}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
  {
    // Razorpay Secret patterns (rzp_live / rzp_test)
    pattern: /rzp_(live|test)_[A-Za-z0-9]{14,}/g,
    replacement: "rzp_[REDACTED_SECRET]",
  },
];

/**
 * Generate a friendly, copyable reference code for users and incident logs.
 * Example: "ERR-B4D7E2F1"
 */
export function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ERR-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Recursively scrubs objects and arrays of any sensitive keys or values.
 */
export function sanitizeMetadata(data: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED_DEPTH]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let sanitized = data;
    for (const { pattern, replacement } of SENSITIVE_STRING_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 50).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof data === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      // If key name matches sensitive patterns, redact value completely
      if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(k))) {
        cleanObj[k] = "[REDACTED]";
        continue;
      }
      cleanObj[k] = sanitizeMetadata(v, depth + 1);
    }
    return cleanObj;
  }

  return String(data);
}

/**
 * Sanitizes stack traces:
 * - Removes local Windows / Unix path prefixes (e.g. C:\Users\..., D:\Coding\...)
 * - Removes query strings from URLs in stack frames
 * - Truncates excessively deep traces (> 20 frames)
 */
export function sanitizeStackTrace(stack?: string): string | undefined {
  if (!stack) return undefined;

  let cleaned = stack;

  // Redact local machine user paths (Windows: D:\Coding\..., C:\Users\..., Unix: /home/...)
  cleaned = cleaned.replace(/[A-Z]:\\[^:\n\r\t]+[\\/](src|node_modules)[\\/]/gi, "[app]/$1/");
  cleaned = cleaned.replace(/\/(?:home|Users)\/[^/]+[^:\n\r\t]*\/(src|node_modules)\//gi, "[task]/$1/");
  cleaned = cleaned.replace(/\/var\/task\//gi, "[task]/");

  // Remove potential query strings or tokens embedded in stack trace URLs
  cleaned = cleaned.replace(/(\?|&)[a-zA-Z0-9_]+=[^:\s)]+/g, "");

  // Limit to 20 frames
  const lines = cleaned.split("\n");
  if (lines.length > 25) {
    return lines.slice(0, 20).join("\n") + "\n    ... [truncated remainder of stack trace]";
  }

  return cleaned.trim();
}

/**
 * Strips raw database connection strings, passwords, or IP details from error messages.
 */
export function sanitizeErrorMessage(message?: string): string {
  if (!message) return "Unknown system exception";

  let clean = message.trim();
  for (const { pattern, replacement } of SENSITIVE_STRING_PATTERNS) {
    clean = clean.replace(pattern, replacement);
  }

  // Remove database URLs like mongodb://user:pass@host or postgres://...
  clean = clean.replace(/([a-z]+):\/\/[^:]+:[^@]+@/gi, "$1://[REDACTED_CREDENTIALS]@");

  return clean.slice(0, 500);
}
