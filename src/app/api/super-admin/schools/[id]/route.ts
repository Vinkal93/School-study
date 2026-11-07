import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { deleteSchoolSecurely } from "@/lib/services/school-deletion.service";
import { validateSchoolStatus } from "@/lib/auth/schoolValidation";
import type { AppUser, School } from "@/types";

/**
 * GET /api/super-admin/schools/[id]
 * Authoritatively retrieves school record and validates active status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const validation = await validateSchoolStatus(schoolId);

    if (!validation.valid || !validation.school) {
      return NextResponse.json(
        {
          success: false,
          code: validation.code || "SCHOOL_NOT_FOUND",
          error: validation.error || "School Account Not Found. This school account no longer exists. Please contact support.",
        },
        { status: validation.statusHttp || 404 }
      );
    }

    return NextResponse.json({
      success: true,
      school: validation.school,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch school." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/schools/[id]
 * Updates school configuration or status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const body = await req.json();
    const { performerUid, ...updates } = body;

    let performer: AppUser | null = null;

    // 1. Authenticate Super Admin via cryptographic token or fallback
    const authResult = await requireSuperAdmin(req).catch(() => null);
    if (authResult?.user) {
      performer = {
        uid: authResult.user.uid,
        email: authResult.user.email,
        name: authResult.user.name || "Super Admin",
        role: "super_admin",
        status: "active",
      } as AppUser;
    } else if (performerUid) {
      const db = getFirebaseDb();
      const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
      if (performerSnap.exists()) {
        const u = performerSnap.data() as AppUser;
        if (u.role === "super_admin" && u.status === "active") {
          performer = u;
        }
      }
    }

    if (!performer) {
      return NextResponse.json(
        { error: "Unauthorized. Active Super Admin permission required." },
        { status: 403 }
      );
    }

    const db = getFirebaseDb();

    // 2. Fetch Existing School
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    const schoolSnap = await getDoc(schoolRef);
    if (!schoolSnap.exists()) {
      return NextResponse.json(
        { error: "School Account Not Found. This school account no longer exists. Please contact support." },
        { status: 404 }
      );
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

/**
 * DELETE /api/super-admin/schools/[id]
 * Authoritative, secure, and idempotent school deletion endpoint.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    let actorId = "super_admin";

    // 1. Verify Super Admin authorization
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    actorId = authResult.user?.uid || "super_admin";

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Super Admin institutional deletion";

    // 2. Execute secure, idempotent, batched deletion
    const report = await deleteSchoolSecurely(schoolId, actorId, reason);

    return NextResponse.json({
      success: true,
      message: `School "${report.schoolName}" (${schoolId}) and all associated records have been permanently erased.`,
      report,
    });
  } catch (error: any) {
    console.error("School deletion error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to securely delete school." },
      { status: 500 }
    );
  }
}
