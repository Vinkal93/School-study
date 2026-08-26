import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser, UserRole, UserStatus } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const roleFilter = searchParams.get("role");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify caller identity & active Super Admin status
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json(
        { error: "Performer account not found" },
        { status: 403 }
      );
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    // 2. Query school users
    let q = query(
      collection(db, COLLECTIONS.USERS),
      where("schoolId", "==", schoolId)
    );

    const usersSnap = await getDocs(q);
    let usersList = usersSnap.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...docSnap.data(),
    })) as (AppUser & { lastLogin?: any; studentId?: string; teacherCode?: string })[];

    // 3. Fetch academic profiles to attach Student ID (Admission No) or Teacher Code
    const [teachersSnap, studentsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.TEACHERS}`)
        )
      ),
      getDocs(
        query(
          collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.STUDENTS}`)
        )
      ),
    ]);

    const teacherCodeMap = new Map<string, string>();
    teachersSnap.forEach((d) => {
      const data = d.data();
      if (data.userId) teacherCodeMap.set(data.userId, data.teacherCode || "");
    });

    const studentAdmMap = new Map<string, string>();
    studentsSnap.forEach((d) => {
      const data = d.data();
      if (data.userId) studentAdmMap.set(data.userId, data.admissionNumber || "");
    });

    // 4. Enrich users with last login info and academic codes
    const enrichedUsers = await Promise.all(
      usersList.map(async (u) => {
        const teacherCode = teacherCodeMap.get(u.uid);
        const studentId = studentAdmMap.get(u.uid);

        // Fetch user's most recent login log
        let lastLogin = null;
        try {
          const loginSnap = await getDocs(
            query(
              collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
              where("uid", "==", u.uid),
              where("status", "==", "success"),
              orderBy("timestamp", "desc"),
              limit(1)
            )
          );
          if (!loginSnap.empty) {
            lastLogin = loginSnap.docs[0].data().timestamp;
          }
        } catch {
          // login_logs index or query fallback
        }

        return {
          ...u,
          teacherCode,
          studentId,
          lastLogin,
        };
      })
    );

    // 5. Apply filters
    let filtered = enrichedUsers;

    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.uid.toLowerCase().includes(search) ||
          (u.teacherCode && u.teacherCode.toLowerCase().includes(search)) ||
          (u.studentId && u.studentId.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      schoolId,
      totalCount: filtered.length,
      users: filtered,
    });
  } catch (error: any) {
    console.error("Failed to query school users:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching school users." },
      { status: 500 }
    );
  }
}
