import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Notice, CreateNoticeInput, NoticeStatus, NoticeRecipientStatus } from "@/types";
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

/**
 * Marks a notice as read by a specific candidate (Student / Teacher).
 * Records read receipt on the notice document and subcollection for real-time tracking.
 */
export async function markNoticeAsRead(
  schoolId: string,
  noticeId: string,
  userId: string,
  userName: string,
  role: "student" | "teacher"
): Promise<void> {
  if (!noticeId || !userId) return;
  const db = getFirebaseDb();
  const noticeRef = doc(db, "notices", noticeId);
  const nowIso = new Date().toISOString();

  try {
    // 1. Update readBy map and readCount on notice document
    await updateDoc(noticeRef, {
      [`readBy.${userId}`]: nowIso,
      readCount: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // If document didn't have readBy field yet, merge with setDoc
      await setDoc(noticeRef, {
        readBy: { [userId]: nowIso },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    // 2. Add detailed receipt document in subcollection
    const receiptRef = doc(db, "notices", noticeId, "receipts", userId);
    await setDoc(receiptRef, {
      userId,
      name: userName || "User",
      role,
      status: "read",
      readAt: nowIso,
      deliveredAt: nowIso,
      schoolId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to mark notice as read:", err);
  }
}

/**
 * Records panel delivery (double grey tick) when a targeted user logs into their portal.
 */
export async function trackNoticeDelivery(
  noticeId: string,
  userId: string
): Promise<void> {
  if (!noticeId || !userId) return;
  const db = getFirebaseDb();
  const noticeRef = doc(db, "notices", noticeId);
  const nowIso = new Date().toISOString();

  try {
    await updateDoc(noticeRef, {
      [`deliveredTo.${userId}`]: nowIso,
    }).catch(async () => {
      await setDoc(noticeRef, {
        deliveredTo: { [userId]: nowIso },
      }, { merge: true });
    });
  } catch (err) {
    // Non-blocking
  }
}

export interface NoticeDeliverySummary {
  recipients: NoticeRecipientStatus[];
  summary: {
    total: number;
    read: number;
    delivered: number;
    offline: number;
    readPercentage: number;
  };
}

/**
 * Resolves full candidate breakdown and WhatsApp-style tick delivery statuses for a notice.
 * - Single Grey Tick (✓): Sent / Offline (User hasn't logged in since notice was created)
 * - Double Grey Tick (✓✓): Delivered (User has logged in since notice was created, but not read)
 * - Double Blue Tick (✓✓ blue): Read / Seen (User opened / clicked Mark as Read)
 */
export async function getNoticeDeliveryDetails(
  schoolId: string,
  notice: Notice
): Promise<NoticeDeliverySummary> {
  if (!schoolId || !notice?.id) {
    return {
      recipients: [],
      summary: { total: 0, read: 0, delivered: 0, offline: 0, readPercentage: 0 },
    };
  }

  const db = getFirebaseDb();
  const candidates: Array<{
    userId: string;
    name: string;
    email?: string;
    role: "student" | "teacher";
    className?: string;
    lastLoginAt?: string | null;
  }> = [];

  try {
    // 1. Fetch Students if targeted
    if (notice.audience === "ALL" || notice.audience === "STUDENTS" || notice.audience === "CLASS") {
      let qStudents = collection(db, "schools", schoolId, "students");
      let snap;
      if (notice.audience === "CLASS" && notice.classId) {
        snap = await getDocs(query(qStudents, where("classId", "==", notice.classId)));
      } else {
        snap = await getDocs(qStudents);
      }
      snap.forEach((d) => {
        const data = d.data();
        const uid = data.userId || d.id;
        if (uid) {
          candidates.push({
            userId: uid,
            name: data.name || data.studentName || "Student",
            email: data.email,
            role: "student",
            className: data.className || notice.className || "Class",
            lastLoginAt: data.lastLoginAt || data.lastActiveAt || null,
          });
        }
      });
    }

    // 2. Fetch Teachers if targeted
    if (notice.audience === "ALL" || notice.audience === "TEACHERS") {
      const qTeachers = collection(db, "schools", schoolId, "teachers");
      const snap = await getDocs(qTeachers);
      snap.forEach((d) => {
        const data = d.data();
        const uid = data.userId || d.id;
        if (uid) {
          candidates.push({
            userId: uid,
            name: data.name || data.teacherName || "Teacher",
            email: data.email,
            role: "teacher",
            className: data.assignedClassName || "Faculty",
            lastLoginAt: data.lastLoginAt || data.lastActiveAt || null,
          });
        }
      });
    }

    // Notice creation timestamp in ms
    let noticeCreatedMs = 0;
    if (notice.createdAt?.toMillis) {
      noticeCreatedMs = notice.createdAt.toMillis();
    } else if (notice.date) {
      noticeCreatedMs = new Date(notice.date).getTime();
    } else {
      noticeCreatedMs = Date.now() - 86400000;
    }

    const readBy = notice.readBy || {};
    const deliveredTo = notice.deliveredTo || {};

    let readCount = 0;
    let deliveredCount = 0;
    let offlineCount = 0;

    const recipients: NoticeRecipientStatus[] = candidates.map((c) => {
      const readTimestamp = readBy[c.userId];
      const deliveredTimestamp = deliveredTo[c.userId];
      const candidateLoginMs = c.lastLoginAt ? new Date(c.lastLoginAt).getTime() : 0;

      if (readTimestamp) {
        readCount++;
        return {
          userId: c.userId,
          name: c.name,
          email: c.email,
          role: c.role,
          className: c.className,
          status: "read", // Double Blue Tick
          deliveredAt: deliveredTimestamp || readTimestamp,
          readAt: readTimestamp,
        };
      } else if (deliveredTimestamp || (candidateLoginMs > 0 && candidateLoginMs >= noticeCreatedMs)) {
        deliveredCount++;
        return {
          userId: c.userId,
          name: c.name,
          email: c.email,
          role: c.role,
          className: c.className,
          status: "delivered", // Double Grey Tick
          deliveredAt: deliveredTimestamp || (c.lastLoginAt ? new Date(c.lastLoginAt).toISOString() : null),
          readAt: null,
        };
      } else {
        offlineCount++;
        return {
          userId: c.userId,
          name: c.name,
          email: c.email,
          role: c.role,
          className: c.className,
          status: "sent", // Single Grey Tick
          deliveredAt: null,
          readAt: null,
        };
      }
    });

    const total = recipients.length;
    const readPercentage = total > 0 ? Math.round((readCount / total) * 100) : 0;

    return {
      recipients,
      summary: {
        total,
        read: readCount,
        delivered: deliveredCount,
        offline: offlineCount,
        readPercentage,
      },
    };
  } catch (err) {
    console.error("getNoticeDeliveryDetails error:", err);
    return {
      recipients: [],
      summary: { total: 0, read: 0, delivered: 0, offline: 0, readPercentage: 0 },
    };
  }
}
