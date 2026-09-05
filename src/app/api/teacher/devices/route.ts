import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { teacherId, tokenOrSubscription, deviceInfo, notificationPermission } = body;
    const schoolId = authResult.user.schoolId || body.schoolId;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId required" }, { status: 400 });
    }

    const deviceId = `${authResult.user.uid}_${(deviceInfo || "browser").replace(/[^a-zA-Z0-9]/g, "_")}`;
    const deviceData = {
      id: deviceId,
      userId: authResult.user.uid,
      teacherId: teacherId || authResult.user.uid,
      schoolId,
      tokenOrSubscription: tokenOrSubscription || {},
      deviceInfo: deviceInfo || "Web Browser",
      notificationPermission: notificationPermission || "granted",
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("teacherDevices")
        .doc(deviceId)
        .set(deviceData, { merge: true });
    } else {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, "schools", schoolId, "teacherDevices", deviceId),
        { ...deviceData, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    return NextResponse.json({ success: true, deviceId, message: "Device registered successfully." });
  } catch (error: any) {
    console.error("POST /api/teacher/devices error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to register device" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const schoolId = authResult.user.schoolId || searchParams.get("schoolId");

    if (!schoolId || !deviceId) {
      return NextResponse.json({ success: false, error: "schoolId and deviceId required" }, { status: 400 });
    }

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("teacherDevices")
        .doc(deviceId)
        .delete();
    } else {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, "schools", schoolId, "teacherDevices", deviceId));
    }

    return NextResponse.json({ success: true, message: "Device unregistered successfully." });
  } catch (error: any) {
    console.error("DELETE /api/teacher/devices error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to unregister device" },
      { status: 500 }
    );
  }
}
