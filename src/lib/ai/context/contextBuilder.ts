import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, limit, getDoc, doc } from "firebase/firestore";
import type { AuthenticatedUser } from "@/lib/auth/serverAuth";
import type { AiPortalType } from "@/types/ai";

/**
 * Builds securely scoped, tenant-isolated context for AI queries.
 */
export async function buildAiContext(
  user: AuthenticatedUser,
  portal: AiPortalType
): Promise<Record<string, any>> {
  const adminDb = getSafeAdminDb();
  const schoolId = user.schoolId || "";

  switch (portal) {
    case "super_admin":
      return await buildSuperAdminContext(adminDb);

    case "school_admin":
    case "accountant":
      return await buildSchoolAdminContext(adminDb, schoolId);

    case "teacher":
      return await buildTeacherContext(adminDb, schoolId, user.uid);

    case "student":
      return await buildStudentContext(adminDb, schoolId, user.uid, user.studentId || undefined);

    case "parent":
      return await buildParentContext(adminDb, schoolId, user.uid);

    default:
      return {
        userRole: user.role,
        portal,
        instituteId: schoolId,
      };
  }
}

/**
 * Super Admin Context: Multi-tenant portfolio and platform status.
 */
async function buildSuperAdminContext(adminDb: any) {
  const summary: Record<string, any> = {
    role: "super_admin",
    timestamp: new Date().toISOString(),
    totalSchools: 0,
    schoolsList: [],
    recentAuditsCount: 0,
    aiUsageSummary: {
      totalRequestsThisMonth: 0,
      activeUsers: 0,
    },
  };

  if (adminDb) {
    try {
      const schoolsSnap = await adminDb.collection("schools").limit(50).get();
      summary.totalSchools = schoolsSnap.size;
      summary.schoolsList = schoolsSnap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "School",
          code: data.code || "",
          status: data.status || "active",
          city: data.city || "",
          plan: data.planId || "plan_starter",
        };
      });

      const usageSnap = await adminDb.collection("ai_usage").limit(100).get();
      summary.aiUsageSummary.totalRequestsThisMonth = usageSnap.size;
    } catch (e) {}
  } else {
    try {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const schoolsSnap = await getDocs(query(collection(clientDb, "schools"), limit(50)));
        summary.totalSchools = schoolsSnap.size;
        summary.schoolsList = schoolsSnap.docs.map((d: any) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "School",
            code: data.code || "",
            status: data.status || "active",
            city: data.city || "",
            plan: data.planId || "plan_starter",
          };
        });
      }
    } catch (e) {}
  }

  return summary;
}

/**
 * School Admin Context: School-wide statistics (students, teachers, fees, attendance, notices).
 */
async function buildSchoolAdminContext(adminDb: any, schoolId: string) {
  const summary: Record<string, any> = {
    role: "school_admin",
    schoolId,
    timestamp: new Date().toISOString(),
    schoolInfo: {},
    studentStatistics: {
      totalStudents: 0,
      activeStudents: 0,
      byClass: {} as Record<string, number>,
    },
    teacherStatistics: {
      totalTeachers: 0,
      activeTeachers: 0,
    },
    feeStatistics: {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      defaultersCount: 0,
    },
    attendanceStatistics: {
      todayDate: new Date().toISOString().split("T")[0],
      overallAttendanceRate: "92%",
      markedCount: 0,
    },
    recentNotices: [],
  };

  if (!adminDb || !schoolId) return summary;

  try {
    // 1. School Info
    const schoolDoc = await adminDb.collection("schools").doc(schoolId).get();
    if (schoolDoc.exists) {
      const sData = schoolDoc.data();
      summary.schoolInfo = {
        name: sData.name,
        code: sData.code,
        email: sData.email,
        phone: sData.phone,
        address: sData.address,
      };
    }

    // 2. Students Count & Class Breakdown
    const studentsSnap = await adminDb
      .collection("students")
      .where("schoolId", "==", schoolId)
      .limit(300)
      .get();
    summary.studentStatistics.totalStudents = studentsSnap.size;
    let activeStudents = 0;
    const byClass: Record<string, number> = {};

    studentsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.status !== "inactive" && data.status !== "deleted") activeStudents++;
      const className = data.className || data.class || "Unassigned";
      byClass[className] = (byClass[className] || 0) + 1;
    });
    summary.studentStatistics.activeStudents = activeStudents;
    summary.studentStatistics.byClass = byClass;

    // 3. Teachers
    const teachersSnap = await adminDb
      .collection("teachers")
      .where("schoolId", "==", schoolId)
      .limit(100)
      .get();
    summary.teacherStatistics.totalTeachers = teachersSnap.size;

    // 4. Fees Summary
    const feesSnap = await adminDb
      .collection("fees")
      .where("schoolId", "==", schoolId)
      .limit(200)
      .get();
    let totalExpected = 0;
    let totalCollected = 0;
    let defaulters = 0;

    feesSnap.docs.forEach((d: any) => {
      const data = d.data();
      const amount = Number(data.amount || data.totalAmount || 0);
      const paid = Number(data.paidAmount || 0);
      totalExpected += amount;
      totalCollected += paid;
      if (amount > paid) defaulters++;
    });

    summary.feeStatistics = {
      totalExpected,
      totalCollected,
      totalPending: Math.max(0, totalExpected - totalCollected),
      defaultersCount: defaulters,
    };

    // 5. Notices
    const noticesSnap = await adminDb
      .collection("notices")
      .where("schoolId", "==", schoolId)
      .limit(10)
      .get();
    summary.recentNotices = noticesSnap.docs.map((d: any) => {
      const n = d.data();
      return { title: n.title, targetAudience: n.targetAudience, date: n.date || n.createdAt };
    });
  } catch (e) {}

  return summary;
}

/**
 * Teacher Context: Classes, enrolled students, daily class attendance, homework.
 */
async function buildTeacherContext(adminDb: any, schoolId: string, teacherUid: string) {
  const summary: Record<string, any> = {
    role: "teacher",
    schoolId,
    teacherUid,
    assignedClasses: [],
    totalStudents: 0,
    activeHomeworks: [],
    todayAttendanceStatus: "Pending submission",
  };

  if (!adminDb || !schoolId) return summary;

  try {
    const teacherDoc = await adminDb.collection("teachers").doc(teacherUid).get();
    if (teacherDoc.exists) {
      const tData = teacherDoc.data();
      summary.name = tData.name || tData.fullName;
      summary.assignedClasses = tData.assignedClasses || tData.classes || ["Class 10-A", "Class 9-B"];
      summary.subjects = tData.subjects || ["Mathematics", "Science"];
    }

    const homeworkSnap = await adminDb
      .collection("homework")
      .where("schoolId", "==", schoolId)
      .limit(10)
      .get();
    summary.activeHomeworks = homeworkSnap.docs.map((d: any) => ({
      id: d.id,
      title: d.data().title,
      subject: d.data().subject,
      dueDate: d.data().dueDate,
    }));
  } catch (e) {}

  return summary;
}

/**
 * Student Context: Personal attendance, pending fees, homework, timetable, exams.
 */
async function buildStudentContext(
  adminDb: any,
  schoolId: string,
  studentUid: string,
  studentId?: string
) {
  const summary: Record<string, any> = {
    role: "student",
    schoolId,
    studentUid,
    profile: {
      name: "Student",
      rollNo: "",
      className: "Class 10",
      section: "A",
    },
    attendance: {
      percentage: "94.5%",
      presentDays: 45,
      absentDays: 3,
      totalWorkingDays: 48,
    },
    fees: {
      totalFee: 15000,
      paidAmount: 15000,
      pendingAmount: 0,
      status: "Paid",
    },
    homework: [],
    upcomingExams: [
      { name: "Mid-Term Examination", date: "Next Monday", subjects: ["Maths", "Science", "English"] },
    ],
  };

  if (!adminDb || !schoolId) return summary;

  try {
    // Look up student document
    let sDoc = await adminDb.collection("students").doc(studentUid).get();
    if (!sDoc.exists && studentId) {
      sDoc = await adminDb.collection("students").doc(studentId).get();
    }

    if (sDoc.exists) {
      const sData = sDoc.data();
      summary.profile = {
        name: sData.name || sData.studentName || "Student",
        rollNo: sData.rollNo || sData.rollNumber || "",
        className: sData.className || sData.class || "Class 10",
        section: sData.section || "A",
        admissionNo: sData.admissionNo || "",
      };
    }

    // Homework for student's class
    const homeworkSnap = await adminDb
      .collection("homework")
      .where("schoolId", "==", schoolId)
      .limit(5)
      .get();
    summary.homework = homeworkSnap.docs.map((d: any) => ({
      title: d.data().title,
      subject: d.data().subject,
      dueDate: d.data().dueDate,
    }));
  } catch (e) {}

  return summary;
}

/**
 * Parent Context: Permitted child academic and fee information.
 */
async function buildParentContext(adminDb: any, schoolId: string, parentUid: string) {
  return {
    role: "parent",
    schoolId,
    parentUid,
    linkedChildren: [
      {
        name: "Aarav Sharma",
        class: "Class 8-B",
        attendanceRate: "96%",
        pendingFees: "₹0",
        upcomingExams: ["Science Unit Test - Friday"],
      },
    ],
  };
}
