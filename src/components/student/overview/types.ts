/**
 * Phase 3 Today Overview Data Contracts (Section 24)
 */

export interface AttendanceOverviewData {
  presentDays: number;
  totalDays: number;
  percentage: number;
}

export type FeeStatus = "pending" | "partially_paid" | "fully_paid" | "no_dues";

export interface FeesOverviewData {
  dueAmount: number; // Integer rupees (e.g. 1500)
  status: FeeStatus;
  dueMonth?: string; // e.g. "August"
}

export interface HomeworkOverviewData {
  pendingCount: number;
  dueTodayCount?: number;
}

export interface ExamInfo {
  id?: string;
  name: string; // e.g. "Unit Test"
  subject: string; // e.g. "Science"
  date: string; // "YYYY-MM-DD"
}

export interface ExamOverviewData {
  nextExam?: ExamInfo;
}

export interface TodayOverviewData {
  attendance?: AttendanceOverviewData;
  fees?: FeesOverviewData;
  homework?: HomeworkOverviewData;
  exams?: ExamOverviewData;
}

export interface TodayOverviewProps {
  data?: TodayOverviewData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAttendanceClick?: () => void;
  onFeesClick?: () => void;
  onHomeworkClick?: () => void;
  onExamsClick?: () => void;
}
