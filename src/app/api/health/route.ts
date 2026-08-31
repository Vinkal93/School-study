import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { checkRazorpayConfiguration } from "@/lib/payments/razorpay";

/**
 * GET /api/health
 * Comprehensive production health check endpoint.
 * Evaluates core services (Database, Payment Gateway, Runtime) without leaking secrets or executing destructive operations.
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "UP" | "DEGRADED" | "DOWN"; latencyMs?: number; message?: string }> = {};

  // 1. Database Ping Check
  try {
    const dbStartTime = Date.now();
    const db = getFirebaseDb();
    let dbUp = false;

    if (db) {
      // Non-destructive ping on paymentSettings/razorpay document
      const docRef = doc(db, "paymentSettings", "razorpay");
      await getDoc(docRef);
      dbUp = true;
    } else {
      // Direct REST ping fallback
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/paymentSettings/razorpay${apiKey ? `?key=${apiKey}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      dbUp = res.status < 500;
    }

    checks.database = {
      status: dbUp ? "UP" : "DEGRADED",
      latencyMs: Date.now() - dbStartTime,
    };
  } catch (dbErr: any) {
    checks.database = {
      status: "DEGRADED",
      message: "Database ping unreachable or restricted",
    };
  }

  // 2. Razorpay Gateway Configuration Check
  try {
    const rzpStatus = await checkRazorpayConfiguration();
    checks.paymentGateway = {
      status: rzpStatus.isConfigured ? "UP" : "DEGRADED",
      message: `Mode: ${rzpStatus.mode}, Status: ${rzpStatus.status}`,
    };
  } catch (rzpErr) {
    checks.paymentGateway = {
      status: "DEGRADED",
      message: "Unable to inspect payment configuration",
    };
  }

  const isHealthy = checks.database?.status === "UP";
  const totalLatencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      app: "School Study SaaS Platform",
      timestamp: new Date().toISOString(),
      latencyMs: totalLatencyMs,
      environment: process.env.NODE_ENV || "production",
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
