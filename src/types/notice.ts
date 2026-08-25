import { Timestamp } from "firebase/firestore";

export type NoticeAudience = "ALL" | "TEACHERS" | "STUDENTS" | "CLASS";
export type NoticeStatus = "active" | "archived";

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
