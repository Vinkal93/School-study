import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { AUDIT_COLLECTIONS, parseUserAgentInfo } from "@/lib/services/audit.service";
import type { ActivityLogEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      schoolId,
      schoolName,
      role,
      action,
      entityType,
      entityId,
      entityName,
      status = "success",
      failureReason,
      metadata = {},
    } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, action" },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "client-direct";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const { browser, platform, deviceType } = parseUserAgentInfo(userAgent);

    // Sanitize metadata to strip passwords, tokens, API keys
    const sanitizedMetadata = { ...(metadata || {}) };
    const sensitiveKeys = ["password", "token", "secretKey", "apiKey", "keySecret", "authSecret", "credentials"];
    for (const key of Object.keys(sanitizedMetadata)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        delete sanitizedMetadata[key];
      }
    }

    const db = getFirebaseDb();

    // 1. Write Activity Log
    const activityDoc: Omit<ActivityLogEntry, "id"> = {
      userId,
      userName: userName || "User",
      userEmail,
      schoolId: schoolId || null,
      schoolName: schoolName || "",
      role: role || "student",
      action,
      entityType: entityType || "system",
      entityId: entityId || null,
      entityName: entityName || "",
      status,
      failureReason: failureReason || null,
      metadata: sanitizedMetadata,
      ipAddress,
      userAgent,
      browser,
      platform,
      deviceType,
      timestamp: serverTimestamp() as any,
    };

    const docRef = await addDoc(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), activityDoc);

    // 2. If action is LOGIN, also write to login_logs
    if (action === "LOGIN") {
      await addDoc(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), {
        uid: userId,
        email: userEmail || "",
        role: role || "student",
        schoolId: schoolId || null,
        status,
        failureReason: failureReason || null,
        ipAddress,
        userAgent,
        browser,
        platform,
        deviceType,
        timestamp: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      logId: docRef.id,
    });
  } catch (error: any) {
    console.error("Failed to record activity log via API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error recording activity log" },
      { status: 500 }
    );
  }
}
