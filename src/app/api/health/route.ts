import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Safe health check endpoint for uptime monitoring without exposing secrets or database credentials
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "School Study SaaS Platform",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
}
