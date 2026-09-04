import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  AppNotification,
  CreateNotificationInput,
  UserNotificationView,
} from "@/types/notification";

/**
 * Creates and publishes a live notification in the school's realtime channel.
 * Uses idempotencyKey to strictly eliminate duplicate events.
 */
export async function createNotification(
  schoolId: string,
  input: CreateNotificationInput,
  sender: { uid: string; name: string; role: string }
): Promise<string> {
  if (!schoolId) {
    console.warn("[NotificationService] Cannot create notification: Missing schoolId");
    return "";
  }

  const db = getFirebaseDb();
  if (!db) {
    console.warn("[NotificationService] Database unavailable");
    return "";
  }

  const notificationsColl = collection(db, "schools", schoolId, "notifications");

  // Idempotency check: If an idempotencyKey is supplied, verify it hasn't been posted
  if (input.idempotencyKey) {
    try {
      const q = query(
        notificationsColl,
        where("idempotencyKey", "==", input.idempotencyKey),
        limit(1)
      );
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        console.log(`[NotificationService] Duplicate event prevented for key: ${input.idempotencyKey}`);
        return existingSnap.docs[0].id;
      }
    } catch (err) {
      console.warn("[NotificationService] Idempotency check error (ignoring and proceeding):", err);
    }
  }

  const docRef = doc(notificationsColl);
  const notificationId = docRef.id;

  const newNotification: AppNotification = {
    id: notificationId,
    schoolId,
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type,
    targetAudience: input.targetAudience,
    targetClassId: input.targetClassId || "",
    targetSectionId: input.targetSectionId || "",
    targetUserId: input.targetUserId || "",
    targetUserIds: input.targetUserIds || [],
    senderUid: sender.uid,
    senderName: sender.name,
    senderRole: sender.role,
    link: input.link || "",
    actionLabel: input.actionLabel || "",
    idempotencyKey: input.idempotencyKey || "",
    priority: input.priority || "normal",
    readBy: {},
    createdAt: serverTimestamp(),
    metadata: input.metadata || {},
  };

  await setDoc(docRef, newNotification);
  return notificationId;
}

/**
 * Subscribes in real-time to authoritative notifications for a specific user.
 * Filters notifications according to tenant, user role, class, and audience targeting.
 */
export function subscribeToUserNotifications(
  schoolId: string,
  user: { uid: string; role: string; classId?: string; sectionId?: string },
  callback: (notifications: UserNotificationView[], unreadCount: number) => void
): () => void {
  if (!schoolId || !user.uid) {
    callback([], 0);
    return () => {};
  }

  const db = getFirebaseDb();
  if (!db) {
    callback([], 0);
    return () => {};
  }

  const notificationsColl = collection(db, "schools", schoolId, "notifications");
  const q = query(notificationsColl, orderBy("createdAt", "desc"), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const userViews: UserNotificationView[] = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as AppNotification;
        data.id = docSnap.id;

        // 1. Audience Targeting & Authorization check
        let isEligible = false;

        if (data.targetAudience === "all") {
          isEligible = true;
        } else if (data.targetAudience === "teachers") {
          isEligible =
            user.role === "teacher" ||
            user.role === "school_admin" ||
            user.role === "super_admin";
        } else if (data.targetAudience === "students") {
          isEligible =
            user.role === "student" ||
            user.role === "school_admin" ||
            user.role === "super_admin";
        } else if (data.targetAudience === "staff") {
          isEligible =
            user.role === "teacher" ||
            user.role === "staff" ||
            user.role === "school_admin" ||
            user.role === "super_admin";
        } else if (data.targetAudience === "class") {
          // School Admins and Super Admins can see class-level events for management
          if (user.role === "school_admin" || user.role === "super_admin") {
            isEligible = true;
          } else if (user.role === "student" && user.classId) {
            // Target class must match student's class
            isEligible = data.targetClassId === user.classId;
          }
        } else if (data.targetAudience === "user") {
          isEligible =
            data.targetUserId === user.uid ||
            (Array.isArray(data.targetUserIds) && data.targetUserIds.includes(user.uid)) ||
            user.role === "school_admin" ||
            user.role === "super_admin";
        }

        if (isEligible) {
          const isRead = Boolean(data.readBy && data.readBy[user.uid]);

          // Calculate if item is "LIVE" (posted in last 15 minutes or unread)
          let isLive = !isRead;
          if (data.createdAt) {
            const createdMs =
              typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : new Date(data.createdAt).getTime();

            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            isLive = isLive || createdMs > fifteenMinutesAgo;
          }

          userViews.push({
            ...data,
            isRead,
            isLive,
          });
        }
      });

      const unreadCount = userViews.filter((item) => !item.isRead).length;
      callback(userViews, unreadCount);
    },
    (error) => {
      console.warn("[NotificationService] Realtime listener error:", error);
      callback([], 0);
    }
  );
}

/**
 * Marks a notification as read for a specific user.
 * Preserves the read states of all other users.
 */
export async function markNotificationAsRead(
  schoolId: string,
  notificationId: string,
  userId: string
): Promise<void> {
  if (!schoolId || !notificationId || !userId) return;

  const db = getFirebaseDb();
  if (!db) return;

  const notifRef = doc(db, "schools", schoolId, "notifications", notificationId);
  await updateDoc(notifRef, {
    [`readBy.${userId}`]: true,
  });
}

/**
 * Marks multiple notifications as read for a specific user in a single batch.
 */
export async function markAllNotificationsAsRead(
  schoolId: string,
  userId: string,
  notificationIds: string[]
): Promise<void> {
  if (!schoolId || !userId || !notificationIds.length) return;

  const db = getFirebaseDb();
  if (!db) return;

  const batch = writeBatch(db);
  notificationIds.forEach((id) => {
    const notifRef = doc(db, "schools", schoolId, "notifications", id);
    batch.update(notifRef, {
      [`readBy.${userId}`]: true,
    });
  });

  await batch.commit();
}

/**
 * Deletes a notification (Admin action).
 */
export async function deleteNotification(
  schoolId: string,
  notificationId: string
): Promise<void> {
  if (!schoolId || !notificationId) return;

  const db = getFirebaseDb();
  if (!db) return;

  const notifRef = doc(db, "schools", schoolId, "notifications", notificationId);
  await deleteDoc(notifRef);
}
