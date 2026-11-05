import { NextResponse } from "next/server";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  bucketPrefix?: string;
  graduatedResponse?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
  retryAfterSec: number;
  response?: NextResponse;
}

interface ClientRecord {
  timestamps: number[];
  blockedUntil?: number;
}

// In-memory bucket storage: BucketName -> Map<ClientKey, ClientRecord>
const bucketStorage = new Map<string, Map<string, ClientRecord>>();
const MAX_KEYS_PER_BUCKET = 5000;

function getBucket(bucketName: string): Map<string, ClientRecord> {
  let bucket = bucketStorage.get(bucketName);
  if (!bucket) {
    bucket = new Map<string, ClientRecord>();
    bucketStorage.set(bucketName, bucket);
  }
  return bucket;
}

/**
 * Resets all in-memory rate limit buckets (primarily for testing and cache clearing).
 */
export function resetRateLimits(): void {
  bucketStorage.clear();
}

/**
 * Extracts best-effort client IP from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

/**
 * Rate limit definitions across platform domains.
 */
export const RATE_LIMIT_PROFILES = {
  // Super Admin & Master PIN verification (Brute-force protection)
  SUPER_ADMIN_PIN: { maxRequests: 5, windowMs: 15 * 60 * 1000, bucketPrefix: "sa_pin" },
  // Student & Staff credential verification
  LOGIN_ATTEMPT: { maxRequests: 10, windowMs: 15 * 60 * 1000, bucketPrefix: "auth_login" },
  // Expensive student & finance exports (PDF, XLSX, CSV)
  DATA_EXPORT: { maxRequests: 12, windowMs: 60 * 1000, bucketPrefix: "export_op" },
  // Real-time search and filtering
  SEARCH_QUERY: { maxRequests: 90, windowMs: 60 * 1000, bucketPrefix: "search_op" },
  // Bulk database mutations (Bulk delete, bulk admit)
  BULK_MUTATION: { maxRequests: 15, windowMs: 60 * 1000, bucketPrefix: "bulk_mut" },
  // Timetable and cron triggers
  SCHEDULED_TASK: { maxRequests: 10, windowMs: 60 * 1000, bucketPrefix: "sched_task" },
  // General API protection
  STANDARD_API: { maxRequests: 120, windowMs: 60 * 1000, bucketPrefix: "std_api" },
} as const;

/**
 * Checks sliding-window rate limit for a client identifier in a specified bucket.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const bucketName = config.bucketPrefix || "default";
  const bucket = getBucket(bucketName);

  // LRU eviction if bucket grows beyond memory safety limit
  if (bucket.size > MAX_KEYS_PER_BUCKET) {
    const keysToDelete: string[] = [];
    for (const [k, rec] of bucket.entries()) {
      const active = rec.timestamps.filter((t) => now - t < config.windowMs);
      if (active.length === 0 && (!rec.blockedUntil || rec.blockedUntil < now)) {
        keysToDelete.push(k);
        if (keysToDelete.length > 500) break;
      }
    }
    for (const k of keysToDelete) bucket.delete(k);
  }

  let record = bucket.get(key);
  if (!record) {
    record = { timestamps: [] };
    bucket.set(key, record);
  }

  // Check temporary block
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetMs: record.blockedUntil - now,
      retryAfterSec,
      response: NextResponse.json(
        {
          success: false,
          error: "Too many requests. Temporary security lockout active. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < config.windowMs);

  // Exceeded threshold check
  if (record.timestamps.length >= config.maxRequests) {
    // If graduated response enabled, apply escalating block duration
    const retryAfterSec = Math.ceil(
      (config.windowMs - (now - record.timestamps[0])) / 1000
    );

    if (config.graduatedResponse) {
      record.blockedUntil = now + config.windowMs;
    }

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetMs: config.windowMs,
      retryAfterSec: Math.max(1, retryAfterSec),
      response: NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please slow down your requests.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  // Allow and append timestamp
  record.timestamps.push(now);
  const remaining = config.maxRequests - record.timestamps.length;
  const oldest = record.timestamps[0];
  const resetMs = config.windowMs - (now - oldest);

  return {
    allowed: true,
    remaining,
    limit: config.maxRequests,
    resetMs,
    retryAfterSec: 0,
  };
}

/**
 * Rate limit helper specifically designed for API route handlers.
 * Combines IP and optional authenticated UID/Tenant ID.
 */
export function enforceRateLimit(
  request: Request,
  config: RateLimitConfig,
  identifierExtra?: string
): RateLimitResult {
  const ip = getClientIp(request);
  const key = identifierExtra ? `${ip}:${identifierExtra}` : ip;
  return checkRateLimit(key, config);
}
