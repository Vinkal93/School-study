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
  type Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  requireFeatureAccess,
  requirePlanLimit,
  incrementSchoolUsage,
  decrementSchoolUsage,
} from "@/lib/billing";
import type { AcademicYear, SchoolClass, Section } from "@/types";

// ==========================================
// 1. ACADEMIC YEARS
// ==========================================

/**
 * Fetches all academic years for a school.
 */
export async function getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "schools", schoolId, "academicYears"),
      orderBy("startDate", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AcademicYear[];
  } catch (error: any) {
    console.warn("Could not fetch academic years:", error?.message);
    return [];
  }
}

/**
 * Creates a new academic year under schools/{schoolId}/academicYears/{yearId}.
 */
export async function createAcademicYear(
  schoolId: string,
  data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }
): Promise<string> {
  const db = getFirebaseDb();
  const yearDocRef = doc(collection(db, "schools", schoolId, "academicYears"));

  const batch = writeBatch(db);

  // If this year is set as current, unset any other current year
  if (data.isCurrent) {
    const existingYears = await getAcademicYears(schoolId);
    existingYears.forEach((y) => {
      if (y.isCurrent) {
        const ref = doc(db, "schools", schoolId, "academicYears", y.id);
        batch.update(ref, { isCurrent: false });
      }
    });
  }

  batch.set(yearDocRef, {
    ...data,
    isCurrent: data.isCurrent ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return yearDocRef.id;
}

/**
 * Sets an academic year as the active/current year.
 */
export async function setCurrentAcademicYear(
  schoolId: string,
  yearId: string
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  const existingYears = await getAcademicYears(schoolId);
  existingYears.forEach((y) => {
    const ref = doc(db, "schools", schoolId, "academicYears", y.id);
    batch.update(ref, { isCurrent: y.id === yearId });
  });

  await batch.commit();
}

// ==========================================
// 2. CLASSES & SECTIONS
// ==========================================

/**
 * Fetches all classes with their respective sections for a school.
 */
export async function getClassesWithSections(
  schoolId: string
): Promise<SchoolClass[]> {
  if (!schoolId || schoolId === "system") {
    return [];
  }
  try {
    const db = getFirebaseDb();
    const classesQuery = query(
      collection(db, "schools", schoolId, "classes"),
      orderBy("order", "asc")
    );
    const classesSnapshot = await getDocs(classesQuery);

    const classes: SchoolClass[] = [];

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const sectionsQuery = query(
        collection(db, "schools", schoolId, "classes", classDoc.id, "sections"),
        orderBy("name", "asc")
      );
      const sectionsSnapshot = await getDocs(sectionsQuery);

      const sections = sectionsSnapshot.docs.map((sDoc) => ({
        id: sDoc.id,
        ...sDoc.data(),
      })) as Section[];

      classes.push({
        id: classDoc.id,
        ...classData,
        sections,
      } as SchoolClass);
    }

    return classes;
  } catch (error: any) {
    console.warn("Could not fetch classes/sections:", error?.message);
    return [];
  }
}

import { createFeeStructure } from "./fee.service";

/**
 * Creates a new class with an auto-generated random document ID.
 * Path: schools/{schoolId}/classes/{classId}
 */
export async function createClass(
  schoolId: string,
  data: {
    name: string;
    order?: number;
    academicYearId?: string;
    initialSections?: string[];
    monthlyFee?: number;
    admissionFee?: number;
    otherFee?: number;
  }
): Promise<string> {
  const db = getFirebaseDb();

  // 1. Authoritative Backend Check: Feature Access & Plan Limit
  await requireFeatureAccess(schoolId, "class_management");
  await requirePlanLimit(schoolId, "classes");

  const classDocRef = doc(collection(db, "schools", schoolId, "classes"));
  const classId = classDocRef.id;

  const batch = writeBatch(db);

  batch.set(classDocRef, {
    id: classId,
    schoolId,
    name: data.name.trim(),
    order: data.order ?? 1,
    academicYearId: data.academicYearId || "",
    monthlyFee: data.monthlyFee ?? 0,
    admissionFee: data.admissionFee ?? 0,
    otherFee: data.otherFee ?? 0,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create initial sections if provided
  const sectionsToCreate =
    data.initialSections && data.initialSections.length > 0
      ? data.initialSections
      : ["A"];

  sectionsToCreate.forEach((sName) => {
    const trimmed = sName.trim().toUpperCase();
    if (trimmed) {
      const secDocRef = doc(
        collection(db, "schools", schoolId, "classes", classId, "sections")
      );
      batch.set(secDocRef, {
        id: secDocRef.id,
        schoolId,
        classId,
        name: trimmed.startsWith("Section ") ? trimmed : `Section ${trimmed}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  await batch.commit();

  // 2. Increment usage count atomically
  await incrementSchoolUsage(schoolId, "classes", 1);

  // 3. Auto-link Fee Structures if fee amounts specified
  if (data.monthlyFee && data.monthlyFee > 0) {
    try {
      await createFeeStructure(
        schoolId,
        {
          academicYearId: data.academicYearId || "ay_current",
          academicYearName: "Current Session",
          className: data.name.trim(),
          feeType: "tuition",
          title: `${data.name.trim()} Monthly Tuition Fee`,
          amountRupees: data.monthlyFee,
          frequency: "monthly",
        },
        "admin"
      );
    } catch (fErr) {
      console.warn("Auto fee structure creation notice:", fErr);
    }
  }

  if (data.admissionFee && data.admissionFee > 0) {
    try {
      await createFeeStructure(
        schoolId,
        {
          academicYearId: data.academicYearId || "ay_current",
          academicYearName: "Current Session",
          className: data.name.trim(),
          feeType: "admission",
          title: `${data.name.trim()} Admission Fee`,
          amountRupees: data.admissionFee,
          frequency: "one_time",
        },
        "admin"
      );
    } catch (fErr) {
      console.warn("Auto fee structure creation notice:", fErr);
    }
  }

  return classId;
}

/**
 * Updates a class's name, order, academic year, or fees.
 */
export async function updateClass(
  schoolId: string,
  classId: string,
  data: {
    name?: string;
    order?: number;
    academicYearId?: string;
    monthlyFee?: number;
    admissionFee?: number;
    otherFee?: number;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const classDocRef = doc(db, "schools", schoolId, "classes", classId);
  await updateDoc(classDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggles a class between active and inactive.
 */
export async function toggleClassStatus(
  schoolId: string,
  classId: string,
  status: "active" | "inactive"
): Promise<void> {
  const db = getFirebaseDb();
  const classDocRef = doc(db, "schools", schoolId, "classes", classId);
  await updateDoc(classDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a class and all its subcollection sections and decrements usage count atomically.
 * Prevents accidental deletion if active students are still enrolled.
 */
export async function deleteClass(
  schoolId: string,
  classId: string
): Promise<void> {
  const db = getFirebaseDb();

  // Safety check: ensure no active students are enrolled in this class
  const studentsSnap = await getDocs(
    query(
      collection(db, "schools", schoolId, "students"),
      where("classId", "==", classId),
      where("status", "==", "active")
    )
  );
  if (!studentsSnap.empty) {
    throw new Error(
      `Cannot delete class: ${studentsSnap.size} active student(s) are enrolled. Please transfer or archive them first.`
    );
  }

  const sectionsSnapshot = await getDocs(
    collection(db, "schools", schoolId, "classes", classId, "sections")
  );

  const batch = writeBatch(db);
  sectionsSnapshot.docs.forEach((secDoc) => {
    batch.delete(secDoc.ref);
  });

  const classDocRef = doc(db, "schools", schoolId, "classes", classId);
  batch.delete(classDocRef);

  await batch.commit();

  // Decrement usage count atomically
  await decrementSchoolUsage(schoolId, "classes", 1);
}

/**
 * Creates a section under a class with an auto-generated random document ID.
 * Path: schools/{schoolId}/classes/{classId}/sections/{sectionId}
 */
export async function createSection(
  schoolId: string,
  classId: string,
  data: { name: string }
): Promise<string> {
  const db = getFirebaseDb();
  const secDocRef = doc(
    collection(db, "schools", schoolId, "classes", classId, "sections")
  );
  const trimmed = data.name.trim().toUpperCase();
  const sectionName = trimmed.startsWith("SECTION ")
    ? trimmed
    : `Section ${trimmed}`;

  await setDoc(secDocRef, {
    id: secDocRef.id,
    schoolId,
    classId,
    name: sectionName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return secDocRef.id;
}

/**
 * Updates a section name.
 */
export async function updateSection(
  schoolId: string,
  classId: string,
  sectionId: string,
  data: { name: string }
): Promise<void> {
  const db = getFirebaseDb();
  const secDocRef = doc(
    db,
    "schools",
    schoolId,
    "classes",
    classId,
    "sections",
    sectionId
  );
  const trimmed = data.name.trim().toUpperCase();
  const sectionName = trimmed.startsWith("SECTION ")
    ? trimmed
    : `Section ${trimmed}`;

  await updateDoc(secDocRef, {
    name: sectionName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a section.
 */
export async function deleteSection(
  schoolId: string,
  classId: string,
  sectionId: string
): Promise<void> {
  const db = getFirebaseDb();
  const secDocRef = doc(
    db,
    "schools",
    schoolId,
    "classes",
    classId,
    "sections",
    sectionId
  );
  await deleteDoc(secDocRef);
}
