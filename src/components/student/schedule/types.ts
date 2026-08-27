/**
 * Phase 5 Today's Schedule Data Contracts (Sections 4 & 28)
 */

export type ClassScheduleStatus = "completed" | "current" | "upcoming" | "cancelled";

export interface ScheduleItemData {
  id: string;
  subjectName: string;
  teacherName?: string;
  roomName?: string;
  startTime: string; // "09:00" or "09:00 AM" or ISO string
  endTime: string;   // "09:45" or "09:45 AM" or ISO string
  status?: ClassScheduleStatus;
  isNext?: boolean;
}

export interface TodaysScheduleProps {
  schedule?: ScheduleItemData[];
  isHoliday?: boolean;
  holidayName?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewFullTimetable?: () => void;
}
