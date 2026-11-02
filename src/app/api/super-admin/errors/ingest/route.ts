import { NextResponse } from "next/server";
import { captureClientError } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limiting map for client error ingestion
const clientIngestRateMap = new Map<string, number[]>();
const INGEST_WINDOW_MS = 60 * 1000;
const MAX_INGEST_PER_MINUTE = 40;

function checkIngestRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = clientIngestRateMap.get(ip) || [];
  const valid = timestamps.filter((t) => now - t < INGEST_WINDOW_MS);
  if (valid.length >= MAX_INGEST_PER_MINUTE) {
    clientIngestRateMap.set(ip, valid);
    return false;
  }
  valid.push(now);
  clientIngestRateMap.set(ip, valid);
  return true;
}

/**
 * POST /api/super-admin/errors/ingest
 * Rate-limited endpoint for client browsers to safely report frontend crashes.
 */
export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown-ip";

  if (!checkIngestRateLimit(clientIp)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { success: false, error: "Error message is required." },
        { status: 400 }
      );
    }

    const { referenceCode, fingerprint } = await captureClientError({
      message: body.message,
      errorCode: body.errorCode || "CLIENT_ERROR",
      stack: body.stack,
      module: body.module || "frontend",
      operation: body.operation || "interaction",
      route: body.route,
      userId: body.userId,
      userRole: body.userRole,
      schoolId: body.schoolId,
      metadata: body.metadata,
      clientMetadata: body.clientMetadata,
    });

    return NextResponse.json({
      success: true,
      referenceCode,
      fingerprint,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to ingest client error.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
