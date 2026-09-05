import { Timestamp } from "firebase/firestore";
import { SchoolStatus } from "./school";

export type SchoolHealthStatus = "healthy" | "low_activity" | "inactive";

export type GrowthTimeframe = "7d" | "30d" | "90d" | "12m";

export type AnalyticsDatePreset = "today" | "7d" | "30d" | "this_month" | "this_year" | "custom";

export interface AnalyticsFilterState {
  preset: AnalyticsDatePreset;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
  planId?: string;
  role?: string;
  feature?: string;
}

export interface SchoolHealthSummary {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  status: SchoolStatus | "active" | "inactive";
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
  status: SchoolStatus | "active" | "inactive";
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

// -------------------------------------------------------------
// NEW: PLATFORM INTELLIGENCE DATA STRUCTURES
// -------------------------------------------------------------

/** 1. Overview Top 12 KPIs */
export interface PlatformIntelligenceOverview {
  totalSchools: number;
  activeSchools: number;
  newSchools: number;
  totalStudents: number;
  totalTeachers: number;
  activeUsers: number;
  onlineUsers: number; // Active < 15m
  dau: number; // Daily Active Users (past 24h)
  mau: number; // Monthly Active Users (past 30d)
  totalRevenuePaise: number; // Authoritative revenue in paise
  subscriptionCount: number;
  trialSchools: number;
  expiredSubscriptions: number;
}

/** 2. School Intelligence */
export interface SchoolIntelligenceMetrics {
  growth: { date: string; count: number }[];
  activeVsInactive: { active: number; inactive: number; trial: number; suspended: number; expired: number };
  newRegistrations: { id: string; name: string; code: string; plan: string; status: string; createdAt: string; studentCount: number; teacherCount: number }[];
  schoolsByPlan: { planId: string; planName: string; count: number; percentage: number }[];
  schoolsByStatus: { status: string; count: number; percentage: number }[];
  mostActiveSchools: { schoolId: string; schoolName: string; code: string; plan: string; activityCount: number; loginCount: number; activeUserCount: number; lastActivity: string }[];
  inactiveSchools: { schoolId: string; schoolName: string; code: string; plan: string; status: string; daysInactive: number; lastActivity: string }[];
  schoolRatios: { schoolId: string; schoolName: string; students: number; teachers: number; ratio: string }[];
}

/** 3. User & Usage Telemetry */
export interface UserUsageMetrics {
  dau: number;
  mau: number;
  dauMauRatio: number; // percentage
  totalLogins: number;
  failedLogins: number;
  activeSessions: number;
  dailyTrends: { date: string; logins: number; activities: number }[];
  moduleUsage: {
    attendance: number;
    homework: number;
    fees: number;
    notices: number;
    reports: number;
    exams: number;
    timetable: number;
    settings: number;
  };
  deviceBreakdown: { browser: string; count: number }[];
}

/** 4. Plan & Subscriptions */
export interface PlanIntelligenceMetrics {
  schoolsPerPlan: { planId: string; planName: string; count: number; percentage: number; mrrPaise: number }[];
  upgrades: number;
  downgrades: number;
  renewals: number;
  expiringSubscriptions7d: { schoolId: string; schoolName: string; planId: string; expiresAt: string; daysRemaining: number }[];
  expiringSubscriptions30d: { schoolId: string; schoolName: string; planId: string; expiresAt: string; daysRemaining: number }[];
  trialToPaidConversionRate: number; // percentage
  trialConvertedCount: number;
  cancelledCount: number;
  featureUsageByPlan: { planId: string; planName: string; topFeatures: { feature: string; count: number }[] }[];
}

/** 5. Financial Intelligence */
export interface FinancialIntelligenceMetrics {
  grossRevenuePaise: number;
  netRevenuePaise: number;
  estimatedMrrPaise: number;
  successfulPaymentsCount: number;
  successfulPaymentsPaise: number;
  failedPaymentsCount: number;
  failedPaymentsPaise: number;
  refundsCount: number;
  refundsPaise: number;
  discountsPaise: number;
  gstCollectedPaise: number; // 18% statutory tax
  couponUsageCount: number;
  recentTransactions: {
    id: string;
    schoolId: string;
    schoolName?: string;
    amountPaise: number;
    status: string;
    type: string;
    date: string;
    method?: string;
  }[];
}

/** 6. Feature Adoption */
export interface FeatureAdoptionItem {
  featureKey: string;
  featureName: string;
  description: string;
  usageCount: number;
  activeSchoolsCount: number;
  adoptionPercentage: number; // activeSchoolsCount / totalSchools * 100
  trend: "up" | "stable" | "down";
  planBreakdown: { planId: string; usage: number }[];
}

/** Complete Platform Intelligence Response */
export interface PlatformIntelligenceData {
  overview: PlatformIntelligenceOverview;
  schools: SchoolIntelligenceMetrics;
  usage: UserUsageMetrics;
  plans: PlanIntelligenceMetrics;
  finance: FinancialIntelligenceMetrics;
  features: FeatureAdoptionItem[];
  computedAt: string;
  appliedFilter: AnalyticsFilterState;
}
