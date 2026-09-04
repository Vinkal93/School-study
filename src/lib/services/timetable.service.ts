import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ClassBell, CreateClassBellInput, DayOfWeek } from "@/types/timetable";

const DAYS_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
  all: 0,
};

/**
 * Returns current day of week string in lowercase: "monday", "tuesday", etc.
 */
export function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayIndex = new Date().getDay();
  return days[dayIndex] || "monday";
}

/**
 * Fetches all class bells for a specific class and optional day.
 */
export async function getClassBells(
  schoolId: string,
  classId: string,
  dayOfWeek?: DayOfWeek
): Promise<ClassBell[]> {
  if (!schoolId || !classId) return [];

  const db = getFirebaseDb();
  let q = query(
    collection(db, "schools", schoolId, "bells"),
    where("classId", "==", classId),
    orderBy("bellNumber", "asc")
  );

  const snap = await getDocs(q);
  let bells = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ClassBell[];

  if (dayOfWeek && dayOfWeek !== "all") {
    bells = bells.filter((b) => b.dayOfWeek === dayOfWeek || b.dayOfWeek === "all");
  }

  return bells.sort((a, b) => (a.bellNumber || 0) - (b.bellNumber || 0));
}

/**
 * Real-time listener for class bells.
 */
export function subscribeToClassBells(
  schoolId: string,
  classId: string,
  dayOfWeek: DayOfWeek | "all",
  callback: (bells: ClassBell[]) => void
): () => void {
  if (!schoolId || !classId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "bells"),
    where("classId", "==", classId),
    orderBy("bellNumber", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      let bells = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ClassBell[];

      if (dayOfWeek && dayOfWeek !== "all") {
        bells = bells.filter((b) => b.dayOfWeek === dayOfWeek || b.dayOfWeek === "all");
      }

      bells.sort((a, b) => (a.bellNumber || 0) - (b.bellNumber || 0));
      callback(bells);
    },
    (error) => {
      console.error("subscribeToClassBells error:", error);
    }
  );
}

/**
 * Saves or updates a Class Bell record.
 */
export async function saveClassBell(
  schoolId: string,
  input: CreateClassBellInput,
  bellId?: string
): Promise<string> {
  const db = getFirebaseDb();
  const bellsColl = collection(db, "schools", schoolId, "bells");
  const docRef = bellId ? doc(db, "schools", schoolId, "bells", bellId) : doc(bellsColl);

  const data = {
    id: docRef.id,
    schoolId,
    classId: input.classId,
    className: input.className,
    sectionId: input.sectionId || "",
    sectionName: input.sectionName || "",
    bellNumber: Number(input.bellNumber),
    bellName: input.bellName.trim(),
    startTime: input.startTime.trim(),
    endTime: input.endTime.trim(),
    subject: input.subject.trim(),
    bookName: input.bookName?.trim() || "",
    teacherId: input.teacherId || "",
    teacherName: input.teacherName?.trim() || "",
    dayOfWeek: input.dayOfWeek,
    isBreak: Boolean(input.isBreak),
    order: Number(input.bellNumber),
    updatedAt: serverTimestamp(),
  };

  if (!bellId) {
    (data as any).createdAt = serverTimestamp();
  }

  await setDoc(docRef, data, { merge: true });
  return docRef.id;
}

/**
 * Deletes a Class Bell record.
 */
export async function deleteClassBell(schoolId: string, bellId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "bells", bellId));
}

/**
 * Copies all bells configured on a source day to multiple target days (e.g. Tuesday through Saturday).
 */
export async function copyBellsToOtherDays(
  schoolId: string,
  classId: string,
  sourceDay: DayOfWeek,
  targetDays: DayOfWeek[]
): Promise<void> {
  const sourceBells = await getClassBells(schoolId, classId, sourceDay);
  if (sourceBells.length === 0) {
    throw new Error(`No bells found on ${sourceDay} to copy.`);
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);

  for (const targetDay of targetDays) {
    if (targetDay === sourceDay) continue;

    // Remove existing bells on targetDay
    const existingTargetBells = await getClassBells(schoolId, classId, targetDay);
    existingTargetBells.forEach((b) => {
      batch.delete(doc(db, "schools", schoolId, "bells", b.id));
    });

    // Copy source bells to targetDay
    sourceBells.forEach((sb) => {
      const newRef = doc(collection(db, "schools", schoolId, "bells"));
      batch.set(newRef, {
        id: newRef.id,
        schoolId,
        classId: sb.classId,
        className: sb.className,
        sectionId: sb.sectionId || "",
        sectionName: sb.sectionName || "",
        bellNumber: sb.bellNumber,
        bellName: sb.bellName,
        startTime: sb.startTime,
        endTime: sb.endTime,
        subject: sb.subject,
        bookName: sb.bookName || "",
        teacherId: sb.teacherId || "",
        teacherName: sb.teacherName || "",
        dayOfWeek: targetDay,
        isBreak: sb.isBreak || false,
        order: sb.order || sb.bellNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  await batch.commit();
}

/**
 * Real-time listener for today's schedule for a student.
 */
export function subscribeToTodaySchedule(
  schoolId: string,
  classId: string,
  callback: (bells: ClassBell[]) => void
): () => void {
  const today = getCurrentDayOfWeek();
  return subscribeToClassBells(schoolId, classId, today, callback);
}
