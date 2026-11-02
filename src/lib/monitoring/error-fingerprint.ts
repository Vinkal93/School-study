/**
 * Deterministic Error Fingerprinting Engine
 * Groups repeated failures into single incidents without volatile ID collisions
 */

import { createHash } from "crypto";

export interface FingerprintComponents {
  errorCode: string;
  module: string;
  operation: string;
  message?: string;
  stack?: string;
}

/**
 * Extracts a normalized, stable signature from the top stack frame.
 * Strips dynamic line and column numbers so recompilation doesn't fragment incidents.
 */
function extractStackSignature(stack?: string): string {
  if (!stack) return "no_stack";

  const lines = stack.split("\n");
  // Find first application line (skip generic Error: line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("at ") && !line.includes("error-capture")) {
      // Strip line and column numbers (:123:45 or :123)
      return line.replace(/:\d+(?::\d+)?\)?$/g, "").replace(/\s+/g, "_");
    }
  }

  return "app_root";
}

/**
 * Generates a stable, deterministic 16-character SHA-256 fingerprint.
 */
export function generateErrorFingerprint(components: FingerprintComponents): string {
  const normCode = (components.errorCode || "GENERIC_ERROR").toUpperCase().trim();
  const normModule = (components.module || "general").toLowerCase().trim();
  const normOp = (components.operation || "unknown").toLowerCase().trim();
  const stackSig = extractStackSignature(components.stack);

  // Exclude user IDs, school IDs, timestamps, and dynamic values
  const payload = `${normCode}|${normModule}|${normOp}|${stackSig}`;

  return "fp_" + createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Generates a clean human-readable incident title.
 * e.g. "[registration] createSchoolWithAdmin: ADMIN_AUTH_NOT_CONFIGURED"
 */
export function generateIncidentTitle(components: FingerprintComponents): string {
  const mod = components.module || "General";
  const op = components.operation || "execute";
  const code = components.errorCode || "ERROR";

  return `[${mod}] ${op}: ${code}`;
}
