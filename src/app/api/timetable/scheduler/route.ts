import { NextResponse } from "next/server";
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
  serverTimestamp,
} from "firebase/firestore";
import type { ClassBell, DayOfWeek } from "@/types/timetable";
import type { AppNotification } from "@/types/notification";

/**
 * Returns the current date, time (HH:MM), and weekday in a given IANA timezone.
 */
function getLocalSchoolTime(timeZone: string = "Asia/Kolkata", offsetMinutes: number = 0) {
  const now = new Date();
  if (offsetMinutes !== 0) {
    now.setMinutes(now.getMinutes() + offsetMinutes);
  }

  // Format parts according to school's timezone
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const weekday = (getPart("weekday") || "monday").toLowerCase() as DayOfWeek;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  return { weekday, dateStr, timeStr, now };
}

/**
 * Core execution engine for class alerts.
 */
async function processClassAlertsForSchool(
  schoolId: string,
  timeZone: string = "Asia/Kolkata",
  overrideLocalTime?: { weekday: DayOfWeek; dateStr: string; timeStr: string }
) {
  const { weekday, dateStr, timeStr } =
    overrideLocalTime || getLocalSchoolTime(timeZone, 0);

  const adminDb = getSafeAdminDb();
  let bells: ClassBell[] = [];

  if (adminDb) {
    const snap = await adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("bells")
      .get();
    bells = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } else {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "schools", schoolId, "bells"));
    bells = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassBell[];
  }

  // Filter bells matching today's weekday & current time
  const matchingBells = bells.filter((b) => {
    if (b.isBreak) return false;
    if (!b.teacherId) return false;
    if (b.dayOfWeek !== weekday && b.dayOfWeek !== "all") return false;
    if (b.status === "inactive") return false;

    // Match exact minute or within 1 minute
    return b.startTime === timeStr;
  });

  const results = {
    schoolId,
    weekday,
    timeStr,
    dateStr,
    matchedCount: matchingBells.length,
    notificationsCreated: 0,
    duplicatesPrevented: 0,
    alerts: [] as any[],
  };

  for (const bell of matchingBells) {
    const idempotencyKey = `${schoolId}_${bell.id}_${dateStr}_start_${bell.teacherId}`;

    // 1. Idempotency Check
    let alreadyExists = false;
    if (adminDb) {
      const existingSnap = await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("notifications")
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();
      alreadyExists = !existingSnap.empty;
    } else {
      const db = getFirebaseDb();
      const q = query(
        collection(db, "schools", schoolId, "notifications"),
        where("idempotencyKey", "==", idempotencyKey)
      );
      const existingSnap = await getDocs(q);
      alreadyExists = !existingSnap.empty;
    }

    if (alreadyExists) {
      results.duplicatesPrevented++;
      continue;
    }

    // 2. Create authoritative notification
    const notificationId = adminDb
      ? adminDb.collection("schools").doc(schoolId).collection("notifications").doc().id
      : doc(collection(getFirebaseDb(), "schools", schoolId, "notifications")).id;

    const notificationPayload: AppNotification = {
      id: notificationId,
      schoolId,
      title: "🔔 Class Starting Now",
      message: `Class: ${bell.className}${bell.sectionName ? " " + bell.sectionName : ""} • Subject: ${bell.subject} • Bell ${bell.bellNumber} (${bell.startTime}–${bell.endTime})`,
      type: "timetable",
      targetAudience: "user",
      targetUserId: bell.teacherId || "",
      targetUserIds: [bell.teacherId as string],
      senderUid: "system_scheduler",
      senderName: "School Bell System",
      senderRole: "system",
      link: `/teacher/timetable?bellId=${bell.id}`,
      actionLabel: "View Class Details",
      idempotencyKey,
      priority: "urgent",
      readBy: {},
      createdAt: adminDb ? new Date().toISOString() : (serverTimestamp() as any),
      metadata: {
        bellId: bell.id,
        bellNumber: bell.bellNumber,
        className: bell.className,
        sectionName: bell.sectionName || "",
        subject: bell.subject,
        startTime: bell.startTime,
        endTime: bell.endTime,
        room: bell.room || "",
        chapter: bell.chapter || "",
        task: bell.task || "",
        reminder: bell.reminder || "",
        message: bell.message || "",
        bookName: bell.bookName || "",
      },
    };

    if (adminDb) {
      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("notifications")
        .doc(notificationId)
        .set(notificationPayload);
    } else {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, "schools", schoolId, "notifications", notificationId),
        notificationPayload
      );
    }

    results.notificationsCreated++;
    results.alerts.push({
      bellId: bell.id,
      teacherId: bell.teacherId,
      teacherName: bell.teacherName,
      class: bell.className,
      subject: bell.subject,
      timing: `${bell.startTime} - ${bell.endTime}`,
      idempotencyKey,
    });
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { schoolId, timeZone, mockTime } = body;

    // mockTime for testing or controlled simulation: { weekday, dateStr, timeStr }
    if (schoolId) {
      const result = await processClassAlertsForSchool(
        schoolId,
        timeZone || "Asia/Kolkata",
        mockTime
      );
      return NextResponse.json({ success: true, ...result });
    }

    // Multi-tenant loop across schools
    const adminDb = getSafeAdminDb();
    let schoolIds: string[] = [];

    if (adminDb) {
      const snap = await adminDb.collection("schools").get();
      schoolIds = snap.docs.map((d: any) => d.id);
    } else {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, "schools"));
      schoolIds = snap.docs.map((d) => d.id);
    }

    const allResults = [];
    for (const sid of schoolIds) {
      const res = await processClassAlertsForSchool(sid, timeZone || "Asia/Kolkata", mockTime);
      allResults.push(res);
    }

    return NextResponse.json({
      success: true,
      schoolsProcessed: schoolIds.length,
      details: allResults,
    });
  } catch (error: any) {
    console.error("POST /api/timetable/scheduler error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Scheduler failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "";
    const timeZone = searchParams.get("timeZone") || "Asia/Kolkata";
    const testTime = searchParams.get("testTime"); // "HH:MM"
    const testDay = searchParams.get("testDay") as DayOfWeek | null;

    let mockTime = undefined;
    if (testTime) {
      const nowInfo = getLocalSchoolTime(timeZone);
      mockTime = {
        weekday: testDay || nowInfo.weekday,
        dateStr: nowInfo.dateStr,
        timeStr: testTime,
      };
    }

    if (!schoolId) {
      return NextResponse.json({
        success: false,
        error: "schoolId is required to run test or manual scheduler check.",
      }, { status: 400 });
    }

    const result = await processClassAlertsForSchool(schoolId, timeZone, mockTime);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/timetable/scheduler error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Scheduler failed" },
      { status: 500 }
    );
  }
}
