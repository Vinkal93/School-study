/**
 * Request Context & Correlation ID Tracker
 * Links browser actions, API requests, and server operations across distributed workflows
 */

import { ClientMetadata } from "./error-types";

export function generateCorrelationId(prefix = "corr"): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

export function generateRequestId(): string {
  return generateCorrelationId("req");
}

/**
 * Extracts sanitized ClientMetadata from standard HTTP Request headers
 */
export function extractClientMetadata(request: Request): ClientMetadata {
  const ua = request.headers.get("user-agent") || "";
  let browser = "Unknown";
  let os = "Unknown";
  let device: ClientMetadata["device"] = "desktop";

  // Light, efficient UA detection without external dependencies
  if (/mobile/i.test(ua)) device = "mobile";
  else if (/tablet|ipad/i.test(ua)) device = "tablet";

  if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/edg/i.test(ua)) browser = "Edge";

  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return {
    browser,
    os,
    device,
    userAgent: ua.slice(0, 200),
    url: request.url ? new URL(request.url).pathname : undefined,
  };
}

/**
 * Extracts correlation and request IDs from request headers with safe fallbacks
 */
export function extractRequestContext(request: Request): {
  correlationId: string;
  requestId: string;
  clientIp: string;
} {
  const correlationId =
    request.headers.get("x-correlation-id") || generateCorrelationId();
  const requestId =
    request.headers.get("x-request-id") || generateRequestId();

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown-ip";

  return { correlationId, requestId, clientIp };
}
