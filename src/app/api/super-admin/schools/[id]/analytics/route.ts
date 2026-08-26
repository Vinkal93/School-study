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
  SchoolDetailedAnalytics,
  SchoolHealthStatus,
} from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
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

    // 2. Fetch School Document
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    const schoolSnap = await getDoc(schoolRef);
    if (!schoolSnap.exists()) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const school = { id: schoolSnap.id, ...schoolSnap.data() } as School;

    // 3. Query Sub-collections in Parallel
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
            limit(15)
          )
        ),
        getDocs(
          query(
            collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
            where("schoolId", "==", schoolId),
            orderBy("timestamp", "desc"),
            limit(15)
          )
        ),
      ]);

    // 4. Calculate Attendance Metrics across classes
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
            if (r.status === "present" || r.status === "late") {
              presentCount++;
            }
          });
        }
      });
    }

    const attendanceRate =
      totalAttendanceRecords > 0
        ? Math.round((presentCount / totalAttendanceRecords) * 1000) / 10
        : 100; // Default to 100% if no records yet

    // 5. User metrics
    const schoolUsers = usersSnap.docs.map((d) => d.data() as AppUser);
    const activeUsers = schoolUsers.filter((u) => u.status === "active").length;
    const disabledUsers = schoolUsers.filter((u) => u.status !== "active").length;
    const adminCount = schoolUsers.filter((u) => u.role === "school_admin").length;

    // 6. Recent telemetry
    const recentLogins = loginLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const recentActivities = activityLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const lastLogin = recentLogins.length > 0 ? recentLogins[0].timestamp : null;

    // 7. Health score evaluation
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
      const daysSinceLogin = (now - loginMs) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) {
        health = "inactive";
        healthReason = "No user login activity in over 30 days";
      } else if (daysSinceLogin > 7) {
        health = "low_activity";
        healthReason = "No user login activity in the last 7 days";
      }
    } else {
      health = "low_activity";
      healthReason = "No login telemetry recorded yet";
    }

    const analyticsData: SchoolDetailedAnalytics = {
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

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error: any) {
    console.error("Failed to compute school analytics:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error computing school analytics" },
      { status: 500 }
    );
  }
}
