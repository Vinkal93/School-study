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
 * Fetches all setup related data for a school from tenant subcollections.
 */
export async function getSchoolSetupData(schoolId: string): Promise<SchoolSetupState> {
  const db = getFirebaseDb();

  const [yearsSnap, classesSnap, teachersSnap, studentsSnap] = await Promise.all([
    getDocs(collection(db, "schools", schoolId, "academicYears")),
    getDocs(collection(db, "schools", schoolId, "classes")),
    getDocs(collection(db, "schools", schoolId, "teachers")),
    getDocs(collection(db, "schools", schoolId, "students")),
  ]);

  const classes: SchoolClass[] = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SchoolClass[];
  const sections: Section[] = [];

  // Also fetch sections under classes
  for (const c of classes) {
    try {
      const secSnap = await getDocs(collection(db, "schools", schoolId, "classes", c.id, "sections"));
      secSnap.docs.forEach((sDoc) => {
        sections.push({ id: sDoc.id, ...sDoc.data() } as Section);
      });
    } catch (e) {}
  }

  return {
    academicYears: yearsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AcademicYear[],
    classes,
    sections,
    teachers: teachersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TeacherProfile[],
    students: studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as StudentProfile[],
  };
}

/**
 * Saves the primary academic year for a school under schools/{schoolId}/academicYears.
 */
export async function saveAcademicYear(
  schoolId: string,
  data: { name: string; startDate: string; endDate: string }
): Promise<string> {
  const db = getFirebaseDb();
  const yearDocRef = doc(collection(db, "schools", schoolId, "academicYears"));

  await setDoc(yearDocRef, {
    id: yearDocRef.id,
    schoolId,
    name: data.name.trim(),
    startDate: data.startDate,
    endDate: data.endDate,
    isCurrent: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return yearDocRef.id;
}

/**
 * Saves classes along with their respective sections under schools/{schoolId}/classes.
 */
export async function saveClassesAndSections(
  schoolId: string,
  classList: Array<{ name: string; sections: string[] }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  classList.forEach((c, index) => {
    const classDocRef = doc(collection(db, "schools", schoolId, "classes"));
    batch.set(classDocRef, {
      id: classDocRef.id,
      schoolId,
      name: c.name.trim(),
      order: index + 1,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    c.sections.forEach((sName) => {
      const trimmedSec = sName.trim();
      if (trimmedSec) {
        const secDocRef = doc(collection(db, "schools", schoolId, "classes", classDocRef.id, "sections"));
        batch.set(secDocRef, {
          id: secDocRef.id,
          schoolId,
          classId: classDocRef.id,
          name: trimmedSec,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  });

  await batch.commit();
}

/**
 * Saves initial teachers list under schools/{schoolId}/teachers.
 */
export async function saveInitialTeachers(
  schoolId: string,
  teachers: Array<{ name: string; email: string; phone?: string; subjects?: string[] }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  teachers.forEach((t, idx) => {
    if (t.name.trim() && t.email.trim()) {
      const docRef = doc(collection(db, "schools", schoolId, "teachers"));
      batch.set(docRef, {
        id: docRef.id,
        schoolId,
        teacherCode: `TCH-${String(idx + 1).padStart(3, "0")}`,
        name: t.name.trim(),
        email: t.email.trim().toLowerCase(),
        phone: t.phone?.trim() || "",
        subjects: t.subjects || [],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  await batch.commit();
}

/**
 * Saves initial students list under schools/{schoolId}/students.
 */
export async function saveInitialStudents(
  schoolId: string,
  students: Array<{ name: string; rollNumber?: string; classId: string; sectionId?: string; parentPhone?: string }>
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  students.forEach((s, idx) => {
    if (s.name.trim() && s.classId) {
      const docRef = doc(collection(db, "schools", schoolId, "students"));
      const assignedRoll = s.rollNumber ? parseInt(s.rollNumber) || (idx + 1) : idx + 1;
      batch.set(docRef, {
        id: docRef.id,
        schoolId,
        studentId: `INIT${idx + 1}`,
        admissionNumber: `INIT${idx + 1}`,
        name: s.name.trim(),
        rollNumber: assignedRoll,
        classId: s.classId,
        className: s.classId,
        sectionId: s.sectionId || "",
        sectionName: s.sectionId || "A",
        phone: s.parentPhone?.trim() || "",
        guardianPhone: s.parentPhone?.trim() || "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
