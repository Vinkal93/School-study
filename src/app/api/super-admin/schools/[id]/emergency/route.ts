import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import {
  getSchoolEmergencyControl,
  updateSchoolEmergencyControl,
} from "@/lib/emergency/emergencyEngine";

async function getAdminAuthServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return adminModule.adminAuth || null;
  } catch (e) {
    return null;
  }
}

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const emergencyControl = await getSchoolEmergencyControl(schoolId);
    return NextResponse.json({
      success: true,
      schoolId,
      emergencyControl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch school emergency control." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const body = await req.json();
    const {
      status,
      disablePayments,
      disableFees,
      disableReports,
      forceLogoutAll,
      reason = "Super Admin emergency modification",
      actorId = "super_admin",
    } = body;

    const updated = await updateSchoolEmergencyControl(
      schoolId,
      {
        status: status || "ACTIVE",
        disablePayments: !!disablePayments,
        disableFees: !!disableFees,
        disableReports: !!disableReports,
        forceLogoutAll: !!forceLogoutAll,
        reason,
      },
      actorId,
      reason
    );

    const adminDb = await getAdminDbServerOnly();
    const isReadOnly = status === "READ_ONLY";
    const isEmergencyPaused = status === "PAUSED";

    if (adminDb) {
      await adminDb.collection(COLLECTIONS.SCHOOLS).doc(schoolId).set(
        {
          isReadOnly,
          isEmergencyPaused,
          emergencyStatus: status,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        await updateDoc(doc(clientDb, COLLECTIONS.SCHOOLS, schoolId), {
          isReadOnly,
          isEmergencyPaused,
          emergencyStatus: status,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (forceLogoutAll) {
      const adminAuth = await getAdminAuthServerOnly();
      if (adminDb && adminAuth) {
        const usersSnap = await adminDb
          .collection("users")
          .where("schoolId", "==", schoolId)
          .get();

        for (const uDoc of usersSnap.docs) {
          await adminAuth.revokeRefreshTokens(uDoc.id).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      schoolId,
      emergencyControl: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update school emergency controls." },
      { status: 500 }
    );
  }
}

