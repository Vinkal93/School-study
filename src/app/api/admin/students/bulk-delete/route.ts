import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
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
  targetSchoolId?: string;
}

export interface StudentDeleteResultItem {
  id: string;
  canonicalId?: string;
  studentId?: string;
  admissionNumber?: string;
  name?: string;
  success: boolean;
  action?: "archived" | "permanently_deleted" | "failed";
  code?: "SUCCESS" | "NOT_FOUND" | "WRONG_SCHOOL" | "PERMISSION_DENIED" | "INVALID_ID";
  message?: string;
}

interface ResolvedStudent {
  candidateId: string;
  canonicalId: string;
  studentId?: string;
  admissionNumber?: string;
  name?: string;
  userId?: string;
  status: string;
  schoolId: string;
  inSubcollection: boolean;
  inRoot: boolean;
}

interface DbContext {
  adminDb: any | null;
  clientDb: any | null;
}

function docExists(snap: any): boolean {
  if (!snap) return false;
  if (typeof snap.exists === "function") return snap.exists();
  return Boolean(snap.exists);
}

function getSnapData(snap: any): any {
  if (!snap) return null;
  if (typeof snap.data === "function") return snap.data();
  return null;
}

/**
 * Checks both subcollection `schools/{schoolId}/students/{id}` and root `students/{id}`.
 */
async function getStudentDocPair(
  ctx: DbContext,
  schoolId: string,
  id: string
): Promise<{
  subExists: boolean;
  subData: any;
  rootExists: boolean;
  rootData: any;
}> {
  if (ctx.adminDb) {
    const [subSnap, rootSnap] = await Promise.all([
      ctx.adminDb.collection("schools").doc(schoolId).collection("students").doc(id).get().catch(() => null),
      ctx.adminDb.collection("students").doc(id).get().catch(() => null),
    ]);
    return {
      subExists: docExists(subSnap),
      subData: getSnapData(subSnap),
      rootExists: docExists(rootSnap),
      rootData: getSnapData(rootSnap),
    };
  }

  if (ctx.clientDb) {
    const [subSnap, rootSnap] = await Promise.all([
      getDoc(doc(ctx.clientDb, "schools", schoolId, "students", id)).catch(() => null),
      getDoc(doc(ctx.clientDb, "students", id)).catch(() => null),
    ]);
    return {
      subExists: docExists(subSnap),
      subData: getSnapData(subSnap),
      rootExists: docExists(rootSnap),
      rootData: getSnapData(rootSnap),
    };
  }

  return { subExists: false, subData: null, rootExists: false, rootData: null };
}

/**
 * Resolves a student by business field (e.g. `studentId`, `admissionNumber`, `userId`) within a school tenant.
 */
async function findStudentByBusinessField(
  ctx: DbContext,
  schoolId: string,
  field: string,
  value: string
): Promise<{
  id: string;
  data: any;
  inSubcollection: boolean;
  inRoot: boolean;
} | null> {
  if (ctx.adminDb) {
    // 1. Try subcollection
    try {
      const subSnap = await ctx.adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("students")
        .where(field, "==", value)
        .limit(1)
        .get();

      if (!subSnap.empty) {
        const d = subSnap.docs[0];
        // Check if root doc also exists
        const rootSnap = await ctx.adminDb.collection("students").doc(d.id).get().catch(() => null);
        return {
          id: d.id,
          data: d.data(),
          inSubcollection: true,
          inRoot: docExists(rootSnap),
        };
      }
    } catch {}

    // 2. Try root collection
    try {
      const rootSnap = await ctx.adminDb
        .collection("students")
        .where("schoolId", "==", schoolId)
        .where(field, "==", value)
        .limit(1)
        .get();

      if (!rootSnap.empty) {
        const d = rootSnap.docs[0];
        const subSnap = await ctx.adminDb
          .collection("schools")
          .doc(schoolId)
          .collection("students")
          .doc(d.id)
          .get()
          .catch(() => null);
        return {
          id: d.id,
          data: d.data(),
          inSubcollection: docExists(subSnap),
          inRoot: true,
        };
      }
    } catch {}

    return null;
  }

  if (ctx.clientDb) {
    try {
      const subSnap = await getDocs(
        query(
          collection(ctx.clientDb, "schools", schoolId, "students"),
          where(field, "==", value),
          limit(1)
        )
      ).catch(() => null);

      if (subSnap && !subSnap.empty) {
        const d = subSnap.docs[0];
        const rootSnap = await getDoc(doc(ctx.clientDb, "students", d.id)).catch(() => null);
        return {
          id: d.id,
          data: d.data(),
          inSubcollection: true,
          inRoot: docExists(rootSnap),
        };
      }
    } catch {}

    try {
      const rootSnap = await getDocs(
        query(
          collection(ctx.clientDb, "students"),
          where("schoolId", "==", schoolId),
          where(field, "==", value),
          limit(1)
        )
      ).catch(() => null);

      if (rootSnap && !rootSnap.empty) {
        const d = rootSnap.docs[0];
        const subSnap = await getDoc(doc(ctx.clientDb, "schools", schoolId, "students", d.id)).catch(() => null);
        return {
          id: d.id,
          data: d.data(),
          inSubcollection: docExists(subSnap),
          inRoot: true,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Checks whether the identifier belongs to another school tenant (cross-tenant safety check).
 */
async function checkExistenceInOtherSchool(
  ctx: DbContext,
  candidateId: string
): Promise<{ exists: boolean; otherSchoolId?: string }> {
  if (ctx.adminDb) {
    try {
      const directRoot = await ctx.adminDb.collection("students").doc(candidateId).get().catch(() => null);
      if (docExists(directRoot)) {
        const data = getSnapData(directRoot);
        return { exists: true, otherSchoolId: data?.schoolId };
      }
    } catch {}

    try {
      const byStudentId = await ctx.adminDb.collection("students").where("studentId", "==", candidateId).limit(1).get();
      if (!byStudentId.empty) {
        return { exists: true, otherSchoolId: byStudentId.docs[0].data()?.schoolId };
      }
    } catch {}

    try {
      const byAdm = await ctx.adminDb.collection("students").where("admissionNumber", "==", candidateId).limit(1).get();
      if (!byAdm.empty) {
        return { exists: true, otherSchoolId: byAdm.docs[0].data()?.schoolId };
      }
    } catch {}
  } else if (ctx.clientDb) {
    try {
      const directRoot = await getDoc(doc(ctx.clientDb, "students", candidateId)).catch(() => null);
      if (docExists(directRoot)) {
        const data = getSnapData(directRoot);
        return { exists: true, otherSchoolId: data?.schoolId };
      }
    } catch {}

    try {
      const byStudentId = await getDocs(
        query(collection(ctx.clientDb, "students"), where("studentId", "==", candidateId), limit(1))
      ).catch(() => null);
      if (byStudentId && !byStudentId.empty) {
        return { exists: true, otherSchoolId: (byStudentId.docs[0].data() as any)?.schoolId };
      }
    } catch {}
  }

  return { exists: false };
}

/**
 * Verifies if student has ANY financial records (feeDemands, financialPayments, feePayments, studentFeeAssignments).
 */
async function studentHasFinancialRecords(
  ctx: DbContext,
  schoolId: string,
  canonicalId: string,
  businessStudentId?: string,
  admissionNumber?: string
): Promise<boolean> {
  const idsToCheck = Array.from(new Set([canonicalId, businessStudentId, admissionNumber].filter(Boolean))) as string[];

  if (ctx.adminDb) {
    try {
      for (const idVal of idsToCheck) {
        const [
          topDemands,
          subDemands,
          topPayments,
          subPayments,
          feePayments,
          assignments,
        ] = await Promise.all([
          ctx.adminDb.collection("feeDemands").where("schoolId", "==", schoolId).where("studentId", "==", idVal).limit(1).get().catch(() => null),
          ctx.adminDb.collection("schools").doc(schoolId).collection("feeDemands").where("studentId", "==", idVal).limit(1).get().catch(() => null),
          ctx.adminDb.collection("financialPayments").where("schoolId", "==", schoolId).where("studentId", "==", idVal).limit(1).get().catch(() => null),
          ctx.adminDb.collection("schools").doc(schoolId).collection("financialPayments").where("studentId", "==", idVal).limit(1).get().catch(() => null),
          ctx.adminDb.collection("feePayments").where("schoolId", "==", schoolId).where("studentId", "==", idVal).limit(1).get().catch(() => null),
          ctx.adminDb.collection("studentFeeAssignments").where("schoolId", "==", schoolId).where("studentId", "==", idVal).limit(1).get().catch(() => null),
        ]);

        if (
          (topDemands && !topDemands.empty) ||
          (subDemands && !subDemands.empty) ||
          (topPayments && !topPayments.empty) ||
          (subPayments && !subPayments.empty) ||
          (feePayments && !feePayments.empty) ||
          (assignments && !assignments.empty)
        ) {
          return true;
        }
      }
    } catch (finErr) {
      console.warn("[Bulk Delete] Financial records check error, falling back to safe archive:", finErr);
      return true; // fail-safe: protect financial data if query encounters an error
    }
  } else if (ctx.clientDb) {
    try {
      for (const idVal of idsToCheck) {
        const [
          topDemands,
          subDemands,
          topPayments,
          subPayments,
        ] = await Promise.all([
          getDocs(query(collection(ctx.clientDb, "feeDemands"), where("schoolId", "==", schoolId), where("studentId", "==", idVal), limit(1))).catch(() => null),
          getDocs(query(collection(ctx.clientDb, "schools", schoolId, "feeDemands"), where("studentId", "==", idVal), limit(1))).catch(() => null),
          getDocs(query(collection(ctx.clientDb, "financialPayments"), where("schoolId", "==", schoolId), where("studentId", "==", idVal), limit(1))).catch(() => null),
          getDocs(query(collection(ctx.clientDb, "schools", schoolId, "financialPayments"), where("studentId", "==", idVal), limit(1))).catch(() => null),
        ]);

        if (
          (topDemands && !topDemands.empty) ||
          (subDemands && !subDemands.empty) ||
          (topPayments && !topPayments.empty) ||
          (subPayments && !subPayments.empty)
        ) {
          return true;
        }
      }
    } catch {
      return true;
    }
  }

  return false;
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

    // 2. Role Verification: School Admin, Admin or Super Admin only
    if (user.role !== "school_admin" && user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PERMISSION_DENIED", message: "Forbidden: School Administrator permissions required." },
        },
        { status: 403 }
      );
    }

    const body: BulkDeletePayload = await request.json().catch(() => ({}));

    // 3. Multi-Tenant Authority: Resolve and enforce schoolId
    let schoolId = user.schoolId;
    if (user.role === "super_admin" && body.targetSchoolId) {
      schoolId = body.targetSchoolId;
    } else if (body.targetSchoolId && body.targetSchoolId !== user.schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "WRONG_SCHOOL", message: "Cross-tenant deletion prohibited. You cannot delete students of another school." },
        },
        { status: 403 }
      );
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

    // 4. Initialize Database Access (Admin DB preferred for server-side authority)
    const adminDb = getSafeAdminDb();
    const clientDb = !adminDb ? getFirebaseDb() : null;

    if (!adminDb && !clientDb) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_OFFLINE", message: "Database connection unavailable." },
        },
        { status: 500 }
      );
    }

    const dbCtx: DbContext = { adminDb, clientDb };
    const isPermanent = Boolean(body.permanent);

    // 5. Gather Target Candidate IDs
    const candidateIds: string[] = [];
    const directResolvedStudents: ResolvedStudent[] = [];

    if (body.allFiltered && body.filters) {
      // Query all students belonging to this school
      let allDocs: Array<{ id: string; data: () => any }> = [];

      if (adminDb) {
        const [subSnap, rootSnap] = await Promise.all([
          adminDb.collection("schools").doc(schoolId).collection("students").get().catch(() => ({ docs: [] })),
          adminDb.collection("students").where("schoolId", "==", schoolId).get().catch(() => ({ docs: [] })),
        ]);

        const seenDocIds = new Set<string>();
        for (const d of subSnap.docs) {
          seenDocIds.add(d.id);
          allDocs.push(d);
        }
        for (const d of rootSnap.docs) {
          if (!seenDocIds.has(d.id)) {
            seenDocIds.add(d.id);
            allDocs.push(d);
          }
        }
      } else if (clientDb) {
        const [subSnap, rootSnap] = await Promise.all([
          getDocs(collection(clientDb, "schools", schoolId, "students")).catch(() => ({ docs: [] })),
          getDocs(query(collection(clientDb, "students"), where("schoolId", "==", schoolId))).catch(() => ({ docs: [] })),
        ]);

        const seenDocIds = new Set<string>();
        for (const d of subSnap.docs) {
          seenDocIds.add(d.id);
          allDocs.push(d as any);
        }
        for (const d of rootSnap.docs) {
          if (!seenDocIds.has(d.id)) {
            seenDocIds.add(d.id);
            allDocs.push(d as any);
          }
        }
      }

      const q = (body.filters.searchQuery || "").toLowerCase().trim();
      const targetClassId = body.filters.classId;
      const targetSectionId = body.filters.sectionId;
      const targetStatus = body.filters.status || "all";

      for (const d of allDocs) {
        const s = d.data() as StudentProfile;
        const studentAdmNo = String(s.admissionNumber || "").toLowerCase();
        const studentIdStr = String(s.studentId || "").toLowerCase();
        const studentNameStr = String(s.name || "").toLowerCase();
        const studentEmailStr = String(s.email || "").toLowerCase();
        const studentPhoneStr = String(s.phone || "").toLowerCase();
        const studentRollStr = s.rollNumber !== undefined && s.rollNumber !== null ? String(s.rollNumber) : "";

        // Search filter match
        const matchesSearch =
          !q ||
          studentNameStr.includes(q) ||
          studentIdStr.includes(q) ||
          studentAdmNo.includes(q) ||
          studentEmailStr.includes(q) ||
          studentRollStr === q ||
          studentPhoneStr.includes(q);

        if (!matchesSearch) continue;

        // Class filter match
        if (targetClassId && targetClassId !== "all" && s.classId !== targetClassId) {
          continue;
        }

        // Section filter match
        if (targetSectionId && targetSectionId !== "all" && s.sectionId !== targetSectionId) {
          continue;
        }

        // Status filter match
        if (targetStatus === "all") {
          if (s.status === "deleted" || s.status === "archived") continue;
        } else if (targetStatus === "deleted" || targetStatus === "archived") {
          if (s.status !== "deleted" && s.status !== "archived") continue;
        } else {
          if ((s.status || "active").toLowerCase() !== targetStatus.toLowerCase()) continue;
        }

        directResolvedStudents.push({
          candidateId: d.id,
          canonicalId: d.id,
          studentId: s.studentId || d.id,
          admissionNumber: s.admissionNumber,
          name: s.name,
          userId: s.userId,
          status: s.status || "active",
          schoolId,
          inSubcollection: true,
          inRoot: true,
        });
        candidateIds.push(d.id);
      }
    } else if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
      candidateIds.push(...Array.from(new Set(body.studentIds)));
    }

    if (candidateIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        permanentlyDeletedCount: 0,
        safelyArchivedCount: 0,
        failedCount: 0,
        results: [],
        message: "No matching students found to delete or archive.",
      });
    }

    // 6. Comprehensive Verification and Canonical Resolution
    const verifiedStudents: ResolvedStudent[] = [];
    const results: StudentDeleteResultItem[] = [];
    let failedCount = 0;

    if (directResolvedStudents.length > 0) {
      verifiedStudents.push(...directResolvedStudents);
    } else {
      for (const candidateId of candidateIds) {
        if (!candidateId || typeof candidateId !== "string" || !candidateId.trim()) {
          results.push({
            id: String(candidateId || ""),
            success: false,
            code: "INVALID_ID",
            message: "Invalid or empty student identifier provided.",
          });
          failedCount++;
          continue;
        }

        const cleanId = candidateId.trim();

        try {
          // A. Direct doc ID lookup in subcollection and root
          const docPair = await getStudentDocPair(dbCtx, schoolId, cleanId);

          if (docPair.subExists || docPair.rootExists) {
            const data = (docPair.subExists ? docPair.subData : docPair.rootData) || {};

            // Enforce school tenant isolation
            if (data.schoolId && data.schoolId !== schoolId) {
              results.push({
                id: cleanId,
                success: false,
                code: "WRONG_SCHOOL",
                message: `Tenant Isolation Violation: Student belongs to school "${data.schoolId}".`,
              });
              failedCount++;
              continue;
            }

            verifiedStudents.push({
              candidateId: cleanId,
              canonicalId: cleanId,
              studentId: data.studentId || cleanId,
              admissionNumber: data.admissionNumber,
              name: data.name,
              userId: data.userId,
              status: data.status || "active",
              schoolId,
              inSubcollection: docPair.subExists,
              inRoot: docPair.rootExists,
            });
            continue;
          }

          // B. Lookup by business `studentId` (e.g. SBCI1, STU-1001)
          let match = await findStudentByBusinessField(dbCtx, schoolId, "studentId", cleanId);

          // C. Lookup by `admissionNumber`
          if (!match) {
            match = await findStudentByBusinessField(dbCtx, schoolId, "admissionNumber", cleanId);
          }

          // D. Lookup by `userId` (Firebase Auth UID)
          if (!match) {
            match = await findStudentByBusinessField(dbCtx, schoolId, "userId", cleanId);
          }

          if (match) {
            const data = match.data || {};
            if (data.schoolId && data.schoolId !== schoolId) {
              results.push({
                id: cleanId,
                success: false,
                code: "WRONG_SCHOOL",
                message: `Tenant Isolation Violation: Student belongs to school "${data.schoolId}".`,
              });
              failedCount++;
              continue;
            }

            verifiedStudents.push({
              candidateId: cleanId,
              canonicalId: match.id,
              studentId: data.studentId || match.id,
              admissionNumber: data.admissionNumber,
              name: data.name,
              userId: data.userId,
              status: data.status || "active",
              schoolId,
              inSubcollection: match.inSubcollection,
              inRoot: match.inRoot,
            });
            continue;
          }

          // E. Not found in this school — check if student exists in another school tenant
          const otherTenant = await checkExistenceInOtherSchool(dbCtx, cleanId);
          if (otherTenant.exists && otherTenant.otherSchoolId && otherTenant.otherSchoolId !== schoolId) {
            results.push({
              id: cleanId,
              success: false,
              code: "WRONG_SCHOOL",
              message: `Tenant Isolation Violation: Student belongs to another school tenant (${otherTenant.otherSchoolId}).`,
            });
            failedCount++;
            continue;
          }

          // F. Not found anywhere
          results.push({
            id: cleanId,
            success: false,
            code: "NOT_FOUND",
            message: `Student with identifier "${cleanId}" was not found.`,
          });
          failedCount++;
        } catch (verifyErr: any) {
          console.warn(`[Bulk Delete] Error verifying candidate ${cleanId}:`, verifyErr);
          results.push({
            id: cleanId,
            success: false,
            code: "NOT_FOUND",
            message: verifyErr?.message || `Failed to verify student "${cleanId}".`,
          });
          failedCount++;
        }
      }
    }

    // If zero students were verified, return appropriate granular error
    if (verifiedStudents.length === 0) {
      const hasWrongSchool = results.some((r) => r.code === "WRONG_SCHOOL");
      const hasNotFound = results.some((r) => r.code === "NOT_FOUND");
      const hasInvalidId = results.some((r) => r.code === "INVALID_ID");

      const primaryCode = hasWrongSchool
        ? "WRONG_SCHOOL"
        : hasInvalidId && !hasNotFound
        ? "INVALID_ID"
        : hasNotFound && !hasInvalidId
        ? "NOT_FOUND"
        : "NO_VALID_STUDENTS";

      const primaryMsg =
        primaryCode === "WRONG_SCHOOL"
          ? "Cross-tenant access violation: selected students belong to another school."
          : primaryCode === "INVALID_ID"
          ? "No valid student identifiers were provided."
          : primaryCode === "NOT_FOUND"
          ? "None of the selected students could be found."
          : "None of the selected students could be verified for this school.";

      const status = primaryCode === "WRONG_SCHOOL" ? 403 : 400;

      return NextResponse.json(
        {
          success: false,
          deletedCount: 0,
          permanentlyDeletedCount: 0,
          safelyArchivedCount: 0,
          failedCount,
          error: { code: primaryCode, message: primaryMsg },
          results,
        },
        { status }
      );
    }

    // 7. Execute Deletion / Archival in Chunks of <= 100 Students (Safe Batching)
    const CHUNK_SIZE = 100;
    const nowIso = new Date().toISOString();
    let successfullyDeleted = 0;
    let permanentlyDeletedCount = 0;
    let safelyArchivedCount = 0;
    let activeDeletedCount = 0;

    for (let i = 0; i < verifiedStudents.length; i += CHUNK_SIZE) {
      const chunk = verifiedStudents.slice(i, i + CHUNK_SIZE);

      if (adminDb) {
        const batch = adminDb.batch();

        for (const st of chunk) {
          const subDocRef = adminDb.collection("schools").doc(schoolId).collection("students").doc(st.canonicalId);
          const rootDocRef = adminDb.collection("students").doc(st.canonicalId);
          const userRef = st.userId ? adminDb.collection(COLLECTIONS.USERS).doc(st.userId) : null;

          if (st.status === "active" || !st.status) {
            activeDeletedCount++;
          }

          let allowHardDelete = false;

          if (isPermanent) {
            const hasFinRecords = await studentHasFinancialRecords(
              dbCtx,
              schoolId,
              st.canonicalId,
              st.studentId,
              st.admissionNumber
            );
            allowHardDelete = !hasFinRecords;
          }

          if (isPermanent && allowHardDelete) {
            // Hard Delete
            if (st.inSubcollection) batch.delete(subDocRef);
            if (st.inRoot) batch.delete(rootDocRef);
            if (userRef) batch.delete(userRef);

            permanentlyDeletedCount++;
            results.push({
              id: st.candidateId,
              canonicalId: st.canonicalId,
              studentId: st.studentId,
              admissionNumber: st.admissionNumber,
              name: st.name,
              success: true,
              action: "permanently_deleted",
              code: "SUCCESS",
              message: "Student permanently deleted.",
            });
          } else {
            // Safe Archive (Preserves double-entry ledger & audit history)
            const reason = isPermanent && !allowHardDelete
              ? "Student has active financial ledger records; archived to preserve double-entry audit history"
              : "Administrative archive / deletion";

            const archivePayload = {
              status: "archived",
              statusChangeReason: reason,
              statusChangedDate: nowIso,
              deletedAt: nowIso,
              deletedBy: user.uid,
              updatedAt: nowIso,
            };

            if (st.inSubcollection) {
              batch.set(subDocRef, archivePayload, { merge: true });
            }
            if (st.inRoot) {
              batch.set(rootDocRef, archivePayload, { merge: true });
            }
            if (userRef) {
              batch.set(userRef, {
                status: "disabled",
                disabledAt: nowIso,
                updatedAt: nowIso,
              }, { merge: true });
            }

            safelyArchivedCount++;
            results.push({
              id: st.candidateId,
              canonicalId: st.canonicalId,
              studentId: st.studentId,
              admissionNumber: st.admissionNumber,
              name: st.name,
              success: true,
              action: "archived",
              code: "SUCCESS",
              message: isPermanent && !allowHardDelete
                ? "Protected: Student has financial ledger history and was safely archived."
                : "Student record safely archived.",
            });
          }
        }

        await batch.commit();
        successfullyDeleted += chunk.length;
      } else if (clientDb) {
        const batch = writeBatch(clientDb);

        for (const st of chunk) {
          const subDocRef = doc(clientDb, "schools", schoolId, "students", st.canonicalId);
          const rootDocRef = doc(clientDb, "students", st.canonicalId);
          const userRef = st.userId ? doc(clientDb, COLLECTIONS.USERS, st.userId) : null;

          if (st.status === "active" || !st.status) {
            activeDeletedCount++;
          }

          let allowHardDelete = false;

          if (isPermanent) {
            const hasFinRecords = await studentHasFinancialRecords(
              dbCtx,
              schoolId,
              st.canonicalId,
              st.studentId,
              st.admissionNumber
            );
            allowHardDelete = !hasFinRecords;
          }

          if (isPermanent && allowHardDelete) {
            if (st.inSubcollection) batch.delete(subDocRef);
            if (st.inRoot) batch.delete(rootDocRef);
            if (userRef) batch.delete(userRef);

            permanentlyDeletedCount++;
            results.push({
              id: st.candidateId,
              canonicalId: st.canonicalId,
              studentId: st.studentId,
              admissionNumber: st.admissionNumber,
              name: st.name,
              success: true,
              action: "permanently_deleted",
              code: "SUCCESS",
              message: "Student permanently deleted.",
            });
          } else {
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
              batch.set(subDocRef, archivePayload, { merge: true });
            }
            if (st.inRoot) {
              batch.set(rootDocRef, archivePayload, { merge: true });
            }
            if (userRef) {
              batch.set(userRef, {
                status: "disabled",
                disabledAt: nowIso,
                updatedAt: serverTimestamp(),
              }, { merge: true });
            }

            safelyArchivedCount++;
            results.push({
              id: st.candidateId,
              canonicalId: st.canonicalId,
              studentId: st.studentId,
              admissionNumber: st.admissionNumber,
              name: st.name,
              success: true,
              action: "archived",
              code: "SUCCESS",
              message: isPermanent && !allowHardDelete
                ? "Protected: Student has financial ledger history and was safely archived."
                : "Student record safely archived.",
            });
          }
        }

        await batch.commit();
        successfullyDeleted += chunk.length;
      }
    }

    // 8. Atomically Decrement Plan Usage Counter for Freed Active Students
    if (activeDeletedCount > 0) {
      try {
        await decrementSchoolUsage(schoolId, "students", activeDeletedCount);
      } catch (usageErr) {
        console.warn("[Bulk Delete] Failed to decrement school plan usage:", usageErr);
      }
    }

    // 9. Construct Descriptive Summary Message
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

    if (failedCount > 0) {
      summaryMessage += ` (${failedCount} student(s) could not be verified/processed).`;
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
      results,
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
