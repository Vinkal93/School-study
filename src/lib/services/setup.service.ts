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
import { COLLECTIONS } from "@/lib/utils/constants";
import type {
  School,
  AcademicYear,
  SchoolClass,
  Section,
  TeacherProfile,
  StudentProfile,
  CreateTeacherInput,
  CreateStudentInput,
} from "@/types";
import { createTeacherWithAuth, toggleTeacherStatus } from "./teacher.service";
import { createStudentWithAuth, deleteStudent } from "./student.service";

export interface SchoolInfoInput {
  name: string;
  code: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
}

export interface OnboardingClassItem {
  id?: string;
  name: string;
  sections: Array<{ id?: string; name: string }>;
}

export interface FullOnboardingState {
  school: School | null;
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
}

/**
 * Loads the complete onboarding state from Firestore database.
 */
export async function getSchoolOnboardingState(schoolId: string): Promise<FullOnboardingState> {
  const db = getFirebaseDb();
  if (!db || !schoolId) {
    throw new Error("Invalid school context or database offline.");
  }

  // 1. Fetch School Document
  const schoolSnap = await getDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId));
  const school = schoolSnap.exists()
    ? ({ id: schoolSnap.id, ...schoolSnap.data() } as School)
    : null;

  // 2. Fetch Academic Years, Classes, Teachers, Students in parallel
  const [yearsSnap, classesSnap, teachersSnap, studentsSnap] = await Promise.all([
    getDocs(query(collection(db, "schools", schoolId, "academicYears"), orderBy("startDate", "desc"))).catch(() => null),
    getDocs(query(collection(db, "schools", schoolId, "classes"), orderBy("order", "asc"))).catch(() => null),
    getDocs(query(collection(db, "schools", schoolId, "teachers"), orderBy("name", "asc"))).catch(() => null),
    getDocs(query(collection(db, "schools", schoolId, "students"), orderBy("name", "asc"))).catch(() => null),
  ]);

  const academicYears = (yearsSnap?.docs.map((d) => ({ id: d.id, ...d.data() })) || []) as AcademicYear[];
  const rawClasses = (classesSnap?.docs.map((d) => ({ id: d.id, ...d.data() })) || []) as SchoolClass[];

  // Fetch sections for each class
  const classes: SchoolClass[] = [];
  for (const c of rawClasses) {
    try {
      const secSnap = await getDocs(
        query(collection(db, "schools", schoolId, "classes", c.id, "sections"), orderBy("name", "asc"))
      );
      const sections = secSnap.docs.map((sDoc) => ({ id: sDoc.id, ...sDoc.data() })) as Section[];
      classes.push({ ...c, sections });
    } catch {
      classes.push({ ...c, sections: [] });
    }
  }

  const teachers = (teachersSnap?.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t: any) => t.status !== "deleted") || []) as TeacherProfile[];

  const students = (studentsSnap?.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s: any) => s.status !== "deleted") || []) as StudentProfile[];

  // Calculate resume step
  const savedCurrentStep = school?.onboardingCurrentStep || school?.setupStep || 1;
  const savedCompletedSteps = school?.onboardingCompletedSteps || [];
  const isCompleted = Boolean(school?.onboardingCompleted || school?.setupCompleted);

  return {
    school,
    academicYears,
    classes,
    teachers,
    students,
    currentStep: isCompleted ? 5 : Math.max(1, Math.min(5, savedCurrentStep)),
    completedSteps: savedCompletedSteps,
    isCompleted,
  };
}

/**
 * Step 1: Save School Information & Branding.
 * Updates the school document and marks Step 1 complete.
 */
export async function saveSchoolInfoStep(
  schoolId: string,
  info: SchoolInfoInput
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  if (!info.name || !info.name.trim()) {
    throw new Error("School Name is required.");
  }
  if (!info.code || !info.code.trim()) {
    throw new Error("School Code is required.");
  }

  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const currentSnap = await getDoc(schoolRef);
  const currentData = currentSnap.data() as Partial<School> | undefined;

  const existingCompletedSteps = new Set<number>(currentData?.onboardingCompletedSteps || []);
  existingCompletedSteps.add(1);

  await updateDoc(schoolRef, {
    name: info.name.trim(),
    code: info.code.trim().toUpperCase(),
    logoUrl: info.logoUrl || currentData?.logoUrl || "",
    address: info.address?.trim() || "",
    city: info.city?.trim() || "",
    state: info.state?.trim() || "",
    pincode: info.pincode?.trim() || "",
    phone: info.phone?.trim() || "",
    email: info.email?.trim() || "",
    website: info.website?.trim() || "",
    description: info.description?.trim() || "",
    primaryContactName: info.primaryContactName?.trim() || "",
    primaryContactPhone: info.primaryContactPhone?.trim() || info.phone?.trim() || "",
    primaryContactEmail: info.primaryContactEmail?.trim() || info.email?.trim() || "",
    onboardingStatus: "in_progress",
    onboardingCurrentStep: Math.max(currentData?.onboardingCurrentStep || 1, 2),
    onboardingCompletedSteps: Array.from(existingCompletedSteps),
    onboardingStartedAt: currentData?.onboardingStartedAt || serverTimestamp(),
    setupStep: Math.max(currentData?.setupStep || 1, 2),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Step 2: Save Academic Year.
 * Validates dates, creates/activates the academic year, sets isCurrent = true.
 */
export async function saveAcademicYearStep(
  schoolId: string,
  data: {
    name: string;
    startDate: string;
    endDate: string;
    existingYearId?: string;
  }
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  if (!data.name || !data.name.trim()) {
    throw new Error("Academic Year Name is required (e.g. 2026-2027).");
  }
  if (!data.startDate) {
    throw new Error("Start Date is required.");
  }
  if (!data.endDate) {
    throw new Error("End Date is required.");
  }

  const startMs = new Date(data.startDate).getTime();
  const endMs = new Date(data.endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    throw new Error("Invalid date format provided.");
  }
  if (startMs >= endMs) {
    throw new Error("Start Date must be earlier than End Date.");
  }

  const batch = writeBatch(db);

  // Deactivate any currently active academic years for this school
  const yearsColl = collection(db, "schools", schoolId, "academicYears");
  const existingYearsSnap = await getDocs(yearsColl);
  existingYearsSnap.docs.forEach((d) => {
    if (d.data().isCurrent) {
      batch.update(d.ref, { isCurrent: false, updatedAt: serverTimestamp() });
    }
  });

  let yearId = data.existingYearId;
  if (yearId) {
    const existingRef = doc(db, "schools", schoolId, "academicYears", yearId);
    batch.set(
      existingRef,
      {
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    const newRef = doc(collection(db, "schools", schoolId, "academicYears"));
    yearId = newRef.id;
    batch.set(newRef, {
      id: yearId,
      schoolId,
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Update school progress
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const schoolData = schoolSnap.data();
  const completedSteps = new Set<number>(schoolData?.onboardingCompletedSteps || []);
  completedSteps.add(2);

  batch.update(schoolRef, {
    onboardingCurrentStep: Math.max(schoolData?.onboardingCurrentStep || 2, 3),
    onboardingCompletedSteps: Array.from(completedSteps),
    setupStep: Math.max(schoolData?.setupStep || 2, 3),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return yearId;
}

/**
 * Step 3: Save Classes and Sections.
 * Validates unique class names and unique section names.
 * Persists directly to schools/{schoolId}/classes and sections subcollections.
 */
export async function saveClassSectionStep(
  schoolId: string,
  classList: OnboardingClassItem[]
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  if (!classList || classList.length === 0) {
    throw new Error("At least one class is required before proceeding.");
  }

  // Check for duplicate class names
  const classNamesSeen = new Set<string>();
  for (const c of classList) {
    const cleanName = c.name.trim();
    if (!cleanName) {
      throw new Error("Class name cannot be empty.");
    }
    const lowerName = cleanName.toLowerCase();
    if (classNamesSeen.has(lowerName)) {
      throw new Error(`Duplicate class name: "${cleanName}". Each class must have a unique name.`);
    }
    classNamesSeen.add(lowerName);

    // Check for duplicate section names inside this class
    const secNamesSeen = new Set<string>();
    for (const sec of c.sections) {
      const cleanSec = sec.name.trim().toUpperCase();
      if (!cleanSec) continue;
      if (secNamesSeen.has(cleanSec)) {
        throw new Error(`Duplicate section "${cleanSec}" in class "${cleanName}".`);
      }
      secNamesSeen.add(cleanSec);
    }
  }

  // Fetch existing classes to preserve document IDs where possible or delete removed
  const existingClassesSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
  const existingClassesMap = new Map<string, string>(); // name -> id
  existingClassesSnap.docs.forEach((d) => {
    existingClassesMap.set((d.data().name || "").toLowerCase(), d.id);
  });

  const batch = writeBatch(db);

  for (let idx = 0; idx < classList.length; idx++) {
    const c = classList[idx];
    const cleanName = c.name.trim();
    const existingId = c.id || existingClassesMap.get(cleanName.toLowerCase());

    const classDocRef = existingId
      ? doc(db, "schools", schoolId, "classes", existingId)
      : doc(collection(db, "schools", schoolId, "classes"));

    const classId = classDocRef.id;

    batch.set(
      classDocRef,
      {
        id: classId,
        schoolId,
        name: cleanName,
        order: idx + 1,
        status: "active",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Sections for this class
    const sectionsToSave = c.sections.length > 0 ? c.sections : [{ name: "A" }];
    for (const sec of sectionsToSave) {
      const cleanSec = sec.name.trim().toUpperCase();
      if (!cleanSec) continue;

      const secDocRef = sec.id
        ? doc(db, "schools", schoolId, "classes", classId, "sections", sec.id)
        : doc(collection(db, "schools", schoolId, "classes", classId, "sections"));

      batch.set(
        secDocRef,
        {
          id: secDocRef.id,
          schoolId,
          classId,
          name: cleanSec,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  // Update school onboarding progress
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const schoolData = schoolSnap.data();
  const completedSteps = new Set<number>(schoolData?.onboardingCompletedSteps || []);
  completedSteps.add(3);

  batch.update(schoolRef, {
    onboardingCurrentStep: Math.max(schoolData?.onboardingCurrentStep || 3, 4),
    onboardingCompletedSteps: Array.from(completedSteps),
    setupStep: Math.max(schoolData?.setupStep || 3, 4),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Step 4: Add teacher during onboarding using the authoritative teacher creation pipeline.
 */
export async function addTeacherInOnboarding(
  schoolId: string,
  input: CreateTeacherInput
): Promise<{ teacherId: string; userId: string; teacherCode: string }> {
  const result = await createTeacherWithAuth(schoolId, input);

  // Update progress
  const db = getFirebaseDb();
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const completedSteps = new Set<number>(schoolSnap.data()?.onboardingCompletedSteps || []);
  completedSteps.add(4);

  await updateDoc(schoolRef, {
    onboardingCompletedSteps: Array.from(completedSteps),
    updatedAt: serverTimestamp(),
  });

  return result;
}

/**
 * Step 5: Add student during onboarding using the authoritative student creation pipeline.
 */
export async function addStudentInOnboarding(
  schoolId: string,
  input: CreateStudentInput
): Promise<{ studentId: string; userId: string; admissionNumber: string; rollNumber: number }> {
  const result = await createStudentWithAuth(schoolId, input);

  // Update progress
  const db = getFirebaseDb();
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const completedSteps = new Set<number>(schoolSnap.data()?.onboardingCompletedSteps || []);
  completedSteps.add(5);

  await updateDoc(schoolRef, {
    onboardingCompletedSteps: Array.from(completedSteps),
    updatedAt: serverTimestamp(),
  });

  return result;
}

/**
 * Completes the onboarding wizard authoritatively.
 * Validates that required data (Step 1, Step 2, Step 3) exists in the database.
 */
export async function completeSchoolOnboarding(schoolId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  // Validation: Verify Step 1 (School name & code exist)
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const schoolSnap = await getDoc(schoolRef);
  if (!schoolSnap.exists()) {
    throw new Error("School not found.");
  }
  const sData = schoolSnap.data();
  if (!sData.name || !sData.code) {
    throw new Error("School information is incomplete. Please complete Step 1.");
  }

  // Validation: Verify Step 2 (At least one Academic Year exists)
  const yearsSnap = await getDocs(collection(db, "schools", schoolId, "academicYears"));
  if (yearsSnap.empty) {
    throw new Error("An Academic Year must be configured. Please complete Step 2.");
  }

  // Validation: Verify Step 3 (At least one Class exists)
  const classesSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
  if (classesSnap.empty) {
    throw new Error("At least one Class must be configured. Please complete Step 3.");
  }

  // Mark onboarding complete
  const nowIso = new Date().toISOString();
  await updateDoc(schoolRef, {
    onboardingCompleted: true,
    setupCompleted: true,
    onboardingStatus: "completed",
    onboardingCurrentStep: 5,
    onboardingCompletedSteps: [1, 2, 3, 4, 5],
    onboardingCompletedAt: nowIso,
    setupStep: 6,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates the current progress step in Firestore without saving step data.
 */
export async function updateOnboardingStep(schoolId: string, step: number): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return;

  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(schoolRef, {
    onboardingCurrentStep: Math.max(1, Math.min(5, step)),
    setupStep: Math.max(1, Math.min(6, step)),
    updatedAt: serverTimestamp(),
  });
}

// =========================================================================
// BACKWARD-COMPATIBILITY EXPORTS (Preserving existing signatures for tests/legacy callers)
// =========================================================================

export async function getSchoolSetupData(schoolId: string) {
  const state = await getSchoolOnboardingState(schoolId);
  return {
    academicYears: state.academicYears,
    classes: state.classes,
    sections: state.classes.flatMap((c) => c.sections || []),
    teachers: state.teachers,
    students: state.students,
  };
}

export async function saveAcademicYear(
  schoolId: string,
  data: { name: string; startDate: string; endDate: string }
): Promise<string> {
  return await saveAcademicYearStep(schoolId, data);
}

export async function saveClassesAndSections(
  schoolId: string,
  classList: Array<{ name: string; sections: string[] }>
): Promise<void> {
  const transformed: OnboardingClassItem[] = classList.map((c) => ({
    name: c.name,
    sections: c.sections.map((s) => ({ name: s })),
  }));
  await saveClassSectionStep(schoolId, transformed);
}

export async function saveInitialTeachers(
  schoolId: string,
  teachers: Array<{ name: string; email: string; phone?: string; subjects?: string[] }>
): Promise<void> {
  for (const t of teachers) {
    if (t.name.trim() && t.email.trim()) {
      await addTeacherInOnboarding(schoolId, {
        teacherCode: "",
        name: t.name,
        email: t.email,
        password: (t.phone || "password123").replace(/\D/g, "") || "password123",
        phone: t.phone,
        subjects: t.subjects,
      });
    }
  }
}

export async function saveInitialStudents(
  schoolId: string,
  students: Array<{ name: string; rollNumber?: string; classId: string; sectionId?: string; parentPhone?: string }>
): Promise<void> {
  for (const s of students) {
    if (s.name.trim() && s.classId) {
      await addStudentInOnboarding(schoolId, {
        name: s.name,
        email: `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@school.com`,
        password: (s.parentPhone || "student123").replace(/\D/g, "") || "student123",
        gender: "male",
        classId: s.classId,
        className: s.classId,
        sectionId: s.sectionId || "",
        sectionName: s.sectionId || "A",
        rollNumber: s.rollNumber ? parseInt(s.rollNumber) : undefined,
        phone: s.parentPhone,
      });
    }
  }
}

export async function completeSchoolSetup(schoolId: string): Promise<void> {
  await completeSchoolOnboarding(schoolId);
}

export async function updateSetupStep(schoolId: string, step: number): Promise<void> {
  await updateOnboardingStep(schoolId, step);
}
