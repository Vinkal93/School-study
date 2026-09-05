import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { ClassBell, CreateClassBellInput, DayOfWeek } from "@/types/timetable";

/**
 * Converts "HH:MM" string to minutes from midnight for arithmetic comparisons.
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return -1;
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

/**
 * Checks if two time intervals [s1, e1) and [s2, e2) overlap.
 */
function intervalsOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

// ============================================================================
// GET: Fetch Timetable Bells
// ============================================================================
export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || authResult.user.schoolId;
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const dayOfWeek = searchParams.get("dayOfWeek") as DayOfWeek | null;
    const teacherId = searchParams.get("teacherId");

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId is required" }, { status: 400 });
    }

    // Tenant boundary validation
    if (authResult.user.role !== "super_admin" && authResult.user.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: "Access denied to target school" }, { status: 403 });
    }

    const adminDb = getSafeAdminDb();
    let bells: ClassBell[] = [];

    if (adminDb) {
      let queryRef: any = adminDb.collection("schools").doc(schoolId).collection("bells");
      if (classId) {
        queryRef = queryRef.where("classId", "==", classId);
      }
      if (teacherId) {
        queryRef = queryRef.where("teacherId", "==", teacherId);
      }
      const snap = await queryRef.get();
      bells = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      const db = getFirebaseDb();
      let q = query(collection(db, "schools", schoolId, "bells"));
      if (classId) {
        q = query(collection(db, "schools", schoolId, "bells"), where("classId", "==", classId));
      }
      const snap = await getDocs(q);
      bells = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassBell[];
    }

    // In-memory filters for section & dayOfWeek
    if (sectionId && sectionId !== "all") {
      bells = bells.filter((b) => !b.sectionId || b.sectionId === sectionId);
    }
    if (dayOfWeek && dayOfWeek !== "all") {
      bells = bells.filter((b) => b.dayOfWeek === dayOfWeek || b.dayOfWeek === "all");
    }
    if (teacherId) {
      bells = bells.filter((b) => b.teacherId === teacherId);
    }

    // Order by startTime then bellNumber
    bells.sort((a, b) => {
      const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
      if (startDiff !== 0) return startDiff;
      return (a.bellNumber || 0) - (b.bellNumber || 0);
    });

    return NextResponse.json({ success: true, bells, total: bells.length });
  } catch (error: any) {
    console.error("GET /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Create or Update Timetable Bell
// ============================================================================
export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { schoolId: reqSchoolId, bellId, ...inputData } = body;
    const schoolId = reqSchoolId || authResult.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId is required" }, { status: 400 });
    }

    // Role & Tenant authorization
    const isSuperAdmin = authResult.user.role === "super_admin";
    const isSchoolAdmin =
      authResult.user.role === "school_admin" || authResult.user.role === "admin";

    if (!isSuperAdmin && (!isSchoolAdmin || authResult.user.schoolId !== schoolId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: School Admin privileges required." },
        { status: 403 }
      );
    }

    const input: CreateClassBellInput = inputData;

    // 1. Validations
    if (!input.classId || !input.className) {
      return NextResponse.json({ success: false, error: "Class is required." }, { status: 400 });
    }
    if (!input.dayOfWeek) {
      return NextResponse.json({ success: false, error: "Weekday is required." }, { status: 400 });
    }
    if (!input.bellNumber || Number(input.bellNumber) < 1) {
      return NextResponse.json({ success: false, error: "Valid bell number is required." }, { status: 400 });
    }
    if (!input.startTime || !input.endTime) {
      return NextResponse.json({ success: false, error: "Start time and end time are required." }, { status: 400 });
    }

    const startMin = timeToMinutes(input.startTime);
    const endMin = timeToMinutes(input.endTime);
    if (startMin < 0 || endMin < 0) {
      return NextResponse.json({ success: false, error: "Invalid time format. Please use HH:MM." }, { status: 400 });
    }
    if (endMin <= startMin) {
      return NextResponse.json(
        { success: false, error: "End time must be strictly after start time." },
        { status: 400 }
      );
    }

    const durationMinutes = endMin - startMin;

    if (!input.isBreak && (!input.subject || !input.subject.trim())) {
      return NextResponse.json(
        { success: false, error: "Subject is required unless marked as a Break/Recess." },
        { status: 400 }
      );
    }

    // 2. Fetch existing bells for conflict detection
    const adminDb = getSafeAdminDb();
    let existingBells: ClassBell[] = [];

    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("bells").get();
      existingBells = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, "schools", schoolId, "bells"));
      existingBells = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassBell[];
    }

    // Filter out the bell being edited
    const otherBells = existingBells.filter((b) => b.id !== bellId);

    // Conflict Check 1: Duplicate Bell Number for same class, section & day
    const duplicateBell = otherBells.find((b) => {
      if (b.classId !== input.classId) return false;
      if (b.dayOfWeek !== input.dayOfWeek && b.dayOfWeek !== "all" && input.dayOfWeek !== "all") return false;
      const bSec = b.sectionId || "";
      const inSec = input.sectionId || "";
      // If either has no section (applies to all) or sections match
      if (bSec && inSec && bSec !== inSec) return false;
      return Number(b.bellNumber) === Number(input.bellNumber);
    });

    if (duplicateBell) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate Bell Number: Bell ${input.bellNumber} already exists on ${input.dayOfWeek} for ${input.className}.`,
          conflictType: "duplicate_bell",
        },
        { status: 409 }
      );
    }

    // Conflict Check 2: Overlapping period timing for same class, section & day
    const overlappingBell = otherBells.find((b) => {
      if (b.classId !== input.classId) return false;
      if (b.dayOfWeek !== input.dayOfWeek && b.dayOfWeek !== "all" && input.dayOfWeek !== "all") return false;
      const bSec = b.sectionId || "";
      const inSec = input.sectionId || "";
      if (bSec && inSec && bSec !== inSec) return false;

      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return intervalsOverlap(startMin, endMin, bStart, bEnd);
    });

    if (overlappingBell) {
      return NextResponse.json(
        {
          success: false,
          error: `Schedule Overlap: Period overlaps with Bell ${overlappingBell.bellNumber} (${overlappingBell.startTime} - ${overlappingBell.endTime}) for this class.`,
          conflictType: "overlap",
          conflictingBell: overlappingBell,
        },
        { status: 409 }
      );
    }

    // Conflict Check 3: Teacher double booking
    if (!input.isBreak && input.teacherId) {
      const teacherCollision = otherBells.find((b) => {
        if (!b.teacherId || b.teacherId !== input.teacherId) return false;
        if (b.dayOfWeek !== input.dayOfWeek && b.dayOfWeek !== "all" && input.dayOfWeek !== "all") return false;
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return intervalsOverlap(startMin, endMin, bStart, bEnd);
      });

      if (teacherCollision) {
        return NextResponse.json(
          {
            success: false,
            error: `Teacher Schedule Conflict: ${input.teacherName || "Assigned teacher"} is already assigned to ${teacherCollision.className} (${teacherCollision.startTime} - ${teacherCollision.endTime}) on ${input.dayOfWeek}.`,
            conflictType: "teacher_conflict",
            conflictingBell: teacherCollision,
          },
          { status: 409 }
        );
      }
    }

    // 3. Persist record to database
    const finalBellId = bellId || (adminDb ? adminDb.collection("schools").doc(schoolId).collection("bells").doc().id : doc(collection(getFirebaseDb(), "schools", schoolId, "bells")).id);

    const bellRecord: Partial<ClassBell> = {
      id: finalBellId,
      schoolId,
      classId: input.classId,
      className: input.className,
      sectionId: input.sectionId || "",
      sectionName: input.sectionName || "",
      bellNumber: Number(input.bellNumber),
      bellName: input.bellName?.trim() || `Period ${input.bellNumber}`,
      startTime: input.startTime.trim(),
      endTime: input.endTime.trim(),
      durationMinutes,
      subject: input.isBreak ? "Recess / Break" : input.subject.trim(),
      bookName: input.isBreak ? "" : (input.bookName?.trim() || ""),
      chapter: input.isBreak ? "" : (input.chapter?.trim() || ""),
      task: input.isBreak ? "" : (input.task?.trim() || ""),
      reminder: input.isBreak ? "" : (input.reminder?.trim() || ""),
      message: input.isBreak ? "" : (input.message?.trim() || ""),
      room: input.room?.trim() || "",
      teacherId: input.isBreak ? "" : (input.teacherId || ""),
      teacherName: input.isBreak ? "" : (input.teacherName?.trim() || ""),
      dayOfWeek: input.dayOfWeek,
      isBreak: Boolean(input.isBreak),
      order: Number(input.bellNumber),
      academicYearId: input.academicYearId || "",
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    if (adminDb) {
      if (!bellId) {
        bellRecord.createdAt = new Date().toISOString();
        bellRecord.createdBy = authResult.user.uid;
      }
      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("bells")
        .doc(finalBellId)
        .set(bellRecord, { merge: true });
    } else {
      const db = getFirebaseDb();
      const docRef = doc(db, "schools", schoolId, "bells", finalBellId);
      const dataToSave = {
        ...bellRecord,
        updatedAt: serverTimestamp(),
      };
      if (!bellId) {
        (dataToSave as any).createdAt = serverTimestamp();
        (dataToSave as any).createdBy = authResult.user.uid;
      }
      await setDoc(docRef, dataToSave, { merge: true });
    }

    return NextResponse.json(
      {
        success: true,
        message: bellId ? "Period updated successfully!" : "Period created successfully!",
        bell: bellRecord,
      },
      { status: bellId ? 200 : 201 }
    );
  } catch (error: any) {
    console.error("POST /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save period" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete Timetable Bell
// ============================================================================
export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || authResult.user.schoolId;
    const bellId = searchParams.get("bellId");

    if (!schoolId || !bellId) {
      return NextResponse.json(
        { success: false, error: "schoolId and bellId are required." },
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

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("bells")
        .doc(bellId)
        .delete();
    } else {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, "schools", schoolId, "bells", bellId));
    }

    return NextResponse.json({
      success: true,
      message: "Period deleted successfully.",
      deletedBellId: bellId,
    });
  } catch (error: any) {
    console.error("DELETE /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete period" },
      { status: 500 }
    );
  }
}
