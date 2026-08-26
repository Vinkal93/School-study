import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser, UserRole, UserStatus, School, AuditAction } from "@/types";

// Security helper: Verify performer is active Super Admin
export async function verifySuperAdmin(performerUid: string): Promise<AppUser> {
  const db = getFirebaseDb();
  const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
  if (!performerSnap.exists()) {
    throw new Error("Performer account not found.");
  }
  const performer = performerSnap.data() as AppUser;
  if (performer.role !== "super_admin" || performer.status !== "active") {
    throw new Error("Unauthorized: Active Super Admin privileges required.");
  }
  return performer;
}

// Privileged Operation 1: Create School Admin
export async function createSchoolAdmin(
  performerUid: string,
  input: {
    uid: string;
    email: string;
    name: string;
    schoolId: string;
    phone?: string;
  }
) {
  const performer = await verifySuperAdmin(performerUid);
  const db = getFirebaseDb();

  // Validate school exists
  const schoolSnap = await getDoc(doc(db, COLLECTIONS.SCHOOLS, input.schoolId));
  if (!schoolSnap.exists()) {
    throw new Error(`School with ID ${input.schoolId} does not exist.`);
  }
  const schoolData = schoolSnap.data() as School;

  const newUser: AppUser = {
    uid: input.uid,
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    role: "school_admin",
    schoolId: input.schoolId,
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(doc(db, COLLECTIONS.USERS, input.uid), newUser);

  // Write audit log
  await setDoc(doc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS)), {
    actorId: performer.uid,
    actorName: performer.name,
    actorEmail: performer.email,
    actorRole: performer.role,
    targetUserId: input.uid,
    targetUserName: input.name,
    targetSchoolId: input.schoolId,
    targetSchoolName: schoolData.name,
    action: "ADMIN_CREATED" as AuditAction,
    entityType: "admin",
    entityId: input.uid,
    timestamp: serverTimestamp(),
    reason: `School Administrator account created for ${schoolData.name}`,
    newState: { uid: input.uid, email: input.email, role: "school_admin", schoolId: input.schoolId },
  });

  return { success: true, user: newUser };
}

// Privileged Operation 2: Disable User
export async function disableUser(
  performerUid: string,
  targetUid: string,
  reason: string
) {
  const performer = await verifySuperAdmin(performerUid);
  if (performerUid === targetUid) {
    throw new Error("Safety violation: Super Admin cannot disable their own account.");
  }

  const db = getFirebaseDb();
  const targetRef = doc(db, COLLECTIONS.USERS, targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error("Target user not found.");

  const previousUser = targetSnap.data() as AppUser;
  await updateDoc(targetRef, {
    status: "disabled",
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS)), {
    actorId: performer.uid,
    actorName: performer.name,
    actorEmail: performer.email,
    actorRole: performer.role,
    targetUserId: targetUid,
    targetUserName: previousUser.name,
    targetSchoolId: previousUser.schoolId || null,
    action: "USER_DISABLED" as AuditAction,
    entityType: "user",
    entityId: targetUid,
    timestamp: serverTimestamp(),
    reason: reason || "User account disabled by Super Admin",
    previousState: { status: previousUser.status },
    newState: { status: "disabled" },
  });

  return { success: true, targetUid, status: "disabled" };
}

// Privileged Operation 3: Enable User
export async function enableUser(
  performerUid: string,
  targetUid: string,
  reason: string
) {
  const performer = await verifySuperAdmin(performerUid);
  const db = getFirebaseDb();
  const targetRef = doc(db, COLLECTIONS.USERS, targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error("Target user not found.");

  const previousUser = targetSnap.data() as AppUser;
  await updateDoc(targetRef, {
    status: "active",
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS)), {
    actorId: performer.uid,
    actorName: performer.name,
    actorEmail: performer.email,
    actorRole: performer.role,
    targetUserId: targetUid,
    targetUserName: previousUser.name,
    targetSchoolId: previousUser.schoolId || null,
    action: "USER_ENABLED" as AuditAction,
    entityType: "user",
    entityId: targetUid,
    timestamp: serverTimestamp(),
    reason: reason || "User account enabled by Super Admin",
    previousState: { status: previousUser.status },
    newState: { status: "active" },
  });

  return { success: true, targetUid, status: "active" };
}

// Privileged Operation 4: Change Role
export async function changeRole(
  performerUid: string,
  targetUid: string,
  newRole: UserRole,
  reason: string
) {
  const performer = await verifySuperAdmin(performerUid);
  if (performerUid === targetUid && newRole !== "super_admin") {
    throw new Error("Safety violation: Super Admin cannot revoke their own role.");
  }

  const db = getFirebaseDb();
  const targetRef = doc(db, COLLECTIONS.USERS, targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error("Target user not found.");

  const previousUser = targetSnap.data() as AppUser;
  await updateDoc(targetRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS)), {
    actorId: performer.uid,
    actorName: performer.name,
    actorEmail: performer.email,
    actorRole: performer.role,
    targetUserId: targetUid,
    targetUserName: previousUser.name,
    targetSchoolId: previousUser.schoolId || null,
    action: "ROLE_CHANGED" as AuditAction,
    entityType: "user",
    entityId: targetUid,
    timestamp: serverTimestamp(),
    reason: reason || `Role changed from ${previousUser.role} to ${newRole}`,
    previousState: { role: previousUser.role },
    newState: { role: newRole },
  });

  return { success: true, targetUid, newRole };
}

// Privileged Operation 5: Update School Stats Aggregate Document
export async function updateSchoolStats(schoolId: string) {
  const db = getFirebaseDb();

  const [teachersSnap, studentsSnap, classesSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.TEACHERS}`)),
    getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.STUDENTS}`)),
    getDocs(collection(db, `${COLLECTIONS.SCHOOLS}/${schoolId}/${COLLECTIONS.CLASSES}`)),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  const schoolUsers = usersSnap.docs
    .map((d) => d.data() as AppUser)
    .filter((u) => u.schoolId === schoolId);

  const stats = {
    schoolId,
    studentCount: studentsSnap.size,
    teacherCount: teachersSnap.size,
    classCount: classesSnap.size,
    activeUsers: schoolUsers.filter((u) => u.status === "active").length,
    totalUsers: schoolUsers.length,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "schoolStats", schoolId), stats, { merge: true });
  return stats;
}

// Privileged Operation 6: Update Platform Stats Aggregate Document
export async function updatePlatformStats() {
  const db = getFirebaseDb();

  const [schoolsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.SCHOOLS)),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  const schools = schoolsSnap.docs.map((d) => d.data() as School);
  const users = usersSnap.docs.map((d) => d.data() as AppUser);

  let activeSchools = 0;
  schools.forEach((s) => {
    if (s.status === "active") activeSchools++;
  });

  let totalStudents = 0;
  let totalTeachers = 0;
  let totalAdmins = 0;
  let activeUsers = 0;

  users.forEach((u) => {
    if (u.status === "active") activeUsers++;
    if (u.role === "student") totalStudents++;
    else if (u.role === "teacher") totalTeachers++;
    else if (u.role === "school_admin" || u.role === "super_admin") totalAdmins++;
  });

  const platformStats = {
    totalSchools: schools.length,
    activeSchools,
    inactiveSchools: schools.length - activeSchools,
    totalUsers: users.length,
    totalStudents,
    totalTeachers,
    totalAdmins,
    activeUsers,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "platformStats", "current"), platformStats, { merge: true });
  return platformStats;
}
