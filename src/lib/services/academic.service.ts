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
import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  getCanonicalSectionKey,
  getCanonicalSectionCode,
} from "@/lib/utils/academic-normalizer";

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
 * Deduplicates classes by canonical key in-memory so duplicate documents in Firestore never corrupt the UI.
 */
export const getClasses = getClassesWithSections;

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

    // Group class documents by canonical key to deduplicate
    const canonicalMap = new Map<
      string,
      {
        primaryDoc: any;
        allDocs: any[];
        sections: Map<string, Section>;
      }
    >();

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const canonicalKey = getCanonicalClassKey(classData.name || "");

      // Fetch sections for this class document
      const sectionsQuery = query(
        collection(db, "schools", schoolId, "classes", classDoc.id, "sections"),
        orderBy("name", "asc")
      );
      const sectionsSnapshot = await getDocs(sectionsQuery);
      const docSections = sectionsSnapshot.docs.map((sDoc) => ({
        id: sDoc.id,
        ...sDoc.data(),
        name: normalizeSectionName(sDoc.data().name),
      })) as Section[];

      if (!canonicalMap.has(canonicalKey)) {
        const secMap = new Map<string, Section>();
        docSections.forEach((s) => {
          const sKey = getCanonicalSectionKey(s.name);
          if (!secMap.has(sKey)) secMap.set(sKey, s);
        });
        canonicalMap.set(canonicalKey, {
          primaryDoc: { id: classDoc.id, ...classData },
          allDocs: [{ id: classDoc.id, ...classData }],
          sections: secMap,
        });
      } else {
        const group = canonicalMap.get(canonicalKey)!;
        group.allDocs.push({ id: classDoc.id, ...classData });
        // Merge sections without duplicates
        docSections.forEach((s) => {
          const sKey = getCanonicalSectionKey(s.name);
          if (!group.sections.has(sKey)) {
            group.sections.set(sKey, s);
          }
        });
      }
    }

    const classes: SchoolClass[] = [];

    canonicalMap.forEach((group) => {
      const canonicalName = normalizeClassName(group.primaryDoc.name);
      const canonicalOrder =
        group.primaryDoc.order !== undefined && group.primaryDoc.order !== 999
          ? group.primaryDoc.order
          : getCanonicalClassOrder(canonicalName);

      // Sort sections by code ("A", "B", "C"...)
      const sortedSections = Array.from(group.sections.values()).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      // Ensure at least Section A exists
      if (sortedSections.length === 0) {
        sortedSections.push({
          id: `sec_${group.primaryDoc.id}_default`,
          classId: group.primaryDoc.id,
          schoolId,
          name: "Section A",
          createdAt: group.primaryDoc.createdAt,
        } as any);
      }

      classes.push({
        ...group.primaryDoc,
        name: canonicalName,
        order: canonicalOrder,
        sections: sortedSections,
      } as SchoolClass);
    });

    // Deterministic sorting: by order asc, then name asc
    classes.sort((a, b) => {
      const orderA = a.order ?? getCanonicalClassOrder(a.name);
      const orderB = b.order ?? getCanonicalClassOrder(b.name);
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || "").localeCompare(b.name || "");
    });

    return classes;
  } catch (error: any) {
    console.warn("Could not fetch classes/sections:", error?.message);
    return [];
  }
}

import { createFeeStructure } from "./fee.service";

/**
 * Creates a new class or reuses an existing class if one with the same normalized name already exists.
 * Path: schools/{schoolId}/classes/{classId}
 */
export async function createClass(
  schoolId: string,
  data: {
    name: string;
    order?: number;
    academicYearId?: string;
    classTeacherId?: string;
    classTeacherName?: string;
    initialSections?: string[];
    monthlyFee?: number;
    admissionFee?: number;
    otherFee?: number;
  }
): Promise<string> {
  const db = getFirebaseDb();
  const canonicalName = normalizeClassName(data.name);
  const targetKey = getCanonicalClassKey(canonicalName);

  // Check if class with same canonical key already exists
  const existingClassesSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
  let existingClassDoc: any = null;
  for (const docSnap of existingClassesSnap.docs) {
    if (getCanonicalClassKey(docSnap.data().name) === targetKey) {
      existingClassDoc = docSnap;
      break;
    }
  }

  if (existingClassDoc) {
    const classId = existingClassDoc.id;
    // Check if any initialSections are missing under this existing class
    if (data.initialSections && data.initialSections.length > 0) {
      const existingSectionsSnap = await getDocs(
        collection(db, "schools", schoolId, "classes", classId, "sections")
      );
      const existingSecKeys = new Set(
        existingSectionsSnap.docs.map((d) => getCanonicalSectionKey(d.data().name))
      );

      for (const sName of data.initialSections) {
        const sKey = getCanonicalSectionKey(sName);
        if (!existingSecKeys.has(sKey)) {
          const secDocRef = doc(collection(db, "schools", schoolId, "classes", classId, "sections"));
          await setDoc(secDocRef, {
            id: secDocRef.id,
            schoolId,
            classId,
            name: normalizeSectionName(sName),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          existingSecKeys.add(sKey);
        }
      }
    }
    return classId;
  }

  // 1. Authoritative Backend Check: Feature Access & Plan Limit
  await requireFeatureAccess(schoolId, "class_management");
  await requirePlanLimit(schoolId, "classes");

  const classDocRef = doc(collection(db, "schools", schoolId, "classes"));
  const classId = classDocRef.id;

  const batch = writeBatch(db);

  batch.set(classDocRef, {
    id: classId,
    schoolId,
    name: canonicalName,
    order: data.order ?? getCanonicalClassOrder(canonicalName),
    academicYearId: data.academicYearId || "",
    classTeacherId: data.classTeacherId || "",
    classTeacherName: data.classTeacherName || "",
    monthlyFee: data.monthlyFee ?? 0,
    admissionFee: data.admissionFee ?? 0,
    otherFee: data.otherFee ?? 0,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // If classTeacherId is assigned, synchronize teacher profile
  if (data.classTeacherId) {
    const teacherDocRef = doc(db, "schools", schoolId, "teachers", data.classTeacherId);
    batch.update(teacherDocRef, {
      assignedClassId: classId,
      assignedClassName: canonicalName,
      updatedAt: serverTimestamp(),
    });
  }

  // Create initial sections if provided
  const sectionsToCreate =
    data.initialSections && data.initialSections.length > 0
      ? data.initialSections
      : ["A"];

  sectionsToCreate.forEach((sName) => {
    const secCanonicalName = normalizeSectionName(sName);
    const secDocRef = doc(
      collection(db, "schools", schoolId, "classes", classId, "sections")
    );
    batch.set(secDocRef, {
      id: secDocRef.id,
      schoolId,
      classId,
      name: secCanonicalName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
 * Resolves or atomically creates a canonical class and section in the school's Class Master.
 * Ensures stable unique classId, canonical className, sectionId, and canonical sectionName.
 */
export async function getOrCreateCanonicalClassAndSection(
  schoolId: string,
  rawClassName: string,
  rawSectionName?: string
): Promise<{ classId: string; className: string; sectionId: string; sectionName: string }> {
  const db = getFirebaseDb();
  const canonicalClassName = normalizeClassName(rawClassName);
  const targetClassKey = getCanonicalClassKey(canonicalClassName);
  const canonicalSectionName = normalizeSectionName(rawSectionName);
  const targetSecKey = getCanonicalSectionKey(canonicalSectionName);

  // 1. Fetch classes to locate matching class
  const classesSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
  let classDocRef: any = null;
  let classId = "";

  for (const docSnap of classesSnap.docs) {
    if (getCanonicalClassKey(docSnap.data().name) === targetClassKey) {
      classDocRef = docSnap;
      classId = docSnap.id;
      break;
    }
  }

  // If class does not exist, create it
  if (!classDocRef) {
    const newClassRef = doc(collection(db, "schools", schoolId, "classes"));
    classId = newClassRef.id;
    await setDoc(newClassRef, {
      id: classId,
      schoolId,
      name: canonicalClassName,
      order: getCanonicalClassOrder(canonicalClassName),
      academicYearId: "",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 2. Fetch sections under this class to locate matching section
  const sectionsSnap = await getDocs(
    collection(db, "schools", schoolId, "classes", classId, "sections")
  );
  let sectionDocRef: any = null;
  let sectionId = "";

  for (const sDoc of sectionsSnap.docs) {
    if (getCanonicalSectionKey(sDoc.data().name) === targetSecKey) {
      sectionDocRef = sDoc;
      sectionId = sDoc.id;
      break;
    }
  }

  // If section does not exist under this class, create it
  if (!sectionDocRef) {
    const newSecRef = doc(
      collection(db, "schools", schoolId, "classes", classId, "sections")
    );
    sectionId = newSecRef.id;
    await setDoc(newSecRef, {
      id: sectionId,
      schoolId,
      classId,
      name: canonicalSectionName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return {
    classId,
    className: canonicalClassName,
    sectionId,
    sectionName: canonicalSectionName,
  };
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
    classTeacherId?: string;
    classTeacherName?: string;
    monthlyFee?: number;
    admissionFee?: number;
    otherFee?: number;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const classDocRef = doc(db, "schools", schoolId, "classes", classId);

  // If classTeacherId is explicitly updated, handle teacher sync
  if (data.classTeacherId !== undefined) {
    const existingSnap = await getDoc(classDocRef).catch(() => null);
    const existingData = existingSnap?.data();
    const prevTeacherId = existingData?.classTeacherId;

    const batch = writeBatch(db);
    batch.update(classDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    // Unassign previous teacher if different
    if (prevTeacherId && prevTeacherId !== data.classTeacherId) {
      const prevRef = doc(db, "schools", schoolId, "teachers", prevTeacherId);
      batch.update(prevRef, {
        assignedClassId: "",
        assignedClassName: "",
        updatedAt: serverTimestamp(),
      });
    }

    // Assign new teacher
    if (data.classTeacherId) {
      const newRef = doc(db, "schools", schoolId, "teachers", data.classTeacherId);
      batch.update(newRef, {
        assignedClassId: classId,
        assignedClassName: data.name || existingData?.name || "",
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return;
  }

  await updateDoc(classDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Authoritatively assigns a teacher as the designated Class Teacher of a class.
 * Atomically synchronizes class.classTeacherId and teacher.assignedClassId.
 */
export async function assignClassTeacher(
  schoolId: string,
  classId: string,
  teacherId: string,
  teacherName: string
): Promise<void> {
  const db = getFirebaseDb();
  const classDocRef = doc(db, "schools", schoolId, "classes", classId);
  const classSnap = await getDoc(classDocRef);
  if (!classSnap.exists()) throw new Error("Class not found.");

  const classData = classSnap.data();
  const prevTeacherId = classData?.classTeacherId;

  const batch = writeBatch(db);

  // 1. Update class record
  batch.update(classDocRef, {
    classTeacherId: teacherId,
    classTeacherName: teacherName.trim(),
    updatedAt: serverTimestamp(),
  });

  // 2. Unassign previous teacher if different
  if (prevTeacherId && prevTeacherId !== teacherId) {
    const prevRef = doc(db, "schools", schoolId, "teachers", prevTeacherId);
    batch.update(prevRef, {
      assignedClassId: "",
      assignedClassName: "",
      updatedAt: serverTimestamp(),
    });
  }

  // 3. Assign new teacher
  if (teacherId) {
    const newRef = doc(db, "schools", schoolId, "teachers", teacherId);
    batch.update(newRef, {
      assignedClassId: classId,
      assignedClassName: classData.name,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Removes the Class Teacher assignment from a class.
 */
export async function removeClassTeacher(
  schoolId: string,
  classId: string
): Promise<void> {
  const db = getFirebaseDb();
  const classDocRef = doc(db, "schools", schoolId, "classes", classId);
  const classSnap = await getDoc(classDocRef);
  if (!classSnap.exists()) return;

  const classData = classSnap.data();
  const prevTeacherId = classData?.classTeacherId;

  const batch = writeBatch(db);
  batch.update(classDocRef, {
    classTeacherId: "",
    classTeacherName: "",
    updatedAt: serverTimestamp(),
  });

  if (prevTeacherId) {
    const prevRef = doc(db, "schools", schoolId, "teachers", prevTeacherId);
    batch.update(prevRef, {
      assignedClassId: "",
      assignedClassName: "",
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
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
