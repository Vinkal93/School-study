import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser, School, TeacherProfile, StudentProfile } from "@/types";

// Whitelist of allowed non-sensitive editable fields
const ALLOWED_EDIT_FIELDS = new Set([
  "name",
  "phone",
  "address",
  "status",
  "assignedClassName",
  "assignedClassId",
  "className",
  "classId",
  "sectionName",
  "sectionId",
  "gender",
  "dob",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
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

    // 2. Fetch Base User
    const userDocRef = doc(db, COLLECTIONS.USERS, targetUserId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = { uid: userDocSnap.id, ...userDocSnap.data() } as AppUser;

    // 3. Fetch Associated School
    let school: School | null = null;
    if (user.schoolId) {
      const schoolSnap = await getDoc(doc(db, COLLECTIONS.SCHOOLS, user.schoolId));
      if (schoolSnap.exists()) {
        school = { id: schoolSnap.id, ...schoolSnap.data() } as School;
      }
    }

    // 4. Role-Specific Profile Aggregation
    let academicProfile: any = null;
    let schoolStats: any = null;

    if (user.schoolId) {
      if (user.role === "teacher") {
        // Query teacher profile
        const teachersRef = collection(
          db,
          `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.TEACHERS}`
        );
        const tSnap = await getDocs(query(teachersRef, where("userId", "==", targetUserId)));
        if (!tSnap.empty) {
          academicProfile = { id: tSnap.docs[0].id, ...tSnap.docs[0].data() };
        }
      } else if (user.role === "student") {
        // Query student profile
        const studentsRef = collection(
          db,
          `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.STUDENTS}`
        );
        const sSnap = await getDocs(query(studentsRef, where("userId", "==", targetUserId)));
        if (!sSnap.empty) {
          academicProfile = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() };
        }
      } else if (user.role === "school_admin") {
        // Query school totals
        const [teachersSnap, studentsSnap, classesSnap] = await Promise.all([
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.TEACHERS}`)),
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.STUDENTS}`)),
          getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${user.schoolId}/${COLLECTIONS.CLASSES}`)),
        ]);
        schoolStats = {
          totalTeachers: teachersSnap.size,
          totalStudents: studentsSnap.size,
          totalClasses: classesSnap.size,
        };
      }
    }

    // 5. Query Recent Login Activity
    let loginLogs: any[] = [];
    try {
      const loginSnap = await getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
          where("uid", "==", targetUserId),
          orderBy("timestamp", "desc"),
          limit(20)
        )
      );
      loginLogs = loginSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      // Index fallback
    }

    // 6. Query Audit History targeting this user
    let auditLogs: any[] = [];
    try {
      const auditSnap = await getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
          where("targetId", "==", targetUserId),
          orderBy("timestamp", "desc"),
          limit(20)
        )
      );
      auditLogs = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      // Fallback
    }

    // 7. Query User Operational Activities
    let activityLogs: any[] = [];
    try {
      const actSnap = await getDocs(
        query(
          collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
          where("userId", "==", targetUserId),
          orderBy("timestamp", "desc"),
          limit(30)
        )
      );
      activityLogs = actSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      user,
      school,
      academicProfile,
      schoolStats,
      loginLogs,
      auditLogs,
      activityLogs,
      lastLogin: loginLogs.length > 0 ? loginLogs[0].timestamp : null,
    });
  } catch (error: any) {
    console.error("Failed to load user profile details:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching user profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await req.json();
    const { performerUid, reason, ...updates } = body;

    if (!performerUid) {
      return NextResponse.json({ error: "Missing performerUid" }, { status: 401 });
    }

    // Block arbitrary role modification through normal edit
    if ("role" in updates) {
      return NextResponse.json(
        { error: "Arbitrary role change is prohibited through profile edit." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify Performer is active Super Admin
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "Performer not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Active Super Admin permission required." },
        { status: 403 }
      );
    }

    // 2. Fetch Existing Target User
    const userRef = doc(db, COLLECTIONS.USERS, targetUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const previousUser = userSnap.data() as AppUser;

    // 3. Enforce Strict Field Whitelist
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_EDIT_FIELDS.has(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid permitted fields provided to update." },
        { status: 400 }
      );
    }

    // 4. Update Base User Document
    await updateDoc(userRef, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    });

    // 5. Update Academic Profile if applicable
    if (previousUser.schoolId) {
      if (previousUser.role === "teacher") {
        const tQuery = query(
          collection(db, `${COLLECTIONS.SCHOOLS}/${previousUser.schoolId}/${COLLECTIONS.TEACHERS}`),
          where("userId", "==", targetUserId)
        );
        const tSnap = await getDocs(tQuery);
        if (!tSnap.empty) {
          await updateDoc(tSnap.docs[0].ref, {
            ...sanitizedUpdates,
            updatedAt: serverTimestamp(),
          });
        }
      } else if (previousUser.role === "student") {
        const sQuery = query(
          collection(db, `${COLLECTIONS.SCHOOLS}/${previousUser.schoolId}/${COLLECTIONS.STUDENTS}`),
          where("userId", "==", targetUserId)
        );
        const sSnap = await getDocs(sQuery);
        if (!sSnap.empty) {
          await updateDoc(sSnap.docs[0].ref, {
            ...sanitizedUpdates,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    // 6. Write Structured Audit Log
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
      action: sanitizedUpdates.status ? "USER_STATUS_CHANGE" : "USER_UPDATE_PROFILE",
      targetId: targetUserId,
      targetType: "user",
      targetName: sanitizedUpdates.name || previousUser.name,
      performedBy: {
        uid: performer.uid,
        name: performer.name || "Super Admin",
        email: performer.email,
        role: performer.role,
      },
      previousState: {
        name: previousUser.name,
        status: previousUser.status,
      },
      newState: sanitizedUpdates,
      reason: reason || "User profile updated by Super Admin",
      ipAddress,
      userAgent,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      targetUserId,
      updatedFields: sanitizedUpdates,
    });
  } catch (error: any) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error updating user profile." },
      { status: 500 }
    );
  }
}
