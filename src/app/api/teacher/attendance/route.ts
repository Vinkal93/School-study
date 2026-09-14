import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json().catch(() => ({}));
    const { schoolId, classId, className, sectionId, sectionName, date, records } = body;

    if (!schoolId || !classId || !date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: schoolId, classId, date, and student records are required." },
        { status: 400 }
      );
    }

    // 1. Tenant Verification
    if (user.role !== "super_admin" && user.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Cross-school violation: User does not belong to the specified school." },
        { status: 403 }
      );
    }

    // 2. Role Verification
    const isSuperAdmin = user.role === "super_admin";
    const isSchoolAdmin = user.role === "admin" || user.role === "school_admin";
    const isTeacher = user.role === "teacher";

    if (!isSuperAdmin && !isSchoolAdmin && !isTeacher) {
      return NextResponse.json(
        { error: "Access Denied: Only teachers and administrators can record attendance." },
        { status: 403 }
      );
    }

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();

    // 3. Class Teacher Authorization Verification
    if (isTeacher) {
      let classTeacherId = "";
      let teacherProfileId = "";

      // Load class document to verify assigned class teacher
      if (adminDb) {
        const classSnap = await adminDb.collection("schools").doc(schoolId).collection("classes").doc(classId).get();
        if (classSnap.exists) {
          classTeacherId = classSnap.data()?.classTeacherId || "";
        }
        // Find teacher profile ID by userId
        const teacherSnap = await adminDb
          .collection("schools")
          .doc(schoolId)
          .collection("teachers")
          .where("userId", "==", user.uid)
          .limit(1)
          .get();
        if (!teacherSnap.empty) {
          teacherProfileId = teacherSnap.docs[0].id;
          const tData = teacherSnap.docs[0].data();
          // Also allow if teacher has assignedClassId on profile
          if (tData.assignedClassId === classId) {
            classTeacherId = teacherProfileId;
          }
        }
      } else if (clientDb) {
        const classSnap = await getDoc(doc(clientDb, "schools", schoolId, "classes", classId));
        if (classSnap.exists()) {
          classTeacherId = classSnap.data()?.classTeacherId || "";
        }
        const tQuery = query(
          collection(clientDb, "schools", schoolId, "teachers"),
          where("userId", "==", user.uid)
        );
        const tSnap = await getDocs(tQuery);
        if (!tSnap.empty) {
          teacherProfileId = tSnap.docs[0].id;
          const tData = tSnap.docs[0].data();
          if (tData.assignedClassId === classId) {
            classTeacherId = teacherProfileId;
          }
        }
      }

      // Check if this teacher is the designated Class Teacher
      const isAuthorizedClassTeacher =
        Boolean(classTeacherId && (classTeacherId === user.uid || classTeacherId === teacherProfileId));

      // If class has no assigned teacher yet, allow faculty member of the school
      if (classTeacherId && !isAuthorizedClassTeacher) {
        return NextResponse.json(
          {
            error: "Access Denied: You are not the assigned Class Teacher for this class. Only the designated Class Teacher can record roll call.",
            code: "NOT_CLASS_TEACHER",
          },
          { status: 403 }
        );
      }
    }

    // 4. Batch Write Attendance Records
    const nowIso = new Date().toISOString();
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    if (adminDb) {
      const batch = adminDb.batch();
      for (const rec of records) {
        if (!rec.studentId) continue;
        const status = rec.status || "PRESENT";
        if (status === "PRESENT") presentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "LATE") lateCount++;

        const docId = `${schoolId}_${rec.studentId}_${date}`;
        const ref = adminDb.collection("attendance").doc(docId);

        batch.set(
          ref,
          {
            id: docId,
            schoolId,
            classId,
            className: className || "",
            sectionId: sectionId || "",
            sectionName: sectionName || "",
            studentId: rec.studentId,
            studentName: rec.studentName || "",
            admissionNumber: rec.admissionNumber || "",
            rollNumber: rec.rollNumber !== undefined ? rec.rollNumber : null,
            date,
            status,
            markedBy: user.uid,
            markedByName: user.name || "Teacher",
            markedByRole: user.role,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
      await batch.commit();
    } else if (clientDb) {
      const batch = writeBatch(clientDb);
      for (const rec of records) {
        if (!rec.studentId) continue;
        const status = rec.status || "PRESENT";
        if (status === "PRESENT") presentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "LATE") lateCount++;

        const docId = `${schoolId}_${rec.studentId}_${date}`;
        const ref = doc(clientDb, "attendance", docId);

        batch.set(
          ref,
          {
            id: docId,
            schoolId,
            classId,
            className: className || "",
            sectionId: sectionId || "",
            sectionName: sectionName || "",
            studentId: rec.studentId,
            studentName: rec.studentName || "",
            admissionNumber: rec.admissionNumber || "",
            rollNumber: rec.rollNumber !== undefined ? rec.rollNumber : null,
            date,
            status,
            markedBy: user.uid,
            markedByName: user.name || "Teacher",
            markedByRole: user.role,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Attendance saved: ${presentCount} Present, ${absentCount} Absent, ${lateCount} Late.`,
      counts: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: records.length,
      },
    });
  } catch (error: any) {
    console.error("Attendance API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record attendance." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const date = searchParams.get("date");

    if (!schoolId || !classId || !date) {
      return NextResponse.json({ error: "Missing required parameters: schoolId, classId, date" }, { status: 400 });
    }

    // Tenant check
    if (user.role !== "super_admin" && user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Access denied: cross-school request" }, { status: 403 });
    }

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    const marks: Record<string, string> = {};

    if (adminDb) {
      let q = adminDb
        .collection("attendance")
        .where("schoolId", "==", schoolId)
        .where("classId", "==", classId)
        .where("date", "==", date);

      if (sectionId) {
        q = q.where("sectionId", "==", sectionId);
      }

      const snap = await q.get();
      snap.forEach((d) => {
        const data = d.data();
        if (data.studentId && data.status) {
          marks[data.studentId] = data.status;
        }
      });
    } else if (clientDb) {
      const constraints: any[] = [
        where("schoolId", "==", schoolId),
        where("classId", "==", classId),
        where("date", "==", date),
      ];
      if (sectionId) constraints.push(where("sectionId", "==", sectionId));

      const q = query(collection(clientDb, "attendance"), ...constraints);
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        if (data.studentId && data.status) {
          marks[data.studentId] = data.status;
        }
      });
    }

    return NextResponse.json({ success: true, marks });
  } catch (error: any) {
    console.error("GET Attendance API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load attendance marks." }, { status: 500 });
  }
}
