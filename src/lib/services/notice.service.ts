import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Notice, CreateNoticeInput, NoticeStatus } from "@/types";
import { createNotification } from "@/lib/services/notification.service";

/**
 * Creates and publishes a school notice.
 * Path: notices/{noticeId}
 */
export async function createNotice(
  schoolId: string,
  input: CreateNoticeInput,
  adminUid: string,
  adminName: string
): Promise<string> {
  if (!schoolId || schoolId === "system") {
    throw new Error("Cannot create notice: No valid school assigned. Please complete school setup first.");
  }
  const db = getFirebaseDb();
  const noticeDocRef = doc(collection(db, "notices"));
  const noticeId = noticeDocRef.id;

  const noticeData: Omit<Notice, "createdAt" | "updatedAt"> = {
    id: noticeId,
    schoolId,
    title: input.title.trim(),
    message: input.message.trim(),
    audience: input.audience,
    classId: input.audience === "CLASS" ? input.classId || "" : "",
    className: input.audience === "CLASS" ? input.className || "" : "",
    date: input.date || new Date().toISOString().split("T")[0],
    createdBy: adminUid,
    createdByName: adminName,
    status: "active",
  };

  await setDoc(noticeDocRef, {
    ...noticeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Emit Realtime Notification to targeted audience
  try {
    let targetAudience: "all" | "teachers" | "students" | "class" = "all";
    if (input.audience === "TEACHERS") targetAudience = "teachers";
    else if (input.audience === "STUDENTS") targetAudience = "students";
    else if (input.audience === "CLASS") targetAudience = "class";

    await createNotification(
      schoolId,
      {
        title: input.title.trim(),
        message: input.message.trim().substring(0, 160),
        type: "notice",
        targetAudience,
        targetClassId: input.audience === "CLASS" ? input.classId : undefined,
        link: "/student/notices",
        actionLabel: "View Notice",
        idempotencyKey: `notice_${noticeId}`,
        priority: "normal",
      },
      { uid: adminUid, name: adminName, role: "school_admin" }
    );
  } catch (notifErr) {
    console.warn("[NoticeService] Non-blocking notice notification error:", notifErr);
  }

  return noticeId;
}

/**
 * Fetches all notices for a school (School Admin view).
 */
export async function getNoticesForAdmin(
  schoolId: string,
  options?: { audience?: string; status?: string }
): Promise<Notice[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notices"),
    where("schoolId", "==", schoolId)
  );

  const snapshot = await getDocs(q);
  let notices = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Notice[];

  // Sort descending by date
  notices.sort((a, b) => b.date.localeCompare(a.date));

  if (options?.audience && options.audience !== "ALL_AUDIENCES") {
    notices = notices.filter((n) => n.audience === options.audience);
  }

  if (options?.status && options.status !== "all") {
    notices = notices.filter((n) => n.status === options.status);
  }

  return notices;
}

/**
 * Fetches targeted notices for a teacher:
 * Audience is ALL, TEACHERS, or CLASS matching their assigned class.
 */
export async function getNoticesForTeacher(
  schoolId: string,
  assignedClassId?: string
): Promise<Notice[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notices"),
    where("schoolId", "==", schoolId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const allActive = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Notice[];

  // Filter targeted notices
  const targeted = allActive.filter((n) => {
    if (n.audience === "ALL" || n.audience === "TEACHERS") return true;
    if (n.audience === "CLASS" && assignedClassId && n.classId === assignedClassId) return true;
    return false;
  });

  return targeted.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Fetches targeted notices for a student:
 * Audience is ALL, STUDENTS, or CLASS matching their enrolled class.
 */
export async function getNoticesForStudent(
  schoolId: string,
  studentClassId: string
): Promise<Notice[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notices"),
    where("schoolId", "==", schoolId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const allActive = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Notice[];

  // Filter targeted notices
  const targeted = allActive.filter((n) => {
    if (n.audience === "ALL" || n.audience === "STUDENTS") return true;
    if (n.audience === "CLASS" && studentClassId && n.classId === studentClassId) return true;
    return false;
  });

  return targeted.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Toggles a notice status between active and archived.
 */
export async function toggleNoticeStatus(
  schoolId: string,
  noticeId: string,
  status: NoticeStatus
): Promise<void> {
  const db = getFirebaseDb();
  const noticeDocRef = doc(db, "notices", noticeId);
  await updateDoc(noticeDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a notice.
 */
export async function deleteNotice(
  schoolId: string,
  noticeId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "notices", noticeId));
}
