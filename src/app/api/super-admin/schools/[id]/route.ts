import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser, School } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const body = await req.json();
    const { performerUid, ...updates } = body;

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify Super Admin authorization
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "Performer account not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Active Super Admin permission required." },
        { status: 403 }
      );
    }

    // 2. Fetch Existing School
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    const schoolSnap = await getDoc(schoolRef);
    if (!schoolSnap.exists()) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const previousData = schoolSnap.data() as School;

    // 3. Update School Document
    await updateDoc(schoolRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // 4. Log Audit Event
    const isStatusChange = updates.status && updates.status !== previousData.status;
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
      action: isStatusChange ? "SCHOOL_STATUS_CHANGE" : "SCHOOL_UPDATE",
      targetId: schoolId,
      targetType: "school",
      targetName: updates.name || previousData.name,
      performedBy: {
        uid: performer.uid,
        name: performer.name || "Super Admin",
        email: performer.email,
        role: performer.role,
      },
      previousState: isStatusChange ? { status: previousData.status } : null,
      newState: isStatusChange ? { status: updates.status } : updates,
      reason: isStatusChange
        ? `School status changed to ${updates.status}`
        : "School profile updated by Super Admin",
      ipAddress,
      userAgent,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      schoolId,
      updatedFields: updates,
    });
  } catch (error: any) {
    console.error("School update failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update school." },
      { status: 500 }
    );
  }
}
