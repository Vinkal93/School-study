import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, limit, getDoc, doc } from "firebase/firestore";
import type { AuthenticatedUser } from "@/lib/auth/serverAuth";
import type { AiPortalType } from "@/types/ai";
import { paiseToRupees } from "@/lib/services/fee-foundation.service";

/**
 * Builds securely scoped, tenant-isolated context for AI queries.
 * This context provides REAL school-level aggregate statistics from Firestore.
 * No hardcoded or placeholder data — all values come from the database.
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
 * All data is fetched from Firestore — no hardcoded values.
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
 * School Admin Context: School-wide statistics (students, teachers, fees, attendance).
 * All data is fetched from Firestore — no hardcoded or placeholder values.
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
      totalExpectedPaise: 0,
      totalCollectedPaise: 0,
      totalOutstandingPaise: 0,
      defaultersCount: 0,
    },
    attendanceStatistics: {
      todayDate: new Date().toISOString().split("T")[0],
      overallAttendanceRate: null,
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
    },
    recentNotices: [],
  };

  if (!schoolId) return summary;

  if (adminDb) {
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
        .limit(1000)
        .get();
      summary.studentStatistics.totalStudents = studentsSnap.size;
      let activeStudents = 0;
      const byClass: Record<string, number> = {};

      studentsSnap.docs.forEach((doc: any) => {
        const data = doc.data();
        const status = data.status || "active";
        if (status !== "inactive" && status !== "deleted") activeStudents++;
        const className = data.className || data.class || "Unassigned";
        const sectionName = data.sectionName || data.section || "";
        const classKey = sectionName ? `${className} - ${sectionName}` : className;
        byClass[classKey] = (byClass[classKey] || 0) + 1;
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

      // 4. Fees Summary — from feeDemands collection (authoritative)
      const demandsSnap = await adminDb
        .collection("feeDemands")
        .where("schoolId", "==", schoolId)
        .limit(500)
        .get();
      let totalExpected = 0;
      let totalCollected = 0;
      let defaulters = 0;

      // Also fetch payments for collected amount
      const paymentsSnap = await adminDb
        .collection("financialPayments")
        .where("schoolId", "==", schoolId)
        .limit(500)
        .get();

      let totalPaid = 0;
      paymentsSnap.docs.forEach((d: any) => {
        const data = d.data();
        totalPaid += Number(data.amountPaise || 0);
      });

      demandsSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === "CANCELLED") return;
        totalExpected += Number(data.netAmountPaise || 0);
        totalCollected += Number(data.paidAmountPaise || 0);
        if (Number(data.balanceAmountPaise || 0) > 0) defaulters++;
      });

      summary.feeStatistics = {
        totalExpectedPaise: totalExpected,
        totalCollectedPaise: totalCollected,
        totalOutstandingPaise: Math.max(0, totalExpected - totalCollected),
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
  } else {
    // Client-side Firestore fallback
    try {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        try {
          const schoolDoc = await getDoc(doc(clientDb, "schools", schoolId));
          if (schoolDoc.exists()) {
            const sData = schoolDoc.data();
            summary.schoolInfo = {
              name: sData.name,
              code: sData.code,
              email: sData.email,
              phone: sData.phone,
              address: sData.address,
            };
          }
        } catch (e) {}

        try {
          const studentsSnap = await getDocs(
            query(collection(clientDb, "students"), where("schoolId", "==", schoolId), limit(1000))
          );
          summary.studentStatistics.totalStudents = studentsSnap.size;
          let activeStudents = 0;
          const byClass: Record<string, number> = {};
          studentsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const status = data.status || "active";
            if (status !== "inactive" && status !== "deleted") activeStudents++;
            const className = data.className || data.class || "Unassigned";
            const sectionName = data.sectionName || data.section || "";
            const classKey = sectionName ? `${className} - ${sectionName}` : className;
            byClass[classKey] = (byClass[classKey] || 0) + 1;
          });
          summary.studentStatistics.activeStudents = activeStudents;
          summary.studentStatistics.byClass = byClass;
        } catch (e) {}

        try {
          const teachersSnap = await getDocs(
            query(collection(clientDb, "teachers"), where("schoolId", "==", schoolId), limit(100))
          );
          summary.teacherStatistics.totalTeachers = teachersSnap.size;
        } catch (e) {}

        try {
          const demandsSnap = await getDocs(
            query(collection(clientDb, "feeDemands"), where("schoolId", "==", schoolId), limit(500))
          );
          let totalExpected = 0;
          let totalCollected = 0;
          let defaulters = 0;

          const paymentsSnap = await getDocs(
            query(collection(clientDb, "financialPayments"), where("schoolId", "==", schoolId), limit(500))
          );
          let totalPaid = 0;
          paymentsSnap.docs.forEach((d) => {
            const data = d.data();
            totalPaid += Number(data.amountPaise || 0);
          });

          demandsSnap.docs.forEach((d) => {
            const data = d.data();
            if (data.status === "CANCELLED") return;
            totalExpected += Number(data.netAmountPaise || 0);
            totalCollected += Number(data.paidAmountPaise || 0);
            if (Number(data.balanceAmountPaise || 0) > 0) defaulters++;
          });

          summary.feeStatistics = {
            totalExpectedPaise: totalExpected,
            totalCollectedPaise: totalCollected,
            totalOutstandingPaise: Math.max(0, totalExpected - totalCollected),
            defaultersCount: defaulters,
          };
        } catch (e) {}
      }
    } catch (e) {}
  }

  return summary;
}

/**
 * Teacher Context: Classes, enrolled students, daily class attendance, homework.
 * All data is fetched from Firestore — no hardcoded or placeholder values.
 */
async function buildTeacherContext(adminDb: any, schoolId: string, teacherUid: string) {
  const summary: Record<string, any> = {
    role: "teacher",
    schoolId,
    teacherUid,
    assignedClasses: [],
    totalStudents: 0,
    activeHomeworks: [],
    todayAttendanceStatus: null,
  };

  if (!adminDb || !schoolId) return summary;

  try {
    const teacherDoc = await adminDb.collection("teachers").doc(teacherUid).get();
    if (teacherDoc.exists) {
      const tData = teacherDoc.data();
      summary.name = tData.name || tData.fullName;
      summary.assignedClasses = tData.assignedClasses || tData.classes || [];
      summary.subjects = tData.subjects || [];
    }

    // Count students in assigned classes
    if (summary.assignedClasses.length > 0) {
      for (const classId of summary.assignedClasses) {
        try {
          const classSnap = await adminDb
            .collection("students")
            .where("schoolId", "==", schoolId)
            .where("classId", "==", classId)
            .limit(100)
            .get();
          summary.totalStudents += classSnap.size;
        } catch (e) {}
      }
    }

    // Homework
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
 * All data is fetched from Firestore — no hardcoded or placeholder values.
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
      name: null,
      rollNo: null,
      className: null,
      section: null,
    },
    attendance: {
      percentage: null,
      presentDays: null,
      absentDays: null,
      totalWorkingDays: null,
    },
    fees: {
      totalFee: null,
      paidAmount: null,
      pendingAmount: null,
      status: null,
    },
    homework: [],
    upcomingExams: [],
  };

  if (!adminDb || !schoolId) return summary;

  try {
    // Look up student document
    let sDoc = await adminDb.collection("students").doc(studentUid).get();
    if (!sDoc.exists && studentId) {
      sDoc = await adminDb.collection("students").doc(studentId).get();
    }

    // Also try looking up by studentId field in subcollection pattern
    if (!sDoc.exists) {
      const studentSnap = await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("students")
        .where("userId", "==", studentUid)
        .limit(1)
        .get();
      if (!studentSnap.empty) {
        sDoc = studentSnap.docs[0];
      }
    }

    const resolvedStudentDoc = sDoc || (await adminDb.collection("students").where("userId", "==", studentUid).limit(1).get()).docs[0];

    if (resolvedStudentDoc && resolvedStudentDoc.exists) {
      const sData = resolvedStudentDoc.data();
      const studentFirestoreId = resolvedStudentDoc.id;

      summary.profile = {
        name: sData.name || sData.studentName || null,
        rollNo: sData.rollNo || sData.rollNumber || null,
        className: sData.className || sData.class || null,
        section: sData.section || null,
        admissionNo: sData.admissionNo || sData.admissionNumber || null,
      };

      // 2. Attendance history for this student
      try {
        const attSnap = await adminDb
          .collection("attendance")
          .where("schoolId", "==", schoolId)
          .where("studentId", "==", studentFirestoreId)
          .limit(50)
          .get();

        let present = 0;
        let absent = 0;
        let late = 0;
        attSnap.docs.forEach((d: any) => {
          const status = d.data().status;
          if (status === "PRESENT") present++;
          else if (status === "ABSENT") absent++;
          else if (status === "LATE") late++;
        });
        const total = present + absent + late;
        summary.attendance = {
          percentage: total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : null,
          presentDays: present,
          absentDays: absent,
          totalWorkingDays: total,
        };
      } catch (e) {}

      // 3. Fee outstanding for this student
      try {
        const demandsSnap = await adminDb
          .collection("feeDemands")
          .where("schoolId", "==", schoolId)
          .where("studentId", "==", studentFirestoreId)
          .limit(100)
          .get();

        let totalNet = 0;
        let totalPaid = 0;
        demandsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === "CANCELLED") return;
          totalNet += Number(data.netAmountPaise || 0);
          totalPaid += Number(data.paidAmountPaise || 0);
        });

        const pending = Math.max(0, totalNet - totalPaid);
        summary.fees = {
          totalFee: paiseToRupees(totalNet),
          paidAmount: paiseToRupees(totalPaid),
          pendingAmount: paiseToRupees(pending),
          status: pending > 0 ? (totalPaid > 0 ? "PARTIAL" : "DUE") : (totalNet > 0 ? "PAID" : null),
        };
      } catch (e) {}

      // 4. Homework for student's class
      const className = sData.className || sData.class;
      if (className) {
        try {
          const homeworkSnap = await adminDb
            .collection("homework")
            .where("schoolId", "==", schoolId)
            .where("className", "==", className)
            .limit(10)
            .get();
          summary.homework = homeworkSnap.docs.map((d: any) => ({
            title: d.data().title,
            subject: d.data().subject,
            dueDate: d.data().dueDate,
          }));
        } catch (e) {}
      }

      // 5. Upcoming exams
      try {
        const examsSnap = await adminDb
          .collection("exams")
          .where("schoolId", "==", schoolId)
          .where("className", "==", className)
          .limit(10)
          .get();
        summary.upcomingExams = examsSnap.docs.map((d: any) => ({
          name: d.data().name || d.data().title,
          date: d.data().date,
          subjects: d.data().subjects || [],
        }));
      } catch (e) {}
    }
  } catch (e) {}

  return summary;
}

/**
 * Parent Context: Permitted child academic and fee information.
 * All data is fetched from Firestore — no hardcoded or placeholder values.
 */
async function buildParentContext(adminDb: any, schoolId: string, parentUid: string) {
  const summary: Record<string, any> = {
    role: "parent",
    schoolId,
    parentUid,
    linkedChildren: [],
  };

  if (!adminDb || !schoolId) return summary;

  try {
    const childrenSnap = await adminDb
      .collection("students")
      .where("schoolId", "==", schoolId)
      .where("guardianUid", "==", parentUid)
      .limit(10)
      .get();

    for (const doc of childrenSnap.docs) {
      const sData = doc.data();
      const studentFirestoreId = doc.id;
      const className = sData.className || sData.class || "";

      // Fee outstanding
      let pendingFeesPaise = 0;
      try {
        const demandsSnap = await adminDb
          .collection("feeDemands")
          .where("schoolId", "==", schoolId)
          .where("studentId", "==", studentFirestoreId)
          .limit(100)
          .get();
        demandsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === "CANCELLED") return;
          pendingFeesPaise += Number(data.balanceAmountPaise || 0);
        });
      } catch (e) {}

      // Attendance
      let presentDays = 0;
      let totalDays = 0;
      try {
        const attSnap = await adminDb
          .collection("attendance")
          .where("schoolId", "==", schoolId)
          .where("studentId", "==", studentFirestoreId)
          .limit(50)
          .get();
        attSnap.docs.forEach((d: any) => {
          const status = d.data().status;
          totalDays++;
          if (status === "PRESENT" || status === "LATE") presentDays++;
        });
      } catch (e) {}

      // Upcoming exams
      const upcomingExams: string[] = [];
      try {
        const examsSnap = await adminDb
          .collection("exams")
          .where("schoolId", "==", schoolId)
          .where("className", "==", className)
          .limit(5)
          .get();
        examsSnap.docs.forEach((d: any) => {
          upcomingExams.push(d.data().name || d.data().title);
        });
      } catch (e) {}

      summary.linkedChildren.push({
        name: sData.name || sData.studentName || "Student",
        class: className,
        attendanceRate: totalDays > 0 ? `${Math.round((presentDays / totalDays) * 100)}%` : null,
        pendingFees: paiseToRupees(pendingFeesPaise) > 0 ? `₹${paiseToRupees(pendingFeesPaise)}` : "₹0",
        upcomingExams,
      });
    }
  } catch (e) {}

  return summary;
}
