import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  ClassBell,
  CreateClassBellInput,
  DayOfWeek,
  DailyClassPlan,
} from "@/types/timetable";

export type BellLiveStatus = "Upcoming" | "Running" | "Completed" | "Missed";

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
 * Calculates live period status based on current local time.
 */
export function calculateBellStatus(startTime: string, endTime: string): BellLiveStatus {
  if (!startTime || !endTime) return "Upcoming";
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = startTime.split(":").map((v) => parseInt(v, 10));
  const [eh, em] = endTime.split(":").map((v) => parseInt(v, 10));

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "Upcoming";

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (currentMinutes >= startMin && currentMinutes < endMin) {
    return "Running";
  } else if (currentMinutes >= endMin) {
    return "Completed";
  } else {
    return "Upcoming";
  }
}

/**
 * Fetches all class bells for a specific class, optional section, and optional day.
 */
export async function getClassBells(
  schoolId: string,
  classId: string,
  dayOfWeek?: DayOfWeek,
  sectionId?: string
): Promise<ClassBell[]> {
  if (!schoolId || !classId) return [];

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "bells"),
    where("classId", "==", classId)
  );

  const snap = await getDocs(q);
  let bells = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ClassBell[];

  if (dayOfWeek && dayOfWeek !== "all") {
    bells = bells.filter((b) => b.dayOfWeek === dayOfWeek || b.dayOfWeek === "all");
  }

  if (sectionId && sectionId !== "all") {
    bells = bells.filter((b) => !b.sectionId || b.sectionId === sectionId);
  }

  return bells.sort((a, b) => {
    const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
    if (startDiff !== 0) return startDiff;
    return (a.bellNumber || 0) - (b.bellNumber || 0);
  });
}

/**
 * Fetches all bells assigned to a specific teacher across all classes.
 */
export async function getTeacherBells(
  schoolId: string,
  teacherId: string,
  dayOfWeek?: DayOfWeek
): Promise<ClassBell[]> {
  if (!schoolId || !teacherId) return [];

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "bells"),
    where("teacherId", "==", teacherId)
  );

  const snap = await getDocs(q);
  let bells = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ClassBell[];

  if (dayOfWeek && dayOfWeek !== "all") {
    bells = bells.filter((b) => b.dayOfWeek === dayOfWeek || b.dayOfWeek === "all");
  }

  return bells.sort((a, b) => {
    const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
    if (startDiff !== 0) return startDiff;
    return (a.bellNumber || 0) - (b.bellNumber || 0);
  });
}

/**
 * Real-time listener for class bells with section support.
 */
export function subscribeToClassBells(
  schoolId: string,
  classId: string,
  dayOfWeek: DayOfWeek | "all",
  callback: (bells: ClassBell[]) => void,
  sectionId?: string
): () => void {
  if (!schoolId || !classId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "bells"),
    where("classId", "==", classId)
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

      if (sectionId && sectionId !== "all") {
        bells = bells.filter((b) => !b.sectionId || b.sectionId === sectionId);
      }

      bells.sort((a, b) => {
        const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
        if (startDiff !== 0) return startDiff;
        return (a.bellNumber || 0) - (b.bellNumber || 0);
      });

      callback(bells);
    },
    (error) => {
      console.error("subscribeToClassBells error:", error);
    }
  );
}

/**
 * Real-time listener for teacher assigned bells.
 */
export function subscribeToTeacherBells(
  schoolId: string,
  teacherId: string,
  dayOfWeek: DayOfWeek | "all",
  callback: (bells: ClassBell[]) => void
): () => void {
  if (!schoolId || !teacherId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "bells"),
    where("teacherId", "==", teacherId)
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

      bells.sort((a, b) => {
        const startDiff = (a.startTime || "").localeCompare(b.startTime || "");
        if (startDiff !== 0) return startDiff;
        return (a.bellNumber || 0) - (b.bellNumber || 0);
      });

      callback(bells);
    },
    (error) => {
      console.error("subscribeToTeacherBells error:", error);
    }
  );
}

/**
 * Saves or updates a Class Bell record.
 * Attempts server API first for authoritative server validation, with client Firestore fallback.
 */
export async function saveClassBell(
  schoolId: string,
  input: CreateClassBellInput,
  bellId?: string
): Promise<string> {
  // Compute duration
  let durationMinutes = 40;
  if (input.startTime && input.endTime) {
    const [sh, sm] = input.startTime.split(":").map((v) => parseInt(v, 10));
    const [eh, em] = input.endTime.split(":").map((v) => parseInt(v, 10));
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      durationMinutes = Math.max(0, eh * 60 + em - (sh * 60 + sm));
    }
  }

  // 1. Try authenticated API route if running in browser
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          bellId,
          ...input,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save period via server.");
      }
      return data.bell?.id || bellId || "";
    } catch (apiErr: any) {
      // If error was a validation conflict (409), rethrow directly to inform user
      if (apiErr.message && (apiErr.message.includes("Duplicate") || apiErr.message.includes("Conflict") || apiErr.message.includes("Overlap"))) {
        throw apiErr;
      }
      console.warn("API save notice, attempting direct database fallback:", apiErr);
    }
  }

  // 2. Direct Firestore fallback
  const db = getFirebaseDb();
  const bellsColl = collection(db, "schools", schoolId, "bells");
  const docRef = bellId ? doc(db, "schools", schoolId, "bells", bellId) : doc(bellsColl);

  const data: any = {
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
    durationMinutes,
    subject: input.isBreak ? "Recess / Break" : input.subject.trim(),
    bookName: input.isBreak ? "" : (input.bookName?.trim() || ""),
    chapter: input.isBreak ? "" : (input.chapter?.trim() || ""),
    task: input.isBreak ? "" : (input.task?.trim() || ""),
    reminder: input.isBreak ? "" : (input.reminder?.trim() || ""),
    message: input.isBreak ? "" : (input.message?.trim() || ""),
    room: input.room?.trim() || "",
    teacherId: input.isBreak ? "" : (input.teacherId || ""),
    teacherName: input.isBreak ? "" : (input.teacherName?.trim() || ""),
    dayOfWeek: input.dayOfWeek,
    isBreak: Boolean(input.isBreak),
    order: Number(input.bellNumber),
    academicYearId: input.academicYearId || "",
    status: "active",
    updatedAt: serverTimestamp(),
  };

  if (!bellId) {
    data.createdAt = serverTimestamp();
  }

  await setDoc(docRef, data, { merge: true });
  return docRef.id;
}

/**
 * Deletes a Class Bell record.
 */
export async function deleteClassBell(schoolId: string, bellId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/timetable?schoolId=${encodeURIComponent(schoolId)}&bellId=${encodeURIComponent(bellId)}`, {
        method: "DELETE",
      });
      if (res.ok) return;
    } catch (e) {
      console.warn("API delete notice, falling back to direct database:", e);
    }
  }

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
  targetDays: DayOfWeek[],
  sectionId?: string
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/timetable/apply-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          classId,
          sectionId,
          sourceDay,
          targetDays,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to copy schedule via server.");
      }
      return;
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) {
        throw err;
      }
      console.warn("API copy notice, falling back to direct batch:", err);
    }
  }

  const sourceBells = await getClassBells(schoolId, classId, sourceDay, sectionId);
  if (sourceBells.length === 0) {
    throw new Error(`No bells found on ${sourceDay} to copy.`);
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);

  for (const targetDay of targetDays) {
    if (targetDay === sourceDay) continue;

    const existingTargetBells = await getClassBells(schoolId, classId, targetDay, sectionId);
    existingTargetBells.forEach((b) => {
      batch.delete(doc(db, "schools", schoolId, "bells", b.id));
    });

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
        durationMinutes: sb.durationMinutes || 40,
        subject: sb.subject,
        bookName: sb.bookName || "",
        chapter: sb.chapter || "",
        task: sb.task || "",
        reminder: sb.reminder || "",
        message: sb.message || "",
        room: sb.room || "",
        teacherId: sb.teacherId || "",
        teacherName: sb.teacherName || "",
        dayOfWeek: targetDay,
        isBreak: sb.isBreak || false,
        order: sb.order || sb.bellNumber,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  await batch.commit();
}

/**
 * Saves a daily class plan / date-specific tasks & reminders.
 */
export async function saveDailyClassPlan(
  schoolId: string,
  plan: Omit<DailyClassPlan, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> {
  const db = getFirebaseDb();
  const planId = plan.id || `${plan.bellId}_${plan.date}`;
  const docRef = doc(db, "schools", schoolId, "dailyPlans", planId);

  await setDoc(
    docRef,
    {
      id: planId,
      schoolId,
      classId: plan.classId,
      sectionId: plan.sectionId || "",
      bellId: plan.bellId,
      date: plan.date,
      chapter: plan.chapter || "",
      task: plan.task || "",
      reminder: plan.reminder || "",
      message: plan.message || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return planId;
}
