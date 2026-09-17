import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { decrementSchoolUsage } from "@/lib/billing/usage";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { StudentProfile } from "@/types";

interface BulkDeletePayload {
  studentIds?: string[];
  allFiltered?: boolean;
  filters?: {
    classId?: string;
    sectionId?: string;
    status?: string;
    searchQuery?: string;
  };
  permanent?: boolean;
  targetSchoolId?: string; // only allowed for super_admin
}

export async function POST(request: Request) {
  try {
    // 1. Authoritative Server-Side Authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return (
        authResult.errorResponse ||
        NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Unauthorized: Authentication required." },
          },
          { status: 401 }
        )
      );
    }

    const { user } = authResult;

    // 2. Role Verification: School Admin or Super Admin only
    if (user.role !== "school_admin" && user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Forbidden: School Administrator permissions required." },
        },
        { status: 403 }
      );
    }

    const body: BulkDeletePayload = await request.json().catch(() => ({}));

    // 3. Multi-Tenant Authority: Resolve and enforce schoolId
    let schoolId = user.schoolId;
    if (user.role === "super_admin" && body.targetSchoolId) {
      schoolId = body.targetSchoolId;
    }

    if (!schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_SCHOOL", message: "No authorized school tenant associated with this session." },
        },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_OFFLINE", message: "Database connection unavailable." },
        },
        { status: 500 }
      );
    }

    // 4. Resolve Target Students
    const isPermanent = Boolean(body.permanent);
    const candidateIds: string[] = [];

    if (body.allFiltered && body.filters) {
      // Query all students belonging to this school and apply the filter criteria server-side
      const studentsColl = collection(db, "schools", schoolId, "students");
      const snap = await getDocs(studentsColl);

      const q = (body.filters.searchQuery || "").toLowerCase().trim();
      const targetClassId = body.filters.classId;
      const targetSectionId = body.filters.sectionId;
      const targetStatus = body.filters.status || "all";

      for (const d of snap.docs) {
        const s = d.data() as StudentProfile;
        // Search match
        const matchesSearch =
          !q ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.studentId && s.studentId.toLowerCase().includes(q)) ||
          (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.rollNumber !== undefined && s.rollNumber.toString() === q) ||
          (s.phone && s.phone.toLowerCase().includes(q));

        if (!matchesSearch) continue;

        // Class match
        if (targetClassId && targetClassId !== "all" && s.classId !== targetClassId) {
          continue;
        }

        // Section match
        if (targetSectionId && targetSectionId !== "all" && s.sectionId !== targetSectionId) {
          continue;
        }

        // Status match
        if (targetStatus === "all") {
          if (s.status === "deleted") continue; // default view excludes deleted
        } else if (targetStatus === "deleted") {
          if (s.status !== "deleted") continue;
        } else {
          if ((s.status || "active").toLowerCase() !== targetStatus.toLowerCase()) continue;
        }

        candidateIds.push(d.id);
      }
    } else if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
      // Deduplicate requested IDs
      candidateIds.push(...Array.from(new Set(body.studentIds)));
    }

    if (candidateIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        failedCount: 0,
        message: "No matching students found to delete.",
      });
    }

    // 5. Verify Ownership & Retrieve Record Details (Strict Multi-Tenant Check)
    // Every student document must exist in schools/{schoolId}/students/{studentId}
    const verifiedStudents: { id: string; userId?: string; status?: string }[] = [];
    let failedCount = 0;

    for (const studentId of candidateIds) {
      try {
        const studentRef = doc(db, "schools", schoolId, "students", studentId);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          const data = studentSnap.data() as StudentProfile;
          // Verify that student's schoolId strictly matches the authenticated schoolId
          if (!data.schoolId || data.schoolId === schoolId) {
            verifiedStudents.push({
              id: studentSnap.id,
              userId: data.userId,
              status: data.status || "active",
            });
          } else {
            console.warn(`[Bulk Delete] Tenant mismatch for student ${studentId}. Belongs to ${data.schoolId}, attempted by ${schoolId}`);
            failedCount++;
          }
        } else {
          failedCount++;
        }
      } catch (checkErr) {
        console.warn(`[Bulk Delete] Error verifying student ${studentId}:`, checkErr);
        failedCount++;
      }
    }

    if (verifiedStudents.length === 0) {
      return NextResponse.json({
        success: false,
        deletedCount: 0,
        failedCount,
        error: { code: "NO_VALID_STUDENTS", message: "None of the selected students could be verified for this school." },
      });
    }

    // 6. Execute Batch Writes in Chunks of <= 100 Students (Max 300 Ops Per Batch)
    // Firestore has a hard limit of 500 operations per batch.
    const CHUNK_SIZE = 100;
    const nowIso = new Date().toISOString();
    let successfullyDeleted = 0;
    let activeDeletedCount = 0;

    for (let i = 0; i < verifiedStudents.length; i += CHUNK_SIZE) {
      const chunk = verifiedStudents.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const st of chunk) {
        const studentRef = doc(db, "schools", schoolId, "students", st.id);
        const rootStudentRef = doc(db, "students", st.id);
        const userRef = st.userId ? doc(db, COLLECTIONS.USERS, st.userId) : null;

        if (st.status === "active" || !st.status) {
          activeDeletedCount++;
        }

        if (isPermanent) {
          // Hard Delete: purge from schools/{schoolId}/students
          batch.delete(studentRef);
          // Purge root student mirror
          batch.delete(rootStudentRef);
          // If userId exists, disable or delete user record
          if (userRef) {
            batch.delete(userRef);
          }
        } else {
          // Soft Delete (Archive)
          batch.update(studentRef, {
            status: "deleted",
            deletedAt: nowIso,
            deletedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
          // Update root mirror
          batch.update(rootStudentRef, {
            status: "deleted",
            deletedAt: nowIso,
            deletedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
          // Disable user account
          if (userRef) {
            batch.update(userRef, {
              status: "disabled",
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      await batch.commit();
      successfullyDeleted += chunk.length;
    }

    // 7. Atomically Decrement Plan Usage Counter
    if (activeDeletedCount > 0) {
      try {
        await decrementSchoolUsage(schoolId, "students", activeDeletedCount);
      } catch (usageErr) {
        console.warn("[Bulk Delete] Failed to decrement school plan usage:", usageErr);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: successfullyDeleted,
      failedCount,
      activeFreedCount: activeDeletedCount,
      permanent: isPermanent,
      message: `Successfully ${isPermanent ? "permanently deleted" : "archived"} ${successfullyDeleted} student(s).`,
    });
  } catch (error: any) {
    console.error("[Bulk Delete API] Unhandled exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to execute bulk student deletion.",
        },
      },
      { status: 500 }
    );
  }
}
