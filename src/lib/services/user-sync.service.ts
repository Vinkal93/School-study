import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser, StudentProfile, TeacherProfile, School } from "@/types";

/**
 * Normalizes timestamps to ISO strings or milliseconds.
 */
function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val.toDate && typeof val.toDate === "function") return val.toDate().toISOString();
  if (val.toMillis && typeof val.toMillis === "function") return new Date(val.toMillis()).toISOString();
  if (typeof val === "number") return new Date(val).toISOString();
  return new Date().toISOString();
}

/**
 * Fetches comprehensive multi-tenant user directory across:
 * 1. `users` collection (Super Admins, School Admins, students/teachers with auth accounts)
 * 2. `schools/{schoolId}/students` (manually created + bulk imported students)
 * 3. `schools/{schoolId}/teachers` (manually created + bulk imported teachers)
 * 
 * Deduplicates by UID, email, and institute identity to ensure 0 duplicates.
 * Correctly labels imported records without credentials as "portal_not_created".
 */
export async function getComprehensiveGlobalUsers(): Promise<AppUser[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    // 1. Fetch base users collection
    const usersSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] }));
    const usersMap = new Map<string, AppUser>();
    const emailMap = new Map<string, string>(); // email -> uid
    const schoolEntityMap = new Map<string, string>(); // `${schoolId}:${identifier}` -> uid

    usersSnap.docs.forEach((d: any) => {
      const data = d.data();
      const uid = d.id;
      const user: AppUser = {
        uid,
        ...data,
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt),
        accountStatus: data.accountStatus || (data.hasAuth === false ? "portal_not_created" : "active"),
      };
      usersMap.set(uid, user);
      if (user.email) {
        emailMap.set(user.email.toLowerCase().trim(), uid);
      }
      if (user.schoolId && (user.userId || (user as any).studentId || (user as any).teacherCode)) {
        const idKey = `${user.schoolId}:${String(user.userId || (user as any).studentId || (user as any).teacherCode).toLowerCase().trim()}`;
        schoolEntityMap.set(idKey, uid);
      }
    });

    // 2. Fetch all schools to query school-scoped rosters
    const schoolsSnap = await getDocs(collection(db, COLLECTIONS.SCHOOLS)).catch(() => ({ docs: [] }));
    const schools = schoolsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as School[];

    // 3. For each school, fetch students and teachers
    await Promise.all(
      schools.map(async (school) => {
        const schoolId = school.id;
        const [studentsSnap, teachersSnap] = await Promise.all([
          getDocs(collection(db, "schools", schoolId, "students")).catch(() => ({ docs: [] })),
          getDocs(collection(db, "schools", schoolId, "teachers")).catch(() => ({ docs: [] })),
        ]);

        // Process Students
        studentsSnap.docs.forEach((sDoc: any) => {
          const s = sDoc.data() as StudentProfile;
          const sId = sDoc.id;
          const admNo = String(s.admissionNumber || s.studentId || sId).trim().toLowerCase();
          const email = (s.email || "").trim().toLowerCase();
          const schoolKey = `${schoolId}:${admNo}`;

          // Check if already mapped to an existing user
          const existingUid = (s.userId && usersMap.has(s.userId))
            ? s.userId
            : (email && emailMap.get(email)) || schoolEntityMap.get(schoolKey) || (usersMap.has(sId) ? sId : null);

          if (existingUid && usersMap.has(existingUid)) {
            // Merge student specific fields into existing user
            const existing = usersMap.get(existingUid)!;
            usersMap.set(existingUid, {
              ...existing,
              className: s.className || (existing as any).className,
              sectionName: s.sectionName || (existing as any).sectionName,
              rollNumber: s.rollNumber ?? (existing as any).rollNumber,
              phone: s.phone || (existing as any).phone || s.guardianPhone || "",
              studentId: s.studentId || s.admissionNumber || (existing as any).studentId,
              admissionNumber: s.admissionNumber || (existing as any).admissionNumber,
            } as any);
          } else {
            // Uncredentialed or imported student — synthesize canonical directory record
            const synthUid = s.userId || sId;
            const newUser: AppUser = {
              uid: synthUid,
              name: s.name || (s as any).fullName || "Student",
              email: s.email || "",
              role: "student",
              schoolId,
              userId: s.admissionNumber || s.studentId || sId,
              studentId: s.studentId || s.admissionNumber || sId,
              admissionNumber: s.admissionNumber || sId,
              rollNumber: s.rollNumber,
              className: s.className || "",
              sectionName: s.sectionName || "",
              phone: s.phone || s.guardianPhone || "",
              status: (s.status === "deleted" ? "disabled" : s.status) || "active",
              accountStatus: s.userId && s.userId !== sId ? "active" : "portal_not_created",
              hasAuth: Boolean(s.userId && s.userId !== sId),
              createdAt: normalizeDate(s.createdAt || (s as any).admissionDate),
              updatedAt: normalizeDate(s.updatedAt),
            } as any;

            usersMap.set(synthUid, newUser);
            if (email) emailMap.set(email, synthUid);
            schoolEntityMap.set(schoolKey, synthUid);
          }
        });

        // Process Teachers
        teachersSnap.docs.forEach((tDoc: any) => {
          const t = tDoc.data() as TeacherProfile;
          const tId = tDoc.id;
          const code = String(t.teacherCode || (t as any).employeeId || tId).trim().toLowerCase();
          const email = (t.email || "").trim().toLowerCase();
          const schoolKey = `${schoolId}:${code}`;

          const existingUid = (t.userId && usersMap.has(t.userId))
            ? t.userId
            : (email && emailMap.get(email)) || schoolEntityMap.get(schoolKey) || (usersMap.has(tId) ? tId : null);

          if (existingUid && usersMap.has(existingUid)) {
            const existing = usersMap.get(existingUid)!;
            usersMap.set(existingUid, {
              ...existing,
              teacherCode: t.teacherCode || (existing as any).teacherCode,
              teacherId: t.id || (existing as any).teacherId,
              phone: t.phone || (existing as any).phone,
              assignedClassName: t.assignedClassName || (existing as any).assignedClassName,
              assignedSectionName: t.assignedSectionName || (existing as any).assignedSectionName,
            } as any);
          } else {
            const synthUid = t.userId || tId;
            const newUser: AppUser = {
              uid: synthUid,
              name: t.name || (t as any).fullName || "Teacher",
              email: t.email || "",
              role: "teacher",
              schoolId,
              userId: t.teacherCode || synthUid,
              teacherCode: t.teacherCode || synthUid,
              teacherId: t.id || tId,
              phone: t.phone || "",
              assignedClassName: t.assignedClassName || "",
              assignedSectionName: t.assignedSectionName || "",
              status: (t.status === "deleted" ? "disabled" : t.status) || "active",
              accountStatus: t.userId && t.userId !== tId ? "active" : "portal_not_created",
              hasAuth: Boolean(t.userId && t.userId !== tId),
              createdAt: normalizeDate(t.createdAt || (t as any).joiningDate),
              updatedAt: normalizeDate(t.updatedAt),
            } as any;

            usersMap.set(synthUid, newUser);
            if (email) emailMap.set(email, synthUid);
            schoolEntityMap.set(schoolKey, synthUid);
          }
        });
      })
    );

    // Convert map to sorted array (newest first)
    const result = Array.from(usersMap.values());
    result.sort((a, b) => {
      const getMs = (dateVal: any) => {
        if (!dateVal) return 0;
        if (typeof dateVal === "string" || typeof dateVal === "number") return new Date(dateVal).getTime();
        if (dateVal.toMillis) return dateVal.toMillis();
        if (dateVal.toDate) return dateVal.toDate().getTime();
        if (dateVal instanceof Date) return dateVal.getTime();
        return 0;
      };
      return getMs(b.createdAt) - getMs(a.createdAt);
    });

    return result;
  } catch (error) {
    console.error("[user-sync] Error fetching comprehensive users:", error);
    return [];
  }
}

/**
 * Reconciles and provisions canonical directory records into `users` collection.
 * Ensures that imported students/teachers who exist only in subcollections
 * get canonical `users/{docId}` entries with `accountStatus: "portal_not_created"`.
 */
export async function reconcileGlobalUsersDirectory(targetSchoolId?: string): Promise<{
  syncedStudents: number;
  syncedTeachers: number;
}> {
  const db = getFirebaseDb();
  if (!db) return { syncedStudents: 0, syncedTeachers: 0 };

  let syncedStudents = 0;
  let syncedTeachers = 0;

  try {
    const schoolsToSync: string[] = [];
    if (targetSchoolId) {
      schoolsToSync.push(targetSchoolId);
    } else {
      const snap = await getDocs(collection(db, COLLECTIONS.SCHOOLS));
      snap.docs.forEach((d) => schoolsToSync.push(d.id));
    }

    // Fetch existing users collection IDs to avoid overwriting existing auth docs
    const existingUsersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    const existingUserIds = new Set(existingUsersSnap.docs.map((d) => d.id));

    for (const schoolId of schoolsToSync) {
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "schools", schoolId, "students")),
        getDocs(collection(db, "schools", schoolId, "teachers")),
      ]);

      // Backfill missing students
      for (const sDoc of studentsSnap.docs) {
        const s = sDoc.data() as StudentProfile;
        const targetId = s.userId || sDoc.id;
        if (!existingUserIds.has(targetId)) {
          const userDocRef = doc(db, COLLECTIONS.USERS, targetId);
          await setDoc(
            userDocRef,
            {
              uid: targetId,
              name: s.name || (s as any).fullName || "Student",
              email: s.email || "",
              role: "student",
              schoolId,
              userId: s.admissionNumber || s.studentId || targetId,
              studentId: s.studentId || targetId,
              admissionNumber: s.admissionNumber || targetId,
              rollNumber: s.rollNumber,
              className: s.className || "",
              sectionName: s.sectionName || "",
              phone: s.phone || s.guardianPhone || "",
              status: s.status || "active",
              accountStatus: s.userId ? "active" : "portal_not_created",
              hasAuth: Boolean(s.userId),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          existingUserIds.add(targetId);
          syncedStudents++;
        }
      }

      // Backfill missing teachers
      for (const tDoc of teachersSnap.docs) {
        const t = tDoc.data() as TeacherProfile;
        const targetId = t.userId || tDoc.id;
        if (!existingUserIds.has(targetId)) {
          const userDocRef = doc(db, COLLECTIONS.USERS, targetId);
          await setDoc(
            userDocRef,
            {
              uid: targetId,
              name: t.name || (t as any).fullName || "Teacher",
              email: t.email || "",
              role: "teacher",
              schoolId,
              userId: t.teacherCode || targetId,
              teacherCode: t.teacherCode || targetId,
              teacherId: t.id || tDoc.id,
              phone: t.phone || "",
              assignedClassName: t.assignedClassName || "",
              assignedSectionName: t.assignedSectionName || "",
              status: t.status || "active",
              accountStatus: t.userId ? "active" : "portal_not_created",
              hasAuth: Boolean(t.userId),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          existingUserIds.add(targetId);
          syncedTeachers++;
        }
      }
    }
  } catch (err) {
    console.warn("[user-sync] Reconcile error notice:", err);
  }

  return { syncedStudents, syncedTeachers };
}
