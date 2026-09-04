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
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  TeacherProfile,
  TeacherFineReward,
  FineRewardStatus,
  SchoolRule,
  RuleApplication,
  TeacherAuditLog,
} from "@/types";

/**
 * Fetches complete HR Profile for a specific teacher.
 */
export async function getTeacherFullHR(
  schoolId: string,
  teacherId: string
): Promise<TeacherProfile | null> {
  if (!schoolId || !teacherId) return null;
  const db = getFirebaseDb();
  try {
    const dSnap = await getDoc(doc(db, "schools", schoolId, "teachers", teacherId));
    if (!dSnap.exists()) return null;
    return { id: dSnap.id, ...dSnap.data() } as TeacherProfile;
  } catch (err) {
    console.error("Failed to fetch teacher HR profile:", err);
    return null;
  }
}

/**
 * Updates teacher HR details and writes an audit log.
 */
export async function updateTeacherHR(
  schoolId: string,
  teacherId: string,
  partial: Partial<TeacherProfile>,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const current = await getDoc(teacherDocRef);
  const currentData = current.exists() ? current.data() : {};

  await updateDoc(teacherDocRef, {
    ...partial,
    updatedAt: serverTimestamp(),
  });

  await logTeacherAudit(schoolId, {
    schoolId,
    teacherId,
    teacherName: partial.name || currentData.name || "Teacher",
    action: "PROFILE_UPDATED",
    details: `HR profile updated: ${Object.keys(partial).join(", ")}`,
    oldValue: currentData,
    newValue: partial,
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
  });
}

/**
 * Updates teacher salary configuration with mandatory audit trail.
 */
export async function updateTeacherSalary(
  schoolId: string,
  teacherId: string,
  salaryConfig: TeacherProfile["salaryConfig"],
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const current = await getDoc(teacherDocRef);
  const currentData = current.exists() ? (current.data() as TeacherProfile) : null;

  await updateDoc(teacherDocRef, {
    salaryConfig,
    updatedAt: serverTimestamp(),
  });

  await logTeacherAudit(schoolId, {
    schoolId,
    teacherId,
    teacherName: currentData?.name || "Teacher",
    action: "SALARY_UPDATED",
    details: `Salary set to ₹${salaryConfig?.baseSalary} (${salaryConfig?.frequency}). Net: ₹${salaryConfig?.netSalary}`,
    oldValue: currentData?.salaryConfig || null,
    newValue: salaryConfig,
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
  });
}

/**
 * Adds an admin performance note/feedback.
 */
export async function addTeacherPerformanceFeedback(
  schoolId: string,
  teacherId: string,
  feedback: { note: string; rating: number },
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const current = await getDoc(teacherDocRef);
  const currentData = current.exists() ? (current.data() as TeacherProfile) : null;

  const existingNotes = currentData?.performanceSummary?.feedbackNotes || [];
  const newNotes = [
    {
      date: new Date().toISOString().split("T")[0],
      note: feedback.note.trim(),
      adminName: actor.name,
      rating: feedback.rating,
    },
    ...existingNotes,
  ];

  await updateDoc(teacherDocRef, {
    performanceSummary: {
      rating: feedback.rating,
      feedbackNotes: newNotes,
    },
    updatedAt: serverTimestamp(),
  });

  await logTeacherAudit(schoolId, {
    schoolId,
    teacherId,
    teacherName: currentData?.name || "Teacher",
    action: "PERFORMANCE_FEEDBACK_ADDED",
    details: `Rating: ${feedback.rating}/5. Note: "${feedback.note.slice(0, 80)}..."`,
    oldValue: currentData?.performanceSummary || null,
    newValue: { rating: feedback.rating, note: feedback.note },
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
  });
}

/**
 * Issues a fine, reward, bonus, or recognition to a teacher.
 */
export async function issueFineReward(
  schoolId: string,
  input: Omit<TeacherFineReward, "id" | "createdAt" | "updatedAt">,
  actor: { uid: string; name: string; role: string }
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "schools", schoolId, "finesRewards"), {
    ...input,
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logTeacherAudit(schoolId, {
    schoolId,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    action: `${input.type.toUpperCase()}_ISSUED`,
    details: `${input.type.toUpperCase()}: ₹${input.amount || 0} - Reason: ${input.reason}`,
    newValue: input,
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
  });

  return docRef.id;
}

/**
 * Updates fine/reward status (approved, applied, waived).
 */
export async function updateFineRewardStatus(
  schoolId: string,
  fineRewardId: string,
  teacherId: string,
  status: FineRewardStatus,
  actor: { uid: string; name: string; role: string },
  remarks?: string
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "schools", schoolId, "finesRewards", fineRewardId);

  await updateDoc(docRef, {
    status,
    remarks: remarks || "",
    updatedAt: serverTimestamp(),
  });

  await logTeacherAudit(schoolId, {
    schoolId,
    teacherId,
    teacherName: "Teacher",
    action: "FINE_REWARD_STATUS_CHANGED",
    details: `Status set to ${status}. Remarks: ${remarks || "None"}`,
    newValue: { status, remarks },
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
  });
}

/**
 * Real-time subscription to fines and rewards.
 */
export function subscribeToTeacherFinesRewards(
  schoolId: string,
  teacherId?: string,
  callback?: (items: TeacherFineReward[]) => void
): () => void {
  if (!schoolId) {
    if (callback) callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const colRef = collection(db, "schools", schoolId, "finesRewards");
  let q = query(colRef, orderBy("date", "desc"), limit(100));

  if (teacherId) {
    q = query(
      colRef,
      where("teacherId", "==", teacherId),
      orderBy("date", "desc"),
      limit(100)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TeacherFineReward[];
      if (callback) callback(list);
    },
    (err) => {
      console.warn("Fines/Rewards snapshot warning:", err);
      if (callback) callback([]);
    }
  );
}

/**
 * Real-time subscription to school rules & policies.
 */
export function subscribeToSchoolRules(
  schoolId: string,
  callback: (rules: SchoolRule[]) => void
): () => void {
  if (!schoolId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const rulesRef = collection(db, "schools", schoolId, "rules");
  const q = query(rulesRef, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SchoolRule[];
      callback(list);
    },
    (err) => {
      console.warn("School rules snapshot warning:", err);
      callback([]);
    }
  );
}

/**
 * Creates a new school rule.
 */
export async function createSchoolRule(
  schoolId: string,
  rule: Omit<SchoolRule, "id" | "createdAt" | "updatedAt">,
  actor: { uid: string; name: string; role: string }
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "schools", schoolId, "rules"), {
    ...rule,
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Toggles rule active/inactive status.
 */
export async function toggleSchoolRuleStatus(
  schoolId: string,
  ruleId: string,
  status: "active" | "inactive",
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "schools", schoolId, "rules", ruleId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a school rule.
 */
export async function deleteSchoolRule(
  schoolId: string,
  ruleId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "rules", ruleId));
}

/**
 * Real-time subscription to rule applications / review candidates.
 */
export function subscribeToRuleApplications(
  schoolId: string,
  callback: (apps: RuleApplication[]) => void
): () => void {
  if (!schoolId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const appsRef = collection(db, "schools", schoolId, "ruleApplications");
  const q = query(appsRef, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RuleApplication[];
      callback(list);
    },
    (err) => {
      console.warn("Rule applications snapshot warning:", err);
      callback([]);
    }
  );
}

/**
 * Applies or rejects a rule application.
 * If approved and has an amount, creates an authorized TeacherFineReward record.
 */
export async function applyRuleAction(
  schoolId: string,
  application: RuleApplication,
  decision: "approved" | "rejected",
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const db = getFirebaseDb();
  const appDocRef = doc(db, "schools", schoolId, "ruleApplications", application.id);

  await updateDoc(appDocRef, {
    status: decision,
    reviewedBy: actor.uid,
    reviewedByName: actor.name,
    reviewedAt: serverTimestamp(),
  });

  if (decision === "approved" && application.amount) {
    // Create explicit authorized Fine/Reward record
    await issueFineReward(
      schoolId,
      {
        schoolId,
        teacherId: application.targetUserId,
        teacherName: application.targetUserName,
        type: application.proposedAction === "reward" ? "reward" : "fine",
        amount: application.amount,
        reason: `${application.ruleTitle}: ${application.reason}`,
        date: new Date().toISOString().split("T")[0],
        status: "approved",
        ruleId: application.ruleId,
        ruleTitle: application.ruleTitle,
        createdBy: actor.uid,
        createdByName: actor.name,
      },
      actor
    );
  }
}

/**
 * Writes an audit record to schools/{schoolId}/teacherAuditLogs.
 */
export async function logTeacherAudit(
  schoolId: string,
  entry: Omit<TeacherAuditLog, "id" | "timestamp">
): Promise<string> {
  const db = getFirebaseDb();
  try {
    const docRef = await addDoc(collection(db, "schools", schoolId, "teacherAuditLogs"), {
      ...entry,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Failed to log teacher audit:", err);
    return "";
  }
}

/**
 * Subscribes to audit logs for a teacher.
 */
export function subscribeToTeacherAuditLogs(
  schoolId: string,
  teacherId: string,
  callback: (logs: TeacherAuditLog[]) => void
): () => void {
  if (!schoolId || !teacherId) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const colRef = collection(db, "schools", schoolId, "teacherAuditLogs");
  const q = query(
    colRef,
    where("teacherId", "==", teacherId),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TeacherAuditLog[];
      callback(list);
    },
    (err) => {
      console.warn("Audit logs snapshot warning:", err);
      callback([]);
    }
  );
}
