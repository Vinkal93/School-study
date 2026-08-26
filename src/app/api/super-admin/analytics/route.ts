import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type {
  AppUser,
  School,
  PlatformAnalyticsOverview,
  SchoolHealthSummary,
  SchoolHealthStatus,
  GrowthTimeframe,
  PlatformGrowthMetrics,
} from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify Super Admin authorization
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "Performer account not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    // 2. Fetch all schools and users for platform metrics
    const [schoolsSnap, usersSnap, loginLogsSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.SCHOOLS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
          orderBy("timestamp", "desc"),
          limit(200)
        )
      ),
    ]);

    const schools = schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as School[];
    const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as AppUser[];
    const loginLogs = loginLogsSnap.docs.map((d) => d.data());

    // 3. Platform Totals
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

    // 4. Growth Calculations (7d, 30d, 90d, 12m)
    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms30d = 30 * 24 * 60 * 60 * 1000;
    const ms90d = 90 * 24 * 60 * 60 * 1000;
    const ms12m = 365 * 24 * 60 * 60 * 1000;

    const computeGrowthForInterval = (
      intervalMs: number,
      timeframe: GrowthTimeframe
    ): PlatformGrowthMetrics => {
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

      return {
        timeframe,
        schoolsGrown,
        studentsGrown,
        teachersGrown,
        totalUsersGrown,
      };
    };

    const growth: Record<GrowthTimeframe, PlatformGrowthMetrics> = {
      "7d": computeGrowthForInterval(ms7d, "7d"),
      "30d": computeGrowthForInterval(ms30d, "30d"),
      "90d": computeGrowthForInterval(ms90d, "90d"),
      "12m": computeGrowthForInterval(ms12m, "12m"),
    };

    // 5. Compute School Health for each school
    const schoolHealthList: SchoolHealthSummary[] = await Promise.all(
      schools.map(async (school) => {
        // Query sub-collection counts
        const [teachersSnap, studentsSnap, classesSnap] = await Promise.all([
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.TEACHERS}`)),
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.STUDENTS}`)),
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${school.id}/${COLLECTIONS.CLASSES}`)),
        ]);

        const schoolUsers = users.filter((u) => u.schoolId === school.id);
        const schoolActiveUsers = schoolUsers.filter((u) => u.status === "active").length;

        // Find last login for this school
        const schoolLogins = loginLogs.filter((l) => l.schoolId === school.id);
        const lastLogin = schoolLogins.length > 0 ? schoolLogins[0].timestamp : null;

        // Determine Health Score
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
          const daysSinceLogin = (now - loginMs) / (1000 * 60 * 60 * 24);
          if (daysSinceLogin > 30) {
            health = "inactive";
            healthReason = "No user login activity in over 30 days";
          } else if (daysSinceLogin > 7) {
            health = "low_activity";
            healthReason = "No user login activity in the last 7 days";
          }
        } else {
          // No recorded login logs
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

    const overview: PlatformAnalyticsOverview = {
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

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error("Failed to compute platform analytics:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error computing analytics" },
      { status: 500 }
    );
  }
}
