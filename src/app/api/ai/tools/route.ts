import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFeeDefaulters } from "@/lib/services/fee-analytics.service";
import { getFeeDashboardSummary } from "@/lib/services/fee-analytics.service";
import { getClassCollectionSummary } from "@/lib/services/fee-analytics.service";
import { paiseToRupees } from "@/lib/services/fee-foundation.service";
import type { AuthenticatedUser } from "@/lib/auth/serverAuth";
import type { AiPortalType } from "@/types/ai";

/**
 * AI Data Tools API
 *
 * Structured server-side tool layer that executes Firestore queries
 * with strict multi-tenant isolation and role-based authorization.
 *
 * The NLP engine maps user intent to one of these tools, then
 * the AI provider synthesizes the final natural-language response from the structured result.
 *
 * NEVER exposes raw Firestore data from another tenant.
 * NEVER returns fabricated/hardcoded placeholder values.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const schoolId = user.schoolId || "";

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID not found for authenticated user", code: "NO_SCHOOL" },
        { status: 400 }
      );
    }

    // 2. Parse tool name and params from request body
    const body = await req.json().catch(() => ({}));
    const { tool, params } = body;

    if (!tool || typeof tool !== "string") {
      return NextResponse.json(
        { error: "Tool name is required. Provide { tool: string, params: object }" },
        { status: 400 }
      );
    }

    // 3. Route to the appropriate tool with authorization checks
    let result: any;

    switch (tool) {
      case "get_student_count":
        result = await toolGetStudentCount(user, schoolId, params || {});
        break;

      case "get_fee_defaulters":
        result = await toolGetFeeDefaulters(user, schoolId, params || {});
        break;

      case "get_fee_collection":
        result = await toolGetFeeCollection(user, schoolId, params || {});
        break;

      case "get_today_attendance":
        result = await toolGetTodayAttendance(user, schoolId, params || {});
        break;

      case "get_class_wise_report":
        result = await toolGetClassWiseReport(user, schoolId, params || {});
        break;

      case "get_fee_overdue":
        result = await toolGetFeeOverdue(user, schoolId, params || {});
        break;

      case "get_overall_summary":
        result = await toolGetOverallSummary(user, schoolId);
        break;

      case "get_student_list":
        result = await toolGetStudentList(user, schoolId, params || {});
        break;

      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[AI Data Tools] Error:", error);
    return NextResponse.json(
      {
        error: "AI Data Tool failed. Your school data is safe.",
        details: error.message || String(error),
        code: "TOOL_ERROR",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

function resolvePortal(user: AuthenticatedUser): AiPortalType {
  switch (user.role) {
    case "super_admin":
      return "super_admin";
    case "admin":
    case "school_admin":
      return "school_admin";
    case "teacher":
      return "teacher";
    case "student":
      return "student";
    case "parent":
      return "parent";
    case "accountant":
      return "accountant";
    default:
      return "school_admin";
  }
}

function checkRoleAccess(user: AuthenticatedUser, allowedRoles: string[]): boolean {
  if (user.role === "super_admin") return true;
  return allowedRoles.includes(user.role);
}

/**
 * Tool: get_student_count
 * Returns accurate total/active student count per class for the authenticated school.
 */
async function toolGetStudentCount(
  user: AuthenticatedUser,
  schoolId: string,
  params: { className?: string; sectionName?: string }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "teacher", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const adminDb = getSafeAdminDb();
  const clientDb = !adminDb ? getFirebaseDb() : null;
  const db = adminDb || clientDb;

  if (!db) {
    return { error: "Database not available", totalStudents: 0, activeStudents: 0, byClass: {} };
  }

  let studentsSnap: any;

  try {
    if (adminDb) {
      studentsSnap = await adminDb
        .collection("students")
        .where("schoolId", "==", schoolId)
        .limit(1000)
        .get();
    } else if (clientDb) {
      const { collection, query, where, limit, getDocs } = await import("firebase/firestore");
      studentsSnap = await getDocs(
        query(collection(clientDb, "students"), where("schoolId", "==", schoolId), limit(1000))
      );
    }
  } catch (e) {
    return { error: "Failed to fetch students", totalStudents: 0, activeStudents: 0, byClass: {} };
  }

  if (!studentsSnap) {
    return { error: "Failed to fetch students", totalStudents: 0, activeStudents: 0, byClass: {} };
  }

  let totalStudents = 0;
  let activeStudents = 0;
  const byClass: Record<string, number> = {};

  studentsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    totalStudents++;

    const status = data.status || "active";
    if (status !== "inactive" && status !== "deleted") {
      activeStudents++;
    }

    const className = data.className || data.class || "Unassigned";
    const sectionName = data.sectionName || data.section || "";
    const classKey = sectionName ? `${className} - ${sectionName}` : className;

    // Apply class/section filter if requested
    if (params.className && className !== params.className) return;
    if (params.sectionName && sectionName !== params.sectionName) return;

    byClass[classKey] = (byClass[classKey] || 0) + 1;
  });

  return {
    totalStudents,
    activeStudents,
    byClass,
  };
}

/**
 * Tool: get_fee_defaulters
 * Returns students with pending/overdue fees for the authenticated school.
 */
async function toolGetFeeDefaulters(
  user: AuthenticatedUser,
  schoolId: string,
  params: {
    className?: string;
    sectionName?: string;
    status?: "CRITICAL" | "OVERDUE" | "DUE_SOON" | "all";
    minOverdueDays?: number;
    limit?: number;
  }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "accountant", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const result = await getFeeDefaulters(schoolId, {
    className: params.className,
    sectionName: params.sectionName,
    status: params.status,
    minOverdueDays: params.minOverdueDays,
    limitCount: params.limit,
  });

  return {
    count: result.count,
    totalOutstandingPaise: result.totalOutstandingPaise,
    totalOutstandingRupees: paiseToRupees(result.totalOutstandingPaise),
    defaulters: result.defaulters.map((d) => ({
      studentId: d.studentId,
      studentName: d.studentName,
      admissionNumber: d.admissionNumber,
      className: d.className,
      sectionName: d.sectionName,
      phone: d.phone,
      fatherName: d.fatherName,
      totalOutstandingPaise: d.totalOutstandingPaise,
      totalOutstandingRupees: d.totalOutstandingRupees,
      oldestDueDate: d.oldestDueDate,
      daysOverdue: d.daysOverdue,
      lastPaymentDate: d.lastPaymentDate,
      status: d.status,
      dueDemandsCount: d.dueDemandsCount,
      unpaidDemands: d.unpaidDemands,
    })),
  };
}

/**
 * Tool: get_fee_collection
 * Returns fee collection summary including today's collection and monthly trends.
 */
async function toolGetFeeCollection(
  user: AuthenticatedUser,
  schoolId: string,
  params: {
    month?: string;
    className?: string;
    sectionName?: string;
    academicYearId?: string;
  }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "accountant", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const summary = await getFeeDashboardSummary(schoolId, {
    academicYearId: params.academicYearId,
    month: params.month,
    className: params.className,
    sectionName: params.sectionName,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayCollectionPaise = summary.recentCollections
    .filter((p) => p.paymentDate?.slice(0, 10) === today)
    .reduce((sum, p) => sum + (p.allocatedTotalPaise || 0), 0);

  const todayPaymentsCount = summary.recentCollections.filter(
    (p) => p.paymentDate?.slice(0, 10) === today
  ).length;

  return {
    totalExpectedPaise: summary.totalExpectedPaise,
    totalExpectedRupees: summary.totalExpectedRupees,
    totalCollectedPaise: summary.totalCollectedPaise,
    totalCollectedRupees: summary.totalCollectedRupees,
    totalOutstandingPaise: summary.totalOutstandingPaise,
    totalOutstandingRupees: summary.totalOutstandingRupees,
    totalRefundedPaise: summary.totalRefundedPaise,
    totalRefundedRupees: summary.totalRefundedRupees,
    netCollectedPaise: summary.netCollectedPaise,
    netCollectedRupees: summary.netCollectedRupees,
    collectionRate: summary.collectionRate,
    recoveryPercentage: summary.collectionRate,
    todayCollectionPaise,
    todayCollectionRupees: paiseToRupees(todayCollectionPaise),
    todayPaymentsCount,
    totalDemandsCount: summary.totalDemandsCount,
    paidDemandsCount: summary.paidDemandsCount,
    partialDemandsCount: summary.partialDemandsCount,
    overdueDemandsCount: summary.overdueDemandsCount,
    defaultersCount: summary.defaultersCount,
    totalTransactionsCount: summary.totalTransactionsCount,
    collectionTrend: summary.collectionTrend.map((t) => ({
      monthName: t.monthName,
      periodKey: t.periodKey,
      sequence: t.sequence,
      expectedPaise: t.expectedPaise,
      collectedPaise: t.collectedPaise,
      outstandingPaise: t.outstandingPaise,
      expectedRupees: t.expectedRupees,
      collectedRupees: t.collectedRupees,
      outstandingRupees: t.outstandingRupees,
      collectionRate: t.collectionRate,
    })),
    paymentMethodSummary: summary.paymentMethodSummary,
    paymentFollowUp: summary.paymentFollowUp,
    recentCollections: summary.recentCollections.slice(0, 10).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: p.studentName,
      admissionNumber: p.admissionNumber,
      className: p.className,
      sectionName: p.sectionName,
      amountPaise: p.amountPaise,
      amountRupees: paiseToRupees(p.amountPaise),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      collectedByName: p.collectedByName,
    })),
  };
}

/**
 * Tool: get_today_attendance
 * Returns today's attendance summary for the authenticated school.
 */
async function toolGetTodayAttendance(
  user: AuthenticatedUser,
  schoolId: string,
  params: {
    className?: string;
    sectionName?: string;
    classId?: string;
    sectionId?: string;
  }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "teacher", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const adminDb = getSafeAdminDb();
  const clientDb = !adminDb ? getFirebaseDb() : null;
  const db = adminDb || clientDb;

  if (!db) {
    return { error: "Database not available", date: null, present: 0, absent: 0, late: 0, total: 0, rate: 0, records: [] };
  }

  const today = new Date().toISOString().slice(0, 10);

  let q: any;
  if (adminDb) {
    q = adminDb
      .collection("attendance")
      .where("schoolId", "==", schoolId)
      .where("date", "==", today);
  } else if (clientDb) {
    const { collection, query, where } = await import("firebase/firestore");
    const constraints: any[] = [
      where("schoolId", "==", schoolId),
      where("date", "==", today),
    ];
    q = query(collection(clientDb, "attendance"), ...constraints);
  }

  if (!q) {
    return { error: "Database not available", date: today, present: 0, absent: 0, late: 0, total: 0, rate: 0, records: [] };
  }

  let snap: any;
  try {
    snap = await q.get();
  } catch (e) {
    return { error: "Failed to fetch attendance", date: today, present: 0, absent: 0, late: 0, total: 0, rate: 0, records: [] };
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  let total = 0;
  const records: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    status: string;
  }> = [];

  snap.docs.forEach((doc: any) => {
    const data = doc.data();
    total++;

    if (params.className && data.className !== params.className) return;
    if (params.sectionName && data.sectionName !== params.sectionName) return;
    if (params.classId && data.classId !== params.classId) return;
    if (params.sectionId && data.sectionId !== params.sectionId) return;

    const status = (data.status || "PRESENT").toUpperCase();
    if (status === "PRESENT") present++;
    else if (status === "ABSENT") absent++;
    else if (status === "LATE") late++;

    records.push({
      studentId: data.studentId || "",
      studentName: data.studentName || "",
      admissionNumber: data.admissionNumber || "",
      className: data.className || "",
      sectionName: data.sectionName || "",
      status: status,
    });
  });

  const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

  return {
    date: today,
    present,
    absent,
    late,
    total,
    rate,
    records,
  };
}

/**
 * Tool: get_class_wise_report
 * Returns class-wise fee collection / outstanding breakdown.
 */
async function toolGetClassWiseReport(
  user: AuthenticatedUser,
  schoolId: string,
  params: { academicYearId?: string; month?: string }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "accountant", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const summary = await getFeeDashboardSummary(schoolId, {
    academicYearId: params.academicYearId,
    month: params.month,
  });

  // Get class-wise collection summary
  const classSummary = await getClassCollectionSummary(schoolId, {
    academicYearId: params.academicYearId,
    month: params.month,
  });

  return {
    collectionTrend: summary.collectionTrend,
    classCollection: classSummary.map((c) => ({
      className: c.className,
      studentCount: c.studentCount,
      expectedPaise: c.expectedPaise,
      expectedRupees: c.expectedRupees,
      collectedPaise: c.collectedPaise,
      collectedRupees: c.collectedRupees,
      outstandingPaise: c.outstandingPaise,
      outstandingRupees: c.outstandingRupees,
      collectionRate: c.collectionRate,
      paidStudentsCount: c.paidStudentsCount,
      partialStudentsCount: c.partialStudentsCount,
      dueStudentsCount: c.dueStudentsCount,
    })),
    feeHeadCollection: [],
  };
}

/**
 * Tool: get_fee_overdue
 * Returns students with overdue fees specifically.
 */
async function toolGetFeeOverdue(
  user: AuthenticatedUser,
  schoolId: string,
  params: { className?: string; sectionName?: string; limit?: number }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "accountant", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  const result = await getFeeDefaulters(schoolId, {
    className: params.className,
    sectionName: params.sectionName,
    status: "OVERDUE",
    limitCount: params.limit,
    sortBy: "oldestDue",
  });

  return {
    count: result.count,
    totalOutstandingPaise: result.totalOutstandingPaise,
    totalOutstandingRupees: paiseToRupees(result.totalOutstandingPaise),
    students: result.defaulters.map((d) => ({
      studentId: d.studentId,
      studentName: d.studentName,
      admissionNumber: d.admissionNumber,
      className: d.className,
      sectionName: d.sectionName,
      totalOutstandingPaise: d.totalOutstandingPaise,
      totalOutstandingRupees: d.totalOutstandingRupees,
      oldestDueDate: d.oldestDueDate,
      daysOverdue: d.daysOverdue,
      status: d.status,
    })),
  };
}

/**
 * Tool: get_overall_summary
 * Returns aggregated school summary metrics.
 */
async function toolGetOverallSummary(user: AuthenticatedUser, schoolId: string) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "teacher", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  // Student count
  const studentCount = await toolGetStudentCount(user, schoolId, {});

  // Fee dashboard summary
  let feeData: any = {};
  try {
    feeData = await getFeeDashboardSummary(schoolId);
  } catch (e) {
    // Fee data not available
  }

  // Today's attendance
  let attendanceData: any = {};
  try {
    const today = new Date().toISOString().slice(0, 10);
    const db = getSafeAdminDb() || getFirebaseDb();
    if (db) {
      const todaySnap = await toolGetTodayAttendance(user, schoolId, {});
      attendanceData = todaySnap;
    }
  } catch (e) {
    // Attendance data not available
  }

  return {
    schoolId,
    studentStatistics: {
      totalStudents: studentCount.totalStudents,
      activeStudents: studentCount.activeStudents,
      byClass: studentCount.byClass,
    },
    feeStatistics: {
      totalExpectedPaise: feeData.totalExpectedPaise || 0,
      totalExpectedRupees: feeData.totalExpectedRupees || 0,
      totalCollectedPaise: feeData.totalCollectedPaise || 0,
      totalCollectedRupees: feeData.totalCollectedRupees || 0,
      totalOutstandingPaise: feeData.totalOutstandingPaise || 0,
      totalOutstandingRupees: feeData.totalOutstandingRupees || 0,
      collectionRate: feeData.collectionRate || 0,
      todayCollectionPaise: feeData.todayCollectionPaise || 0,
      todayCollectionRupees: feeData.todayCollectionRupees || 0,
      todayPaymentsCount: feeData.todayPaymentsCount || 0,
      defaultersCount: feeData.defaultersCount || 0,
      paidDemandsCount: feeData.paidDemandsCount || 0,
      partialDemandsCount: feeData.partialDemandsCount || 0,
      overdueDemandsCount: feeData.overdueDemandsCount || 0,
    },
    attendanceStatistics: {
      date: attendanceData.date || new Date().toISOString().slice(0, 10),
      present: attendanceData.present || 0,
      absent: attendanceData.absent || 0,
      late: attendanceData.late || 0,
      total: attendanceData.total || 0,
      rate: attendanceData.rate || 0,
    },
  };
}

/**
 * Tool: get_student_list
 * Returns students with pending fees (alias for defaulters with student details).
 */
async function toolGetStudentList(
  user: AuthenticatedUser,
  schoolId: string,
  params: {
    className?: string;
    sectionName?: string;
    status?: "pending_fees" | "all";
    limit?: number;
  }
) {
  if (!checkRoleAccess(user, ["admin", "school_admin", "teacher", "super_admin"])) {
    throw new Error("ACCESS_DENIED");
  }

  if (params.status === "pending_fees") {
    // Return students with pending fees
    const result = await getFeeDefaulters(schoolId, {
      className: params.className,
      sectionName: params.sectionName,
      limitCount: params.limit || 50,
    });

    return {
      type: "pending_fees",
      count: result.count,
      totalOutstandingPaise: result.totalOutstandingPaise,
      totalOutstandingRupees: paiseToRupees(result.totalOutstandingPaise),
      students: result.defaulters.map((d) => ({
        studentId: d.studentId,
        studentName: d.studentName,
        admissionNumber: d.admissionNumber,
        className: d.className,
        sectionName: d.sectionName,
        fatherName: d.fatherName,
        phone: d.phone,
        totalOutstandingPaise: d.totalOutstandingPaise,
        totalOutstandingRupees: d.totalOutstandingRupees,
        daysOverdue: d.daysOverdue,
        status: d.status,
      })),
    };
  }

  // Return all active students
  const countData = await toolGetStudentCount(user, schoolId, {});
  return {
    type: "all",
    ...countData,
  };
}

/**
 * Executes a tool locally (within the same process / serverless function).
 * Used by the AI chat route to avoid an extra HTTP round-trip.
 * Enforces the same auth & tenant isolation as the HTTP endpoint.
 */
export async function executeToolLocally(
  toolCall: { tool: string; params: Record<string, any> },
  user: AuthenticatedUser,
  schoolId: string
): Promise<{ data: any; error?: string }> {
  const { tool, params } = toolCall;

  try {
    let result: any;

    switch (tool) {
      case "get_student_count":
        result = await toolGetStudentCount(user, schoolId, params || {});
        break;

      case "get_fee_defaulters":
        result = await toolGetFeeDefaulters(user, schoolId, params || {});
        break;

      case "get_fee_collection":
        result = await toolGetFeeCollection(user, schoolId, params || {});
        break;

      case "get_today_attendance":
        result = await toolGetTodayAttendance(user, schoolId, params || {});
        break;

      case "get_class_wise_report":
        result = await toolGetClassWiseReport(user, schoolId, params || {});
        break;

      case "get_fee_overdue":
        result = await toolGetFeeOverdue(user, schoolId, params || {});
        break;

      case "get_overall_summary":
        result = await toolGetOverallSummary(user, schoolId);
        break;

      case "get_student_list":
        result = await toolGetStudentList(user, schoolId, params || {});
        break;

      default:
        return { data: null, error: `Unknown tool: ${tool}` };
    }

    return { data: result };
  } catch (err: any) {
    return { data: null, error: err.message || "Tool execution failed" };
  }
}
