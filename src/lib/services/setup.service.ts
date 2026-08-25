import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AcademicYear, SchoolClass, Section, TeacherProfile, StudentProfile } from "@/types";

export interface SchoolSetupState {
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  sections: Section[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
}

/**
 * Fetches all setup related data for a school.
 */
export async function getSchoolSetupData(schoolId: string): Promise<SchoolSetupState> {
  const db = getFirebaseDb();

  const [yearsSnap, classesSnap, sectionsSnap, teachersSnap, studentsSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.ACADEMIC_YEARS), where("schoolId", "==", schoolId))),
    getDocs(query(collection(db, COLLECTIONS.CLASSES), where("schoolId", "==", schoolId))),
    getDocs(query(collection(db, COLLECTIONS.SECTIONS), where("schoolId", "==", schoolId))),
    getDocs(query(collection(db, COLLECTIONS.TEACHERS), where("schoolId", "==", schoolId))),
    getDocs(query(collection(db, COLLECTIONS.STUDENTS), where("schoolId", "==", schoolId))),
  ]);

  return {
    academicYears: yearsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AcademicYear[],
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SchoolClass[],
    sections: sectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Section[],
    teachers: teachersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TeacherProfile[],
    students: studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as StudentProfile[],
  };
}

/**
 * Saves the primary academic year for a school.
 */
export async function saveAcademicYear(
  schoolId: string,
  data: { name: string; startDate: string; endDate: string }
): Promise<string> {
  const db = getFirebaseDb();
  const yearDocRef = doc(collection(db, COLLECTIONS.ACADEMIC_YEARS));

  await setDoc(yearDocRef, {
    id: yearDocRef.id,
    schoolId,
    name: data.name.trim(),
    startDate: data.startDate,
    endDate: data.endDate,
    isCurrent: true,
    createdAt: serverTimestamp(),
  });

  return yearDocRef.id;
}

/**
 * Saves classes along with their respective sections in a single batch.
 */
export async function saveClassesAndSections(
  schoolId: string,
  classList: Array<{ name: string; sections: string[] }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  classList.forEach((c, index) => {
    const classDocRef = doc(collection(db, COLLECTIONS.CLASSES));
    batch.set(classDocRef, {
      id: classDocRef.id,
      schoolId,
      name: c.name.trim(),
      order: index + 1,
      createdAt: serverTimestamp(),
    });

    c.sections.forEach((sName) => {
      const trimmedSec = sName.trim();
      if (trimmedSec) {
        const secDocRef = doc(collection(db, COLLECTIONS.SECTIONS));
        batch.set(secDocRef, {
          id: secDocRef.id,
          schoolId,
          classId: classDocRef.id,
          name: trimmedSec,
          createdAt: serverTimestamp(),
        });
      }
    });
  });

  await batch.commit();
}

/**
 * Saves initial teachers list.
 */
export async function saveInitialTeachers(
  schoolId: string,
  teachers: Array<{ name: string; email: string; phone?: string; subjects?: string[] }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  teachers.forEach((t) => {
    if (t.name.trim() && t.email.trim()) {
      const docRef = doc(collection(db, COLLECTIONS.TEACHERS));
      batch.set(docRef, {
        id: docRef.id,
        schoolId,
        name: t.name.trim(),
        email: t.email.trim().toLowerCase(),
        phone: t.phone?.trim() || "",
        subjects: t.subjects || [],
        createdAt: serverTimestamp(),
      });
    }
  });

  await batch.commit();
}

/**
 * Saves initial students list.
 */
export async function saveInitialStudents(
  schoolId: string,
  students: Array<{ name: string; rollNumber?: string; classId: string; sectionId?: string; parentPhone?: string }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  students.forEach((s) => {
    if (s.name.trim() && s.classId) {
      const docRef = doc(collection(db, COLLECTIONS.STUDENTS));
      batch.set(docRef, {
        id: docRef.id,
        schoolId,
        name: s.name.trim(),
        rollNumber: s.rollNumber?.trim() || "",
        classId: s.classId,
        sectionId: s.sectionId || "",
        parentPhone: s.parentPhone?.trim() || "",
        createdAt: serverTimestamp(),
      });
    }
  });

  await batch.commit();
}

/**
 * Marks the school setup process as finished.
 */
export async function completeSchoolSetup(schoolId: string): Promise<void> {
  const db = getFirebaseDb();
  const schoolDocRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(schoolDocRef, {
    setupCompleted: true,
    setupStep: 6,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates the current setup progress step.
 */
export async function updateSetupStep(schoolId: string, step: number): Promise<void> {
  const db = getFirebaseDb();
  const schoolDocRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(schoolDocRef, {
    setupStep: step,
    updatedAt: serverTimestamp(),
  });
}
