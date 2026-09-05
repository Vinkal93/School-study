import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import type { ClassBell, DayOfWeek } from "@/types/timetable";

const VALID_WEEKDAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      schoolId: reqSchoolId,
      classId,
      sectionId,
      sourceDay,
      targetDays: reqTargetDays,
    } = body;
    const schoolId = reqSchoolId || authResult.user.schoolId;

    if (!schoolId || !classId || !sourceDay) {
      return NextResponse.json(
        { success: false, error: "schoolId, classId, and sourceDay are required." },
        { status: 400 }
      );
    }

    const isSuperAdmin = authResult.user.role === "super_admin";
    const isSchoolAdmin =
      authResult.user.role === "school_admin" || authResult.user.role === "admin";

    if (!isSuperAdmin && (!isSchoolAdmin || authResult.user.schoolId !== schoolId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: School Admin privileges required." },
        { status: 403 }
      );
    }

    const targetDays: DayOfWeek[] =
      Array.isArray(reqTargetDays) && reqTargetDays.length > 0
        ? reqTargetDays.filter((d: any) => VALID_WEEKDAYS.includes(d) && d !== sourceDay)
        : VALID_WEEKDAYS.filter((d) => d !== sourceDay);

    const adminDb = getSafeAdminDb();

    // 1. Fetch source bells
    let sourceBells: ClassBell[] = [];
    if (adminDb) {
      let q = adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("bells")
        .where("classId", "==", classId)
        .where("dayOfWeek", "==", sourceDay);
      const snap = await q.get();
      sourceBells = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      const db = getFirebaseDb();
      let q = query(
        collection(db, "schools", schoolId, "bells"),
        where("classId", "==", classId),
        where("dayOfWeek", "==", sourceDay)
      );
      const snap = await getDocs(q);
      sourceBells = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassBell[];
    }

    if (sectionId && sectionId !== "all") {
      sourceBells = sourceBells.filter((b) => !b.sectionId || b.sectionId === sectionId);
    }

    if (sourceBells.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No periods found on ${sourceDay} to apply. Please configure at least one period on ${sourceDay} first.`,
        },
        { status: 400 }
      );
    }

    // 2. Fetch existing bells on target days to clean up before copying
    let copiedTotal = 0;

    if (adminDb) {
      const batch = adminDb.batch();

      for (const targetDay of targetDays) {
        // Delete existing for this class, section, targetDay
        let q = adminDb
          .collection("schools")
          .doc(schoolId)
          .collection("bells")
          .where("classId", "==", classId)
          .where("dayOfWeek", "==", targetDay);
        const existingSnap = await q.get();

        existingSnap.docs.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (!sectionId || sectionId === "all" || data.sectionId === sectionId) {
            batch.delete(docSnap.ref);
          }
        });

        // Insert copied bells
        sourceBells.forEach((sb) => {
          const newDocRef = adminDb.collection("schools").doc(schoolId).collection("bells").doc();
          const copyData: any = {
            ...sb,
            id: newDocRef.id,
            dayOfWeek: targetDay,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: authResult.user?.uid,
          };
          batch.set(newDocRef, copyData);
          copiedTotal++;
        });
      }

      await batch.commit();
    } else {
      const db = getFirebaseDb();
      const batch = writeBatch(db);

      for (const targetDay of targetDays) {
        const q = query(
          collection(db, "schools", schoolId, "bells"),
          where("classId", "==", classId),
          where("dayOfWeek", "==", targetDay)
        );
        const existingSnap = await getDocs(q);

        existingSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as ClassBell;
          if (!sectionId || sectionId === "all" || data.sectionId === sectionId) {
            batch.delete(doc(db, "schools", schoolId, "bells", docSnap.id));
          }
        });

        sourceBells.forEach((sb) => {
          const newDocRef = doc(collection(db, "schools", schoolId, "bells"));
          const copyData = {
            ...sb,
            id: newDocRef.id,
            dayOfWeek: targetDay,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: authResult.user?.uid,
          };
          batch.set(newDocRef, copyData);
          copiedTotal++;
        });
      }

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully copied ${sourceBells.length} period(s) from ${sourceDay.toUpperCase()} to ${targetDays.join(", ").toUpperCase()}.`,
      copiedPeriods: copiedTotal,
      targetDays,
    });
  } catch (error: any) {
    console.error("POST /api/timetable/apply-all error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to copy timetable" },
      { status: 500 }
    );
  }
}
