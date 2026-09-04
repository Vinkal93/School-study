/**
 * REALTIME NOTIFICATION & LIVE EVENT DATA CONTRACTS
 */

export type NotificationEventType =
  | "notice"
  | "homework"
  | "rule"
  | "timetable"
  | "event"
  | "fine_reward"
  | "general";

export type NotificationAudience =
  | "all"
  | "teachers"
  | "students"
  | "staff"
  | "class"
  | "user";

export type NotificationPriority = "normal" | "high" | "urgent";

export interface AppNotification {
  id: string;
  schoolId: string;
  title: string;
  message: string;
  type: NotificationEventType;
  targetAudience: NotificationAudience;
  targetClassId?: string;
  targetSectionId?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  senderUid: string;
  senderName: string;
  senderRole: string;
  link?: string;
  actionLabel?: string;
  idempotencyKey?: string;
  priority?: NotificationPriority;
  readBy?: Record<string, boolean>; // map of uid -> true
  createdAt: any; // Firestore Timestamp | ISO string
  metadata?: Record<string, any>;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type: NotificationEventType;
  targetAudience: NotificationAudience;
  targetClassId?: string;
  targetSectionId?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  link?: string;
  actionLabel?: string;
  idempotencyKey?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface UserNotificationView extends AppNotification {
  isRead: boolean;
  isLive: boolean; // Received within last 15 minutes or unread
}
