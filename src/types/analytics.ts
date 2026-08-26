import { Timestamp } from "firebase/firestore";

export type SchoolHealthStatus = "healthy" | "low_activity" | "inactive";

export type GrowthTimeframe = "7d" | "30d" | "90d" | "12m";

export interface SchoolHealthSummary {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  status: "active" | "inactive";
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeUsers: number;
  lastLogin: Timestamp | null;
  lastActivity: Timestamp | null;
  health: SchoolHealthStatus;
  healthReason: string;
}

export interface PlatformGrowthMetrics {
  timeframe: GrowthTimeframe;
  schoolsGrown: number;
  studentsGrown: number;
  teachersGrown: number;
  totalUsersGrown: number;
}

export interface PlatformAnalyticsOverview {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeUsers: number;
  growth: Record<GrowthTimeframe, PlatformGrowthMetrics>;
  schoolHealthList: SchoolHealthSummary[];
}

export interface SchoolDetailedAnalytics {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  status: "active" | "inactive";
  adminEmail?: string;
  studentCount: number;
  teacherCount: number;
  adminCount: number;
  classCount: number;
  sectionCount: number;
  attendanceRate: number; // percentage (e.g. 92.5)
  totalAttendanceRecords: number;
  activeUsers: number;
  disabledUsers: number;
  lastLogin: Timestamp | null;
  lastActivity: Timestamp | null;
  health: SchoolHealthStatus;
  healthReason: string;
  recentLogins: any[];
  recentActivities: any[];
}
