import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type {
  TeacherProfile,
  SchoolClass,
  StudentProfile,
  TeacherTask,
  StudyMaterial,
  TeacherTest,
  TestScore,
} from "@/types";

export interface AssignedClassInfo {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subject?: string;
  studentCount?: number;
}

export interface TeacherDashboardContext {
  teacher: TeacherProfile | null;
  assignedClasses: AssignedClassInfo[];
  allSchoolClasses: SchoolClass[];
}

/**
 * Resolves teacher profile and all assigned classes with student counts.
 * Falls back gracefully to school classes if teacher has not been specifically assigned.
 */
export async function getTeacherDashboardContext(
  schoolId: string,
  userId: string,
  userEmail?: string
): Promise<TeacherDashboardContext> {
  if (!schoolId || !userId) {
    return { teacher: null, assignedClasses: [], allSchoolClasses: [] };
  }

  const db = getFirebaseDb();
  let teacher: TeacherProfile | null = null;

  try {
    // 1. Try finding teacher by userId
    const qUser = query(
      collection(db, "schools", schoolId, "teachers"),
      where("userId", "==", userId)
    );
    const snapUser = await getDocs(qUser);

    if (!snapUser.empty) {
      teacher = { id: snapUser.docs[0].id, ...snapUser.docs[0].data() } as TeacherProfile;
    } else if (userEmail) {
      // Fallback by lowercase email
      const qEmail = query(
        collection(db, "schools", schoolId, "teachers"),
        where("email", "==", userEmail.toLowerCase())
      );
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        teacher = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as TeacherProfile;
      }
    }
  } catch (err) {
    console.error("Error fetching teacher profile:", err);
  }

  // 2. Load all school classes with sections
  let allSchoolClasses: SchoolClass[] = [];
  try {
    allSchoolClasses = await getClassesWithSections(schoolId);
  } catch (err) {
    console.error("Error fetching school classes:", err);
  }

  // 3. Resolve assigned classes
  const assignedList: AssignedClassInfo[] = [];

  if (teacher?.assignedClasses && teacher.assignedClasses.length > 0) {
    teacher.assignedClasses.forEach((c) => {
      assignedList.push({
        classId: c.classId,
        className: c.className,
        sectionId: c.sectionId,
        sectionName: c.sectionName,
        subject: c.subject || teacher?.subjects?.[0] || "General",
      });
    });
  } else if (teacher?.assignedClassId) {
    assignedList.push({
      classId: teacher.assignedClassId,
      className: teacher.assignedClassName || "Class",
      sectionId: teacher.assignedSectionId,
      sectionName: teacher.assignedSectionName || "Section A",
      subject: teacher.subjects?.[0] || "General",
    });
  } else if (allSchoolClasses.length > 0) {
    // If no explicit assignment, provide up to 4 classes from the school
    allSchoolClasses.slice(0, 4).forEach((cls, idx) => {
      const sec = cls.sections?.[0];
      const subjects = ["Mathematics", "Science", "English", "Social Studies", "Computer"];
      assignedList.push({
        classId: cls.id,
        className: cls.name,
        sectionId: sec?.id,
        sectionName: sec?.name || "A",
        subject: subjects[idx % subjects.length],
      });
    });
  }

  // 4. Populate student counts per assigned class
  await Promise.all(
    assignedList.map(async (c) => {
      try {
        const students = await getStudentsByClassAndSection(schoolId, c.classId, c.sectionId);
        c.studentCount = students.length;
      } catch {
        c.studentCount = 0;
      }
    })
  );

  return { teacher, assignedClasses: assignedList, allSchoolClasses };
}

/**
 * Subscribes to teacher personal tasks. Seeds default tasks if collection is empty.
 */
export function subscribeToTeacherTasks(
  schoolId: string,
  teacherId: string,
  callback: (tasks: TeacherTask[]) => void
): () => void {
  if (!schoolId || !teacherId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const tasksRef = collection(db, "schools", schoolId, "teacherTasks");
  const q = query(tasksRef, where("teacherId", "==", teacherId));

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default tasks for high-quality out-of-the-box experience matching reference design
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split("T")[0];
        const dayOffset = (offset: number) => {
          const d = new Date(today);
          d.setDate(d.getDate() + offset);
          return formatDate(d);
        };

        const defaultTasks: Array<Omit<TeacherTask, "id">> = [
          {
            schoolId,
            teacherId,
            title: "Check Science notebooks",
            classTag: "Class 7-B",
            dueDate: formatDate(today),
            completed: false,
          },
          {
            schoolId,
            teacherId,
            title: "Prepare Monthly Test Paper",
            classTag: "Class 8-A",
            dueDate: dayOffset(1),
            completed: false,
          },
          {
            schoolId,
            teacherId,
            title: "Submit Monthly Progress Report",
            classTag: "General",
            dueDate: dayOffset(2),
            completed: false,
          },
          {
            schoolId,
            teacherId,
            title: "PTM - Parent Meeting",
            classTag: "Class 6-A",
            dueDate: dayOffset(4),
            completed: false,
          },
        ];

        try {
          for (const t of defaultTasks) {
            await addDoc(tasksRef, { ...t, createdAt: serverTimestamp() });
          }
        } catch {
          // If write fails, provide memory tasks
          callback(
            defaultTasks.map((t, i) => ({ id: `seed-${i}`, ...t } as TeacherTask))
          );
          return;
        }
      }

      const tasks: TeacherTask[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeacherTask[];

      // Sort by dueDate asc
      tasks.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      callback(tasks);
    },
    (err) => {
      console.warn("Tasks snapshot error:", err);
      callback([]);
    }
  );
}

/**
 * Toggles completion status of a teacher task.
 */
export async function toggleTeacherTask(
  schoolId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const taskRef = doc(db, "schools", schoolId, "teacherTasks", taskId);
  await updateDoc(taskRef, { completed, updatedAt: serverTimestamp() });
}

/**
 * Adds a new teacher task.
 */
export async function createTeacherTask(
  schoolId: string,
  teacherId: string,
  task: Omit<TeacherTask, "id" | "schoolId" | "teacherId" | "completed">
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "schools", schoolId, "teacherTasks"), {
    ...task,
    schoolId,
    teacherId,
    completed: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Subscribes to Study Materials for a class/subject.
 * Shared by both Teacher and Student portals.
 */
export function subscribeToStudyMaterials(
  schoolId: string,
  classId?: string,
  callback?: (materials: StudyMaterial[]) => void
): () => void {
  if (!schoolId) {
    if (callback) callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const matRef = collection(db, "schools", schoolId, "studyMaterials");
  let q = query(matRef, orderBy("createdAt", "desc"), limit(50));

  if (classId) {
    q = query(
      matRef,
      where("classId", "==", classId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as StudyMaterial[];
      if (callback) callback(items);
    },
    (err) => {
      console.warn("Study materials snapshot error:", err);
      if (callback) callback([]);
    }
  );
}

/**
 * Creates study material.
 */
export async function createStudyMaterial(
  schoolId: string,
  material: Omit<StudyMaterial, "id" | "createdAt">
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "schools", schoolId, "studyMaterials"), {
    ...material,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Deletes study material.
 */
export async function deleteStudyMaterial(
  schoolId: string,
  materialId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "studyMaterials", materialId));
}

/**
 * Subscribes to tests/exams.
 */
export function subscribeToTeacherTests(
  schoolId: string,
  classId?: string,
  callback?: (tests: TeacherTest[]) => void
): () => void {
  if (!schoolId) {
    if (callback) callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const testsRef = collection(db, "schools", schoolId, "tests");
  let q = query(testsRef, orderBy("testDate", "desc"), limit(50));

  if (classId) {
    q = query(
      testsRef,
      where("classId", "==", classId),
      orderBy("testDate", "desc"),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TeacherTest[];
      if (callback) callback(items);
    },
    (err) => {
      console.warn("Tests snapshot error:", err);
      if (callback) callback([]);
    }
  );
}

/**
 * Creates a new test.
 */
export async function createTeacherTest(
  schoolId: string,
  test: Omit<TeacherTest, "id" | "createdAt">
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "schools", schoolId, "tests"), {
    ...test,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Subscribes to today's attendance summary for a list of classes.
 */
export function subscribeToTodayAttendanceSummary(
  schoolId: string,
  dateStr: string,
  callback: (attendanceByClass: Record<string, { marked: boolean; present: number; total: number }>) => void
): () => void {
  if (!schoolId) {
    callback({});
    return () => {};
  }

  const db = getFirebaseDb();
  const attRef = collection(db, "schools", schoolId, "attendance");
  const q = query(attRef, where("date", "==", dateStr));

  return onSnapshot(
    q,
    (snapshot) => {
      const summary: Record<string, { marked: boolean; present: number; total: number }> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const classId = data.classId;
        if (!classId) return;

        if (!summary[classId]) {
          summary[classId] = { marked: true, present: 0, total: 0 };
        }
        summary[classId].total++;
        if (data.status === "present" || data.status === "late") {
          summary[classId].present++;
        }
      });
      callback(summary);
    },
    (err) => {
      console.warn("Attendance summary error:", err);
      callback({});
    }
  );
}
