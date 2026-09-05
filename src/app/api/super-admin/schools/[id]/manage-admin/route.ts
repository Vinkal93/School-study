import { NextResponse } from "next/server";
import { getSafeAdminDb, adminAuth } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

/**
 * POST /api/super-admin/schools/[id]/manage-admin
 * Super Admin endpoint to manage, reassign, or reset credentials for a school admin.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, adminName, adminEmail, newPassword } = body;

    const db = getFirebaseDb();
    const adminDb = getSafeAdminDb();

    // 1. Fetch current school
    let schoolData: any = null;
    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).get();
      if (snap.exists) schoolData = snap.data();
    } else if (db) {
      const snap = await getDoc(doc(db, "schools", schoolId));
      if (snap.exists()) schoolData = snap.data();
    }

    if (!schoolData) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const currentAdminUid = schoolData.adminUid || schoolData.adminId;

    // Action 1: RESET PASSWORD
    if (action === "RESET_PASSWORD") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (currentAdminUid && adminAuth) {
        await adminAuth.updateUser(currentAdminUid, { password: newPassword });
      } else if (schoolData.adminEmail && adminAuth) {
        const u = await adminAuth.getUserByEmail(schoolData.adminEmail).catch(() => null);
        if (u) {
          await adminAuth.updateUser(u.uid, { password: newPassword });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully reset password for school admin (${schoolData.adminEmail || currentAdminUid}).`,
      });
    }

    // Action 2: UPDATE INFO / REASSIGN ADMIN
    const updatedName = adminName ? adminName.trim() : schoolData.adminName;
    const updatedEmail = adminEmail ? adminEmail.trim().toLowerCase() : schoolData.adminEmail;

    // Update Auth user if email changed and adminAuth is available
    if (currentAdminUid && adminAuth) {
      try {
        const updatePayload: any = {};
        if (adminEmail && adminEmail.trim().toLowerCase() !== schoolData.adminEmail) {
          updatePayload.email = updatedEmail;
        }
        if (adminName) {
          updatePayload.displayName = updatedName;
        }
        if (Object.keys(updatePayload).length > 0) {
          await adminAuth.updateUser(currentAdminUid, updatePayload);
        }
      } catch (authErr: any) {
        console.warn("Auth user update notice:", authErr);
      }
    }

    // Update schools doc
    const schoolUpdatePayload = {
      adminName: updatedName,
      adminEmail: updatedEmail,
      updatedAt: new Date().toISOString(),
    };

    if (adminDb) {
      await adminDb.collection("schools").doc(schoolId).update(schoolUpdatePayload);
    } else if (db) {
      await updateDoc(doc(db, "schools", schoolId), schoolUpdatePayload);
    }

    // Update user profile doc in users collection
    if (currentAdminUid) {
      const userUpdatePayload = {
        name: updatedName,
        email: updatedEmail,
        updatedAt: new Date().toISOString(),
      };
      if (adminDb) {
        await adminDb.collection("users").doc(currentAdminUid).set(userUpdatePayload, { merge: true });
      } else if (db) {
        await updateDoc(doc(db, "users", currentAdminUid), userUpdatePayload).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `School admin updated successfully to ${updatedName} (${updatedEmail}).`,
      adminName: updatedName,
      adminEmail: updatedEmail,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/schools/[id]/manage-admin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to manage school admin." },
      { status: 500 }
    );
  }
}
