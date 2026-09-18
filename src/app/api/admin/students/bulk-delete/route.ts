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
  query,
  where,
  limit,
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
      // Query all students belonging to this school across both tenant subcollection and root collection
      const [subSnap, rootSnap] = await Promise.all([
        getDocs(collection(db, "schools", schoolId, "students")),
        getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId))),
      ]);

      const seenDocIds = new Set<string>();
      const docs: Array<{ id: string; data: () => StudentProfile }> = [];

      for (const d of subSnap.docs) {
        seenDocIds.add(d.id);
        docs.push(d as any);
      }
      for (const d of rootSnap.docs) {
        if (!seenDocIds.has(d.id)) {
          seenDocIds.add(d.id);
          docs.push(d as any);
        }
      }

      const q = (body.filters.searchQuery || "").toLowerCase().trim();
      const targetClassId = body.filters.classId;
      const targetSectionId = body.filters.sectionId;
      const targetStatus = body.filters.status || "all";

      for (const d of docs) {
        const s = d.data() as StudentProfile;
        const studentAdmNo = String(s.admissionNumber || "").toLowerCase();
        const studentIdStr = String(s.studentId || "").toLowerCase();
        const studentNameStr = String(s.name || "").toLowerCase();
        const studentEmailStr = String(s.email || "").toLowerCase();
        const studentPhoneStr = String(s.phone || "").toLowerCase();
        const studentRollStr = s.rollNumber !== undefined && s.rollNumber !== null ? String(s.rollNumber) : "";

        // Search match
        const matchesSearch =
          !q ||
          studentNameStr.includes(q) ||
          studentIdStr.includes(q) ||
          studentAdmNo.includes(q) ||
          studentEmailStr.includes(q) ||
          studentRollStr === q ||
          studentPhoneStr.includes(q);

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
          if (s.status === "deleted" || s.status === "archived") continue; // default view excludes deleted/archived
        } else if (targetStatus === "deleted") {
          if (s.status !== "deleted" && s.status !== "archived") continue;
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

    // 5. Verify Ownership & Retrieve Record Details (Dual-Path Multi-Tenant Check)
    // Check both schools/{schoolId}/students/{studentId} and students/{studentId}
    const verifiedStudents: {
      id: string;
      userId?: string;
      status?: string;
      inSubcollection: boolean;
      inRoot: boolean;
    }[] = [];
    let failedCount = 0;

    for (const studentId of candidateIds) {
      try {
        const studentSubRef = doc(db, "schools", schoolId, "students", studentId);
        const rootStudentRef = doc(db, "students", studentId);

        const [subSnap, rootSnap] = await Promise.all([
          getDoc(studentSubRef),
          getDoc(rootStudentRef),
        ]);

        const inSubcollection = subSnap.exists();
        const inRoot = rootSnap.exists();

        if (inSubcollection || inRoot) {
          const data = ((inSubcollection ? subSnap.data() : rootSnap.data()) || {}) as StudentProfile;
          // Verify that student's schoolId strictly matches the authenticated schoolId
          if (!data.schoolId || data.schoolId === schoolId) {
            verifiedStudents.push({
              id: studentId,
              userId: data.userId,
              status: data.status || "active",
              inSubcollection,
              inRoot,
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
    let permanentlyDeletedCount = 0;
    let safelyArchivedCount = 0;
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

        let allowHardDelete = false;

        if (isPermanent) {
          // Verify if student has ANY financial history (fee demands or payments across top-level or tenant subcollections)
          try {
            const [topDemandsCheck, topPaymentsCheck, subDemandsCheck, subPaymentsCheck] = await Promise.all([
              getDocs(query(collection(db, "feeDemands"), where("schoolId", "==", schoolId), where("studentId", "==", st.id), limit(1))),
              getDocs(query(collection(db, "financialPayments"), where("schoolId", "==", schoolId), where("studentId", "==", st.id), limit(1))),
              getDocs(query(collection(db, "schools", schoolId, "feeDemands"), where("studentId", "==", st.id), limit(1))),
              getDocs(query(collection(db, "schools", schoolId, "financialPayments"), where("studentId", "==", st.id), limit(1))),
            ]);
            const hasFinancialHistory =
              !topDemandsCheck.empty ||
              !topPaymentsCheck.empty ||
              !subDemandsCheck.empty ||
              !subPaymentsCheck.empty;

            if (hasFinancialHistory) {
              allowHardDelete = false;
            } else {
              allowHardDelete = true;
            }
          } catch (finErr) {
            console.warn(`[Bulk Delete] Could not check financial history for student ${st.id}, falling back to safe archive:`, finErr);
            allowHardDelete = false;
          }
        }

        if (isPermanent && allowHardDelete) {
          // Zero financial records: hard delete allowed for existing references
          if (st.inSubcollection) batch.delete(studentRef);
          if (st.inRoot) batch.delete(rootStudentRef);
          if (userRef) {
            batch.delete(userRef);
          }
          permanentlyDeletedCount++;
        } else {
          // Soft Delete / Safe Archive (preserves ledger, demands, payments and academic audit logs)
          const reason = isPermanent && !allowHardDelete
            ? "Student has active financial ledger records; archived to preserve double-entry audit history"
            : "Administrative archive / deletion";

          const archivePayload = {
            status: "archived",
            statusChangeReason: reason,
            statusChangedDate: nowIso,
            deletedAt: nowIso,
            deletedBy: user.uid,
            updatedAt: serverTimestamp(),
          };

          if (st.inSubcollection) {
            batch.set(studentRef, archivePayload, { merge: true });
          }
          if (st.inRoot) {
            batch.set(rootStudentRef, archivePayload, { merge: true });
          }
          if (userRef) {
            batch.set(userRef, {
              status: "disabled",
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
          safelyArchivedCount++;
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

    let summaryMessage = "";
    if (isPermanent) {
      if (safelyArchivedCount > 0 && permanentlyDeletedCount > 0) {
        summaryMessage = `${permanentlyDeletedCount} student(s) permanently deleted. ${safelyArchivedCount} student(s) with financial records were safely archived to preserve ledger integrity.`;
      } else if (safelyArchivedCount > 0) {
        summaryMessage = `All ${safelyArchivedCount} student(s) have financial records and were safely archived to preserve ledger history.`;
      } else {
        summaryMessage = `Successfully permanently deleted ${permanentlyDeletedCount} student(s).`;
      }
    } else {
      summaryMessage = `Successfully archived ${successfullyDeleted} student(s).`;
    }

    return NextResponse.json({
      success: true,
      deletedCount: successfullyDeleted,
      permanentlyDeletedCount,
      safelyArchivedCount,
      failedCount,
      activeFreedCount: activeDeletedCount,
      permanent: isPermanent,
      message: summaryMessage,
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
