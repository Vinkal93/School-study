import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type {
  AppUser,
  School,
  PlatformAnalyticsOverview,
  SchoolDetailedAnalytics,
  SchoolHealthSummary,
  SchoolHealthStatus,
  GrowthTimeframe,
  PlatformGrowthMetrics,
  AuditLogEntry,
  LoginLogEntry,
  ActivityLogEntry,
  TeacherProfile,
  StudentProfile,
} from "@/types";

/**
 * Computes Platform Analytics directly on the client using the active Super Admin Auth session.
 */
export async function fetchPlatformAnalytics(): Promise<PlatformAnalyticsOverview> {
  const db = getFirebaseDb();

  const [schoolsSnap, usersSnap, loginLogsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.SCHOOLS)),
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(
      query(
        collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
        orderBy("timestamp", "desc"),
        firestoreLimit(100)
      )
    ),
  ]);

  const schools = schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as School[];
  const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as AppUser[];
  const loginLogs = loginLogsSnap.docs.map((d) => d.data());

  let activeSchools = 0;
  let inactiveSchools = 0;
  schools.forEach((s) => {
    if (s.status === "active") activeSchools++;
    else inactiveSchools++;
  });

  let totalStudents = 0;
  let totalTeachers = 0;
  let totalAdmins = 0;
  let activeUsers = 0;

  users.forEach((u) => {
    if (u.status === "active") activeUsers++;
    if (u.role === "student") totalStudents++;
    else if (u.role === "teacher") totalTeachers++;
    else if (u.role === "school_admin" || u.role === "super_admin") totalAdmins++;
  });

  // Growth calculations
  const now = Date.now();
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const ms90d = 90 * 24 * 60 * 60 * 1000;
  const ms12m = 365 * 24 * 60 * 60 * 1000;

  const computeGrowth = (intervalMs: number, timeframe: GrowthTimeframe): PlatformGrowthMetrics => {
    const thresholdTime = now - intervalMs;
    let schoolsGrown = 0;
    schools.forEach((s) => {
      const createdMs = s.createdAt?.toMillis ? s.createdAt.toMillis() : 0;
      if (createdMs >= thresholdTime) schoolsGrown++;
    });

    let studentsGrown = 0;
    let teachersGrown = 0;
    let totalUsersGrown = 0;

    users.forEach((u) => {
      const createdMs = u.createdAt?.toMillis ? u.createdAt.toMillis() : 0;
      if (createdMs >= thresholdTime) {
        totalUsersGrown++;
        if (u.role === "student") studentsGrown++;
        if (u.role === "teacher") teachersGrown++;
      }
    });

    return { timeframe, schoolsGrown, studentsGrown, teachersGrown, totalUsersGrown };
  };

  const growth: Record<GrowthTimeframe, PlatformGrowthMetrics> = {
    "7d": computeGrowth(ms7d, "7d"),
    "30d": computeGrowth(ms30d, "30d"),
    "90d": computeGrowth(ms90d, "90d"),
    "12m": computeGrowth(ms12m, "12m"),
  };

  // School health summaries
  const schoolHealthList: SchoolHealthSummary[] = await Promise.all(
    schools.map(async (school) => {
      const [teachersSnap, studentsSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.TEACHERS}`)),
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.STUDENTS}`)),
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.CLASSES}`)),
      ]);

      const schoolUsers = users.filter((u) => u.schoolId === school.id);
      const schoolActiveUsers = schoolUsers.filter((u) => u.status === "active").length;
      const schoolLogins = loginLogs.filter((l) => l.schoolId === school.id);
      const lastLogin = schoolLogins.length > 0 ? schoolLogins[0].timestamp : null;

      let health: SchoolHealthStatus = "healthy";
      let healthReason = "Active operations and regular user activity";

      if (school.status === "inactive") {
        health = "inactive";
        healthReason = "School is deactivated by Super Admin";
      } else if (studentsSnap.size === 0 && teachersSnap.size === 0) {
        health = "low_activity";
        healthReason = "School provisioned but no faculty or students registered";
      } else if (lastLogin) {
        const loginMs = lastLogin.toMillis ? lastLogin.toMillis() : 0;
        const daysSince = (now - loginMs) / (1000 * 60 * 60 * 24);
        if (daysSince > 30) {
          health = "inactive";
          healthReason = "No user login activity in over 30 days";
        } else if (daysSince > 7) {
          health = "low_activity";
          healthReason = "No user login activity in the last 7 days";
        }
      } else {
        health = "low_activity";
        healthReason = "No login telemetry recorded yet";
      }

      return {
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        status: school.status,
        totalStudents: studentsSnap.size,
        totalTeachers: teachersSnap.size,
        totalClasses: classesSnap.size,
        activeUsers: schoolActiveUsers,
        lastLogin,
        lastActivity: lastLogin,
        health,
        healthReason,
      };
    })
  );

  return {
    totalSchools: schools.length,
    activeSchools,
    inactiveSchools,
    totalUsers: users.length,
    totalStudents,
    totalTeachers,
    totalAdmins,
    activeUsers,
    growth,
    schoolHealthList,
  };
}

/**
 * Computes School Detailed Analytics directly using active Super Admin session.
 */
export async function fetchSchoolAnalytics(schoolId: string): Promise<SchoolDetailedAnalytics> {
  const db = getFirebaseDb();

  const schoolSnap = await getDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId));
  if (!schoolSnap.exists()) throw new Error("School not found");
  const school = { id: schoolSnap.id, ...schoolSnap.data() } as School;

  const [teachersSnap, studentsSnap, classesSnap, usersSnap, loginLogsSnap, activityLogsSnap] =
    await Promise.all([
      getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.TEACHERS}`)),
      getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.STUDENTS}`)),
      getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.CLASSES}`)),
      getDocs(query(collection(db, COLLECTIONS.USERS), where("schoolId", "==", schoolId))),
      getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
          where("schoolId", "==", schoolId),
          orderBy("timestamp", "desc"),
          firestoreLimit(15)
        )
      ),
      getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
          where("schoolId", "==", schoolId),
          orderBy("timestamp", "desc"),
          firestoreLimit(15)
        )
      ),
    ]);

  let totalAttendanceRecords = 0;
  let presentCount = 0;

  for (const classDoc of classesSnap.docs) {
    const attSnap = await getDocs(
      collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.CLASSES}/${classDoc.id}/${COLLECTIONS.ATTENDANCE}`)
    );
    attSnap.forEach((d) => {
      const data = d.data();
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach((r: any) => {
          totalAttendanceRecords++;
          if (r.status === "present" || r.status === "late") presentCount++;
        });
      }
    });
  }

  const attendanceRate =
    totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 1000) / 10 : 100;

  const schoolUsers = usersSnap.docs.map((d) => d.data() as AppUser);
  const activeUsers = schoolUsers.filter((u) => u.status === "active").length;
  const disabledUsers = schoolUsers.filter((u) => u.status !== "active").length;
  const adminCount = schoolUsers.filter((u) => u.role === "school_admin").length;

  const recentLogins = loginLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  const recentActivities = activityLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  const lastLogin = recentLogins.length > 0 ? recentLogins[0].timestamp : null;

  const now = Date.now();
  let health: SchoolHealthStatus = "healthy";
  let healthReason = "Active operations and verified user engagement";

  if (school.status === "inactive") {
    health = "inactive";
    healthReason = "School is currently deactivated by Super Admin";
  } else if (studentsSnap.size === 0 && teachersSnap.size === 0) {
    health = "low_activity";
    healthReason = "School provisioned but no faculty or students enrolled";
  } else if (lastLogin) {
    const loginMs = lastLogin.toMillis ? lastLogin.toMillis() : 0;
    const daysSince = (now - loginMs) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      health = "inactive";
      healthReason = "No user login activity in over 30 days";
    } else if (daysSince > 7) {
      health = "low_activity";
      healthReason = "No user login activity in the last 7 days";
    }
  } else {
    health = "low_activity";
    healthReason = "No login telemetry recorded yet";
  }

  return {
    schoolId: school.id,
    schoolName: school.name,
    schoolCode: school.code,
    status: school.status,
    adminEmail: school.adminEmail,
    studentCount: studentsSnap.size,
    teacherCount: teachersSnap.size,
    adminCount: adminCount || 1,
    classCount: classesSnap.size,
    sectionCount: classesSnap.size,
    attendanceRate,
    totalAttendanceRecords,
    activeUsers,
    disabledUsers,
    lastLogin,
    lastActivity: recentActivities.length > 0 ? recentActivities[0].timestamp : lastLogin,
    health,
    healthReason,
    recentLogins,
    recentActivities,
  };
}

/**
 * Fetches and enriches users for a specific school.
 */
export async function fetchSchoolUsersExplorer(schoolId: string): Promise<any[]> {
  const db = getFirebaseDb();

  const [usersSnap, teachersSnap, studentsSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.USERS), where("schoolId", "==", schoolId))),
    getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.TEACHERS}`)),
    getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.STUDENTS}`)),
  ]);

  const teacherMap = new Map<string, TeacherProfile>();
  teachersSnap.docs.forEach((d) => {
    const t = { id: d.id, ...d.data() } as TeacherProfile;
    if (t.userId) teacherMap.set(t.userId, t);
  });

  const studentMap = new Map<string, StudentProfile>();
  studentsSnap.docs.forEach((d) => {
    const s = { id: d.id, ...d.data() } as StudentProfile;
    if (s.userId) studentMap.set(s.userId, s);
  });

  return usersSnap.docs.map((d) => {
    const user = { uid: d.id, ...d.data() } as AppUser;
    const teacher = teacherMap.get(user.uid);
    const student = studentMap.get(user.uid);

    return {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
      lastLogin: (user as any).lastLogin || null,
      teacherCode: teacher?.teacherCode,
      assignedClassName: teacher?.assignedClassName,
      admissionNumber: student?.admissionNumber,
      className: student?.className,
      sectionName: student?.sectionName,
    };
  });
}

/**
 * Fetches platform audit logs directly with filters.
 */
export async function fetchPlatformAuditLogs(filters?: {
  action?: string;
  role?: string;
  schoolId?: string;
  search?: string;
  limitCount?: number;
}): Promise<AuditLogEntry[]> {
  const db = getFirebaseDb();

  const q = query(
    collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
    orderBy("timestamp", "desc"),
    firestoreLimit(filters?.limitCount || 100)
  );

  const snap = await getDocs(q);
  let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditLogEntry[];

  if (filters?.action && filters.action !== "all") {
    logs = logs.filter((l) => l.action === filters.action);
  }
  if (filters?.role && filters.role !== "all") {
    logs = logs.filter((l) => l.actorRole === filters.role || l.performedBy?.role === filters.role);
  }
  if (filters?.schoolId && filters.schoolId !== "all") {
    logs = logs.filter(
      (l) =>
        l.actorSchoolId === filters.schoolId ||
        l.targetSchoolId === filters.schoolId ||
        l.performedBy?.schoolId === filters.schoolId
    );
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase().trim();
    logs = logs.filter(
      (l) =>
        l.actorName?.toLowerCase().includes(s) ||
        l.actorEmail?.toLowerCase().includes(s) ||
        l.performedBy?.name?.toLowerCase().includes(s) ||
        l.performedBy?.email?.toLowerCase().includes(s) ||
        l.targetUserName?.toLowerCase().includes(s) ||
        l.targetName?.toLowerCase().includes(s) ||
        l.reason?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s)
    );
  }

  return logs;
}

/**
 * Fetches full User Profile details directly on the client.
 */
export async function fetchFullUserProfileDetails(userId: string) {
  const db = getFirebaseDb();

  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found");

  const user = { uid: userSnap.id, ...userSnap.data() } as AppUser;

  let school: School | null = null;
  let academicProfile: any = null;
  let schoolStats: any = null;

  if (user.schoolId) {
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, user.schoolId);
    const schoolSnap = await getDoc(schoolRef);
    if (schoolSnap.exists()) {
      school = { id: schoolSnap.id, ...schoolSnap.data() } as School;
    }

    if (user.role === "teacher") {
      const q = query(
        collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.TEACHERS}`),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        academicProfile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } else if (user.role === "student") {
      const q = query(
        collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.STUDENTS}`),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        academicProfile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } else if (user.role === "school_admin") {
      const [teachersSnap, studentsSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.TEACHERS}`)),
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.STUDENTS}`)),
        getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.CLASSES}`)),
      ]);
      schoolStats = {
        teachersCount: teachersSnap.size,
        studentsCount: studentsSnap.size,
        classesCount: classesSnap.size,
      };
    }
  }

  const [loginLogsSnap, auditLogsSnap, activityLogsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
        where("uid", "==", user.uid),
        orderBy("timestamp", "desc"),
        firestoreLimit(15)
      )
    ),
    getDocs(
      query(
        collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
        where("targetUserId", "==", user.uid),
        orderBy("timestamp", "desc"),
        firestoreLimit(15)
      )
    ),
    getDocs(
      query(
        collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        firestoreLimit(20)
      )
    ),
  ]);

  const loginLogs = loginLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as LoginLogEntry[];
  const auditLogs = auditLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditLogEntry[];
  const activityLogs = activityLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ActivityLogEntry[];
  const lastLogin = loginLogs.length > 0 ? (loginLogs[0] as any).timestamp : (user as any).lastLogin || null;

  return {
    user,
    school,
    academicProfile,
    schoolStats,
    loginLogs,
    auditLogs,
    activityLogs,
    lastLogin,
  };
}
