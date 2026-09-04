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
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { HomeworkItem, CreateHomeworkInput } from "@/types/timetable";

/**
 * Creates a new homework assignment under schools/{schoolId}/homework.
 */
export async function createHomework(
  schoolId: string,
  teacherId: string,
  teacherName: string,
  input: CreateHomeworkInput
): Promise<string> {
  const db = getFirebaseDb();
  const homeworkColl = collection(db, "schools", schoolId, "homework");
  const docRef = doc(homeworkColl);

  const homeworkData: HomeworkItem = {
    id: docRef.id,
    schoolId,
    classId: input.classId,
    className: input.className,
    sectionId: input.sectionId || "",
    sectionName: input.sectionName || "",
    bellId: input.bellId || "",
    bellNumber: input.bellNumber ? Number(input.bellNumber) : undefined,
    subject: input.subject.trim(),
    bookName: input.bookName?.trim() || "",
    title: input.title.trim(),
    description: input.description.trim(),
    assignedDate: input.assignedDate || new Date().toISOString().split("T")[0],
    dueDate: input.dueDate,
    teacherId,
    teacherName: teacherName.trim(),
    attachmentUrl: input.attachmentUrl || "",
    status: "assigned",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, homeworkData);
  return docRef.id;
}

/**
 * Real-time subscription to homework assignments created by a teacher.
 */
export function subscribeToTeacherHomework(
  schoolId: string,
  teacherId: string,
  callback: (items: HomeworkItem[]) => void
): () => void {
  if (!schoolId || !teacherId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "homework"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as HomeworkItem[];
      callback(items);
    },
    (err) => {
      console.error("subscribeToTeacherHomework error:", err);
    }
  );
}

/**
 * Real-time subscription to homework assignments for a student's class.
 */
export function subscribeToClassHomework(
  schoolId: string,
  classId: string,
  sectionId: string | undefined,
  callback: (items: HomeworkItem[]) => void
): () => void {
  if (!schoolId || !classId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const q = query(
    collection(db, "schools", schoolId, "homework"),
    where("classId", "==", classId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      let items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as HomeworkItem[];

      // Filter by section if specified, allowing homework assigned to whole class (empty sectionId)
      if (sectionId && sectionId !== "all") {
        items = items.filter((h) => !h.sectionId || h.sectionId === sectionId);
      }

      // Sort with today's homework first, ordered by Bell Number
      items.sort((a, b) => {
        if (a.assignedDate === b.assignedDate) {
          return (a.bellNumber || 99) - (b.bellNumber || 99);
        }
        return b.assignedDate.localeCompare(a.assignedDate);
      });

      callback(items);
    },
    (err) => {
      console.error("subscribeToClassHomework error:", err);
    }
  );
}

/**
 * Deletes a homework assignment.
 */
export async function deleteHomework(schoolId: string, homeworkId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "homework", homeworkId));
}

/**
 * Updates an existing homework assignment.
 */
export async function updateHomework(
  schoolId: string,
  homeworkId: string,
  updates: Partial<HomeworkItem>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "schools", schoolId, "homework", homeworkId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
