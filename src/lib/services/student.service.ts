import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  arrayUnion,
  type Timestamp,
} from "firebase/firestore";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import {
  requireFeatureAccess,
  requirePlanLimit,
  incrementSchoolUsage,
  decrementSchoolUsage,
} from "@/lib/billing";
import type { StudentProfile, CreateStudentInput, StudentTransferRecord, TransferStudentsInput } from "@/types";
import { compressImageToBase64 } from "@/lib/utils/image-compression";
import { provisionStudentFeeAssignment, recalculateStudentFutureDues } from "./fee.service";
import {
  normalizeClassName,
  normalizeSectionName,
  normalizeGender,
} from "@/lib/utils/academic-normalizer";

/**
 * Uploads student photo with client-side compression and zero CORS requirements.
 */
export async function uploadStudentPhoto(
  arg1: string | File,
  arg2?: string,
  arg3?: string | File
): Promise<string> {
  const file = arg1 instanceof File ? arg1 : (arg3 instanceof File ? arg3 : undefined);
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.75);
}

/**
 * Atomically generates the next unique Student ID scoped to the school.
 * Format: `${schoolCode}${sequence}` -> e.g. SBCI1, SBCI2, SBCI3...
 * 
 * Uses an atomic Firestore transaction on the school document.
 * - ID is 100% collision-free under concurrent enrollments.
 * - Sequence is monotonically increasing and never decrements or reuses IDs upon deletion.
 */
export async function generateNextStudentId(schoolId: string): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database offline.");

  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);

  return await runTransaction(db, async (tx) => {
    const schoolSnap = await tx.get(schoolRef);
    let schoolCode = "SBCI";

    if (schoolSnap.exists()) {
      const sData = schoolSnap.data();
      if (sData?.code && typeof sData.code === "string" && sData.code.trim().length > 0) {
        schoolCode = sData.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      }
    }

    const currentNumber = (schoolSnap.exists() && typeof schoolSnap.data()?.lastStudentNumber === "number")
      ? schoolSnap.data().lastStudentNumber
      : 0;

    const nextNumber = currentNumber + 1;

    // Update the counter on school doc atomically
    tx.set(schoolRef, { lastStudentNumber: nextNumber }, { merge: true });

    return `${schoolCode}${nextNumber}`;
  });
}

/**
 * Generates the next available sequential roll number for a class (1, 2, 3...).
 * Guarantees no duplicate roll number in the same class.
 */
export async function generateNextRollNumber(
  schoolId: string,
  classId: string
): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return 1;

  try {
    const q = query(
      collection(db, "schools", schoolId, "students"),
      where("classId", "==", classId)
    );

    const snapshot = await getDocs(q);
    const assignedRolls = new Set<number>();

    snapshot.docs.forEach((d) => {
      const data = d.data() as StudentProfile;
      // Exclude deleted students when allocating roll numbers
      if (data.status !== "deleted" && typeof data.rollNumber === "number" && data.rollNumber > 0) {
        assignedRolls.add(data.rollNumber);
      }
    });

    // Find smallest positive integer not in assignedRolls
    let nextRoll = 1;
    while (assignedRolls.has(nextRoll)) {
      nextRoll++;
    }

    return nextRoll;
  } catch (err) {
    console.warn("generateNextRollNumber notice:", err);
    return 1;
  }
}

/**
 * Fetches all students for a school with optional class/section/status filters.
 * Path: schools/{schoolId}/students
 */
export async function getStudents(
  schoolId: string,
  options?: { classId?: string; sectionId?: string; status?: string }
): Promise<StudentProfile[]> {
  try {
    const db = getFirebaseDb();
    if (!db || !schoolId) return [];

    let snapshot = await getDocs(collection(db, "schools", schoolId, "students"));
    if (snapshot.empty) {
      snapshot = await getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)));
    }

    let students = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        name: data.name || data.fullName || "Student",
        className: data.className ? normalizeClassName(data.className) : (data.class || ""),
        sectionName: data.sectionName ? normalizeSectionName(data.sectionName) : (data.section ? normalizeSectionName(data.section) : ""),
        gender: normalizeGender(data.gender),
      };
    }) as StudentProfile[];

    if (options?.classId && options.classId !== "all") {
      students = students.filter((s) => s.classId === options.classId);
    }
    if (options?.sectionId && options.sectionId !== "all") {
      students = students.filter((s) => s.sectionId === options.sectionId);
    }
    if (options?.status && options.status !== "all") {
      students = students.filter((s) => (s.status || "active").toLowerCase() === options.status?.toLowerCase());
    }

    // Sort active students first by class order / roll number
    students.sort((a, b) => {
      if (a.classId === b.classId) {
        return (Number(a.rollNumber) || 9999) - (Number(b.rollNumber) || 9999);
      }
      return (a.className || "").localeCompare(b.className || "") || (a.name || "").localeCompare(b.name || "");
    });

    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

/**
 * Fetches active students belonging to a specific class and section for attendance roster.
 */
export async function getStudentsByClassAndSection(
  schoolId: string,
  classId: string,
  sectionId?: string
): Promise<StudentProfile[]> {
  const db = getFirebaseDb();
  let q = query(
    collection(db, "schools", schoolId, "students"),
    where("classId", "==", classId)
  );

  const snapshot = await getDocs(q);
  let students = snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    })) as StudentProfile[];

  // Only active enrolled students
  students = students.filter((s) => s.status === "active");

  if (sectionId && sectionId !== "all") {
    students = students.filter((s) => s.sectionId === sectionId);
  }

  // Sort by Roll Number ascending (1, 2, 3...)
  return students.sort((a, b) => (a.rollNumber || 9999) - (b.rollNumber || 9999));
}

/**
 * Creates a student record with atomic unique Student ID (SBCI1...),
 * class-wise roll number (1, 2, 3...), Firebase Auth account, and initial Fee Assignment.
 */
export async function createStudentWithAuth(
  schoolId: string,
  input: CreateStudentInput
): Promise<{ studentId: string; userId: string; admissionNumber: string; rollNumber: number }> {
  const db = getFirebaseDb();

  // 1. Authoritative Backend Check: Feature Access & Plan Limit
  await requireFeatureAccess(schoolId, "student_management");
  await requirePlanLimit(schoolId, "students");

  // 2. Authoritative Unique User ID (e.g. STU564534)
  const { generateAuthoritativeId, reserveUserIdentity } = await import("./identity.service");
  const autoStudentId = input.studentId || (await generateAuthoritativeId("student", schoolId));
  const cleanAdmNo = (input.admissionNumber && input.admissionNumber.trim().length > 0)
    ? input.admissionNumber.trim().toUpperCase()
    : autoStudentId;

  // 3. Class-wise Sequential Roll Number (1, 2, 3...)
  const assignedRoll = (typeof input.rollNumber === "number" && input.rollNumber > 0)
    ? input.rollNumber
    : await generateNextRollNumber(schoolId, input.classId);

  // 4. Verify no duplicate roll number in the same class
  const studentsColl = collection(db, "schools", schoolId, "students");
  const existingRollsQuery = query(
    studentsColl,
    where("classId", "==", input.classId),
    where("rollNumber", "==", assignedRoll)
  );
  const rollSnap = await getDocs(existingRollsQuery);
  const activeSameRoll = rollSnap.docs.filter((d) => (d.data() as StudentProfile).status !== "deleted");
  if (activeSameRoll.length > 0) {
    throw new Error(`Roll Number ${assignedRoll} is already assigned to an active student in this class.`);
  }

  // 5. Create student Auth user via secondary app instance
  const secondaryAppName = `student-auth-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const secondaryApp = initializeApp(firebaseClientConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let userId = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email.trim().toLowerCase(),
      input.password
    );
    userId = userCredential.user.uid;
    await signOut(secondaryAuth);
  } catch (authError: any) {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
    if (authError.code === "auth/email-already-in-use") {
      throw new Error(`Email "${input.email}" is already registered. Please use another email.`);
    }
    if (authError.code === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters.");
    }
    throw new Error(authError.message || "Failed to create student user account.");
  } finally {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
  }

  // 6. Create Student Document in schools/{schoolId}/students/{studentDocId}
  const studentDocRef = doc(collection(db, "schools", schoolId, "students"));
  const studentDocId = studentDocRef.id;

  const studentData: Omit<StudentProfile, "createdAt" | "updatedAt"> = {
    id: studentDocId,
    schoolId,
    userId,
    studentId: autoStudentId,
    admissionNumber: cleanAdmNo,
    rollNumber: assignedRoll,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    gender: normalizeGender(input.gender),
    dob: input.dob || "",
    phone: input.phone?.trim() || "",
    photoUrl: input.photoUrl || "",
    address: input.address?.trim() || "",
    classId: input.classId,
    className: normalizeClassName(input.className),
    sectionId: input.sectionId,
    sectionName: normalizeSectionName(input.sectionName),
    academicYearId: input.academicYearId || "ay_current",
    admissionDate: input.admissionDate || new Date().toISOString().split("T")[0],
    status: "active",
    deletedAt: null,
  };

  await setDoc(studentDocRef, {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Dual-write to top-level students collection
  await setDoc(doc(db, "students", studentDocId), {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  // 7. Create User document in users/{userId}
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  await setDoc(userDocRef, {
    uid: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: "student",
    schoolId: schoolId,
    userId: cleanAdmNo,
    studentId: autoStudentId,
    admissionNumber: cleanAdmNo,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Register in authoritative unique identity registry
  await reserveUserIdentity(cleanAdmNo, {
    uid: userId,
    email: input.email.trim().toLowerCase(),
    role: "student",
    schoolId,
    name: input.name.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  }).catch((e) => console.warn("Identity reservation notice:", e?.message));

  // 8. Atomically increment school usage counter
  await incrementSchoolUsage(schoolId, "students", 1);

  // 9. Automatically provision Student Fee Assignment based on class fee structure & admission date
  try {
    await provisionStudentFeeAssignment(
      schoolId,
      {
        id: studentDocId,
        name: input.name.trim(),
        admissionNumber: cleanAdmNo,
        className: input.className,
        sectionName: input.sectionName,
        admissionDate: input.admissionDate || new Date().toISOString().split("T")[0],
      },
      input.academicYearId || "ay_current"
    );
  } catch (feeErr) {
    console.warn("Automatic fee assignment notice (non-fatal):", feeErr);
  }

  return {
    studentId: autoStudentId,
    userId,
    admissionNumber: cleanAdmNo,
    rollNumber: assignedRoll,
  };
}

/**
 * Updates a student's profile details.
 */
export async function updateStudent(
  schoolId: string,
  studentId: string,
  data: Partial<StudentProfile>
): Promise<void> {
  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  await updateDoc(studentDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Transfers a student to a new class and section:
 * - Validates target class and section is different.
 * - Assigns next available sequential roll number in the new class.
 * - Stores immutable audit history in transferHistory array.
 * - Recalculates future dues from transfer date onwards while preserving past paid receipts.
 * - Leaves past payments and historical attendance intact.
 */
export async function transferStudentClass(
  schoolId: string,
  studentId: string,
  newClassId: string,
  newClassName: string,
  newSectionId: string,
  newSectionName: string,
  transferDate?: string,
  reason?: string,
  actorId?: string
): Promise<{ newRollNumber: number }> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) throw new Error("Missing parameters.");

  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  const snap = await getDoc(studentDocRef);
  if (!snap.exists()) throw new Error("Student not found.");

  const currentData = snap.data() as StudentProfile;

  // Validation: cannot transfer to identical class and section
  if (currentData.classId === newClassId && currentData.sectionId === newSectionId) {
    throw new Error("Student is already enrolled in this class and section.");
  }

  // Allocate new roll number in target class
  const newRollNumber = await generateNextRollNumber(schoolId, newClassId);

  const transferRecord: StudentTransferRecord = {
    id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromClassId: currentData.classId || "",
    fromClassName: currentData.className || "",
    fromSectionId: currentData.sectionId || "",
    fromSectionName: currentData.sectionName || "",
    fromRollNumber: currentData.rollNumber,
    toClassId: newClassId,
    toClassName: newClassName,
    toSectionId: newSectionId,
    toSectionName: newSectionName,
    toRollNumber: newRollNumber,
    transferDate: transferDate || new Date().toISOString().split("T")[0],
    reason: reason || "Class Transfer",
    transferredBy: actorId || "admin",
    timestamp: new Date().toISOString(),
  };

  await updateDoc(studentDocRef, {
    classId: newClassId,
    className: newClassName,
    sectionId: newSectionId,
    sectionName: newSectionName,
    rollNumber: newRollNumber,
    transferHistory: arrayUnion(transferRecord),
    updatedAt: serverTimestamp(),
  });

  // Also sync root collection student document if exists
  const rootStudentRef = doc(db, "students", studentId);
  await updateDoc(rootStudentRef, {
    classId: newClassId,
    className: newClassName,
    sectionId: newSectionId,
    sectionName: newSectionName,
    rollNumber: newRollNumber,
    transferHistory: arrayUnion(transferRecord),
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  // Recalculate future dues for the new class fee structure
  try {
    await recalculateStudentFutureDues(
      schoolId,
      studentId,
      newClassName,
      transferDate || new Date().toISOString()
    );
  } catch (recalcErr) {
    console.warn("Future dues recalculation notice:", recalcErr);
  }

  return { newRollNumber };
}

/**
 * Loads a single student profile by ID with fallback to root collection.
 */
export async function getStudentById(
  schoolId: string,
  studentId: string
): Promise<StudentProfile | null> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) return null;

  try {
    const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
    const snap = await getDoc(studentDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        name: data.name || data.fullName || "Student",
      } as StudentProfile;
    }

    // Check root collection fallback
    const rootSnap = await getDoc(doc(db, "students", studentId));
    if (rootSnap.exists()) {
      const data = rootSnap.data();
      return {
        id: rootSnap.id,
        ...data,
        name: data.name || data.fullName || "Student",
      } as StudentProfile;
    }

    return null;
  } catch (err) {
    console.error("getStudentById error:", err);
    return null;
  }
}

/**
 * Toggles a student's status between active and inactive.
 */
export async function toggleStudentStatus(
  schoolId: string,
  studentId: string,
  userId: string,
  status: "active" | "inactive"
): Promise<void> {
  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(studentDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await updateDoc(userDocRef, {
      status: status === "active" ? "active" : "disabled",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/**
 * Soft deletes a student profile (preserves financial/attendance records)
 * and decrements the active capacity usage count.
 */
export async function deleteStudent(
  schoolId: string,
  studentId: string,
  userId: string
): Promise<void> {
  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  const nowIso = new Date().toISOString();

  // Soft delete: keep record for audit & history
  await updateDoc(studentDocRef, {
    status: "deleted",
    deletedAt: nowIso,
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await updateDoc(userDocRef, {
      status: "disabled",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Decrement active usage count atomically
  await decrementSchoolUsage(schoolId, "students", 1);
}

/**
 * Restores a soft-deleted student profile back to active status.
 */
export async function restoreStudent(
  schoolId: string,
  studentId: string,
  userId: string
): Promise<void> {
  // Check plan limit before restoring
  await requirePlanLimit(schoolId, "students");

  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(studentDocRef, {
    status: "active",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await updateDoc(userDocRef, {
      status: "active",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Increment active usage count atomically
  await incrementSchoolUsage(schoolId, "students", 1);
}

/**
 * Retrieves all active students for a given class, section and academic year.
 */
export async function getStudentsByClassSection(
  schoolId: string,
  classId: string,
  sectionId?: string,
  academicYearId?: string
): Promise<StudentProfile[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const constraints: any[] = [
    where("classId", "==", classId),
    where("status", "==", "active"),
  ];
  if (sectionId && sectionId !== "all") {
    constraints.push(where("sectionId", "==", sectionId));
  }
  if (academicYearId) {
    constraints.push(where("academicYearId", "==", academicYearId));
  }

  const q = query(
    collection(db, "schools", schoolId, "students"),
    ...constraints
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentProfile));
  return list.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
}

/**
 * Promotes, transfers or graduates students in bulk across classes and sections.
 * Automatically updates roll numbers, logs transfer history on each student,
 * and optionally provisions the target class fee structure for the new academic year.
 */
export async function transferStudentsBulk(
  schoolId: string,
  input: TransferStudentsInput,
  actorId: string
): Promise<{ success: boolean; transferredCount: number; errors?: string[] }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database offline.");
  if (!input.studentIds || input.studentIds.length === 0) {
    return { success: true, transferredCount: 0 };
  }

  // 1. If sequential roll number mode, find current max roll number in target class
  let currentTargetRoll = 0;
  if (input.rollNumberMode === "sequential" && input.actionType !== "graduate") {
    try {
      const q = query(
        collection(db, "schools", schoolId, "students"),
        where("classId", "==", input.targetClassId),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const roll = d.data().rollNumber;
        if (typeof roll === "number" && roll > currentTargetRoll) {
          currentTargetRoll = roll;
        }
      });
    } catch (e) {
      console.warn("Could not find max roll number in target class:", e);
    }
  }

  // 2. Fetch and prepare updates in batch chunks
  const nowIso = new Date().toISOString();
  const chunks: string[][] = [];
  for (let i = 0; i < input.studentIds.length; i += 250) {
    chunks.push(input.studentIds.slice(i, i + 250));
  }

  let transferredCount = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    for (const studentId of chunk) {
      const studentRef = doc(db, "schools", schoolId, "students", studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) continue;

      const studentData = studentSnap.data() as StudentProfile;
      const prevRollNumber = studentData.rollNumber || 0;

      let nextRollNumber = prevRollNumber;
      if (input.rollNumberMode === "sequential" && input.actionType !== "graduate") {
        currentTargetRoll += 1;
        nextRollNumber = currentTargetRoll;
      }

      const transferRecord: StudentTransferRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fromClassId: input.sourceClassId,
        fromClassName: input.sourceClassName,
        fromSectionId: input.sourceSectionId,
        fromSectionName: input.sourceSectionName,
        fromRollNumber: prevRollNumber,
        toClassId: input.targetClassId,
        toClassName: input.targetClassName,
        toSectionId: input.targetSectionId,
        toSectionName: input.targetSectionName,
        toRollNumber: nextRollNumber,
        transferDate: nowIso.split("T")[0],
        reason: input.reason || (input.actionType === "promote" ? "Annual Academic Promotion" : input.actionType === "graduate" ? "Graduation" : "Class/Section Transfer"),
        transferredBy: actorId,
        timestamp: nowIso,
      };

      const updatePayload: any = {
        updatedAt: serverTimestamp(),
        transferHistory: arrayUnion(transferRecord),
      };

      if (input.actionType === "graduate") {
        updatePayload.status = "archived";
      } else {
        updatePayload.classId = input.targetClassId;
        updatePayload.className = input.targetClassName;
        updatePayload.sectionId = input.targetSectionId;
        updatePayload.sectionName = input.targetSectionName;
        updatePayload.rollNumber = nextRollNumber;
        if (input.targetAcademicYearId) {
          updatePayload.academicYearId = input.targetAcademicYearId;
        }
      }

      batch.update(studentRef, updatePayload);
      transferredCount++;

      // If autoAssignFees is enabled and not graduated, provision fee assignment for target class
      if (input.autoAssignFees && input.actionType !== "graduate") {
        await provisionStudentFeeAssignment(
          schoolId,
          {
            id: studentId,
            name: studentData.name,
            admissionNumber: studentData.admissionNumber || studentId,
            className: input.targetClassName,
            sectionName: input.targetSectionName,
            admissionDate: studentData.admissionDate,
          },
          input.targetAcademicYearId || "ay_current"
        ).catch(() => {});
      }
    }

    await batch.commit();
  }

  return { success: true, transferredCount };
}

export interface BulkDeleteStudentsOptions {
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

export interface BulkDeleteStudentsResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  activeFreedCount?: number;
  permanent?: boolean;
  message?: string;
}

/**
 * Calls authoritative server-side API to bulk delete or archive students.
 * Enforces zero-trust server validation and Firestore batch limits.
 */
export async function bulkDeleteStudents(
  options: BulkDeleteStudentsOptions
): Promise<BulkDeleteStudentsResult> {
  const auth = getFirebaseAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => "") : "";

  const res = await fetch("/api/admin/students/bulk-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(options),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || data.message || "Bulk student deletion failed.");
  }

  return data;
}

