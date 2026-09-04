import { Timestamp } from "firebase/firestore";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
  | "all";

export interface ClassBell {
  id: string; // Document ID
  schoolId: string;
  classId: string;
  className: string;
  sectionId?: string; // Optional (or all sections)
  sectionName?: string;
  bellNumber: number; // 1, 2, 3, 4, 5...
  bellName: string; // "Period 1", "Bell 1", "Recess", "Zero Period"
  startTime: string; // "08:00"
  endTime: string; // "08:40"
  subject: string; // "Mathematics", "English", "Break"
  bookName?: string; // "NCERT Ganit Part 1"
  teacherId?: string;
  teacherName?: string;
  dayOfWeek: DayOfWeek;
  isBreak?: boolean;
  order: number;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateClassBellInput {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  bellNumber: number;
  bellName: string;
  startTime: string;
  endTime: string;
  subject: string;
  bookName?: string;
  teacherId?: string;
  teacherName?: string;
  dayOfWeek: DayOfWeek;
  isBreak?: boolean;
}

export interface HomeworkItem {
  id: string; // Document ID
  schoolId: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  bellId?: string; // Optional link to specific timetable bell
  bellNumber?: number;
  subject: string;
  bookName?: string;
  title: string;
  description: string;
  assignedDate: string; // "YYYY-MM-DD"
  dueDate: string; // "YYYY-MM-DD"
  teacherId: string;
  teacherName: string;
  attachmentUrl?: string;
  status: "assigned" | "submitted" | "completed" | "closed";
  createdAt: any;
  updatedAt: any;
}

export interface CreateHomeworkInput {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  bellId?: string;
  bellNumber?: number;
  subject: string;
  bookName?: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  attachmentUrl?: string;
}
