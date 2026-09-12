import { Timestamp } from "firebase/firestore";

export type NoticeAudience = "ALL" | "TEACHERS" | "STUDENTS" | "CLASS";
export type NoticeStatus = "active" | "archived";
export type NoticeTickStatus = "sent" | "delivered" | "read";

export interface NoticeRecipientStatus {
  userId: string;
  name: string;
  email?: string;
  role: "student" | "teacher";
  className?: string;
  status: NoticeTickStatus; // "sent" = single tick, "delivered" = double grey, "read" = double blue
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface Notice {
  id: string;
  schoolId: string;
  title: string;
  message: string;
  audience: NoticeAudience;
  classId?: string; // Set when audience === "CLASS"
  className?: string;
  date: string; // "YYYY-MM-DD"
  createdBy: string; // Admin UID
  createdByName?: string;
  status: NoticeStatus;
  readBy?: Record<string, string>; // userId -> readAt ISO string
  deliveredTo?: Record<string, string>; // userId -> deliveredAt ISO string
  readCount?: number;
  deliveredCount?: number;
  recipientCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateNoticeInput {
  title: string;
  message: string;
  audience: NoticeAudience;
  classId?: string;
  className?: string;
  date?: string;
}
