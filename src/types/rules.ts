import { Timestamp } from "firebase/firestore";

export type FineRewardType = "fine" | "reward" | "bonus" | "adjustment" | "recognition";
export type FineRewardStatus = "pending" | "approved" | "applied" | "waived";

export interface TeacherFineReward {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  type: FineRewardType;
  amount?: number; // Financial impact in INR
  reason: string;
  date: string; // YYYY-MM-DD
  remarks?: string;
  status: FineRewardStatus;
  ruleId?: string; // Linkage to SchoolRule if triggered by rule
  ruleTitle?: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

export type RuleTarget = "students" | "teachers" | "staff" | "all";
export type RuleCategory = "attendance" | "discipline" | "performance" | "homework" | "general";
export type RuleActionType = "fine" | "reward" | "warning" | "recognition";

export interface SchoolRule {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  appliesTo: RuleTarget;
  category: RuleCategory;
  actionType: RuleActionType;
  amount?: number; // e.g. ₹100 fine, ₹500 reward
  triggerCondition?: string; // e.g. "late_attendance_count > 3"
  requiresApproval: boolean; // default true: requires explicit review before financial deduction
  activeDate: string; // YYYY-MM-DD
  status: "active" | "inactive";
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
}

export interface RuleApplication {
  id: string;
  schoolId: string;
  ruleId: string;
  ruleTitle: string;
  targetUserId: string;
  targetUserName: string;
  targetRole: string;
  detectedDate: string;
  reason: string;
  proposedAction: RuleActionType;
  amount?: number;
  status: "pending_review" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  createdAt: any;
}

export interface TeacherAuditLog {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  action: string;
  details: string;
  oldValue?: any;
  newValue?: any;
  actorUid: string;
  actorName: string;
  actorRole: string;
  timestamp: any;
}
