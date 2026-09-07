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
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { createNotification } from "@/lib/services/notification.service";
import { logAuditEvent } from "@/lib/services/audit.service";
import type {
  StudentComplaint,
  CreateComplaintInput,
  ComplaintStatus,
} from "@/types/complaint";

export const COMPLAINT_COLLECTION = "studentComplaints";

/**
 * Creates a student complaint record in Firestore, generates a real-time
 * notification for the affected student, and records an audit event.
 */
export async function createStudentComplaint(
  schoolId: string,
  input: CreateComplaintInput,
  creator: { uid: string; name: string; role: "teacher" | "school_admin" | "admin" | "super_admin" }
): Promise<StudentComplaint> {
  if (!schoolId) {
    throw new Error("Cannot create complaint: School ID is required.");
  }
  if (!input.studentId || !input.title.trim() || !input.description.trim()) {
    throw new Error("Missing required complaint fields: studentId, title, and description are required.");
  }

  const db = getFirebaseDb();
  const complaintsColl = collection(db, COMPLAINT_COLLECTION);
  const docRef = doc(complaintsColl);
  const complaintId = docRef.id;

  const newComplaint: StudentComplaint = {
    id: complaintId,
    schoolId,
    studentId: input.studentId,
    studentUid: input.studentUid || "",
    studentName: input.studentName.trim(),
    className: input.className || "",
    sectionName: input.sectionName || "",
    title: input.title.trim(),
    category: input.category,
    description: input.description.trim(),
    severity: input.severity,
    incidentDate: input.incidentDate || new Date().toISOString().split("T")[0],
    attachmentRefs: input.attachmentRefs || [],
    status: "OPEN",
    createdByUid: creator.uid,
    createdByName: creator.name,
    createdByRole: creator.role,
    notes: input.notes?.trim() || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newComplaint);

  // Deliver real-time notification to the affected student if studentUid is available
  if (input.studentUid) {
    try {
      await createNotification(
        schoolId,
        {
          title: `⚠️ New Complaint: ${input.title.trim()}`,
          message: `A ${input.severity} severity complaint (${input.category}) has been registered regarding your profile.`,
          type: "notice" as any,
          targetAudience: "user",
          targetUserId: input.studentUid,
          priority: input.severity === "CRITICAL" || input.severity === "HIGH" ? "urgent" : "normal",
          link: `/student/notifications?tab=complaint&id=${complaintId}`,
          actionLabel: "View Complaint",
          metadata: {
            complaintId,
            category: input.category,
            severity: input.severity,
            incidentDate: input.incidentDate,
          },
        },
        {
          uid: creator.uid,
          name: creator.name,
          role: creator.role,
        }
      );
    } catch (notifErr) {
      console.warn("[ComplaintService] Student notification dispatch warning:", notifErr);
    }
  }

  // Audit event logging
  try {
    await logAuditEvent({
      action: "CREATE" as any,
      entityType: "STUDENT" as any,
      entityId: input.studentId,
      actorSchoolId: schoolId,
      actorId: creator.uid,
      actorRole: creator.role as any,
      actorName: creator.name,
      reason: `Registered ${input.severity} student complaint: "${input.title}" for student ${input.studentName}`,
    });
  } catch (auditErr) {
    console.warn("[ComplaintService] Audit logging warning:", auditErr);
  }

  return {
    ...newComplaint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches student complaints with multi-tenant and role filtering.
 */
export async function getStudentComplaints(filter: {
  schoolId: string;
  studentId?: string;
  studentUid?: string;
  status?: ComplaintStatus;
  limitCount?: number;
}): Promise<StudentComplaint[]> {
  const { schoolId, studentId, studentUid, status, limitCount = 50 } = filter;
  if (!schoolId) return [];

  const db = getFirebaseDb();
  const complaintsColl = collection(db, COMPLAINT_COLLECTION);

  let q = query(
    complaintsColl,
    where("schoolId", "==", schoolId),
    limit(limitCount)
  );

  if (studentUid) {
    q = query(complaintsColl, where("schoolId", "==", schoolId), where("studentUid", "==", studentUid), limit(limitCount));
  } else if (studentId) {
    q = query(complaintsColl, where("schoolId", "==", schoolId), where("studentId", "==", studentId), limit(limitCount));
  }

  const snapshot = await getDocs(q);
  const list: StudentComplaint[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as StudentComplaint;
    if (!status || data.status === status) {
      list.push({ ...data, id: docSnap.id });
    }
  });

  // Sort descending by creation
  return list.sort((a, b) => {
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Updates complaint status (OPEN, UNDER_REVIEW, RESOLVED, DISMISSED) with audit logging.
 */
export async function updateComplaintStatus(
  complaintId: string,
  schoolId: string,
  status: ComplaintStatus,
  actor: { uid: string; name: string; role: string },
  notes?: string
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COMPLAINT_COLLECTION, complaintId);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Complaint record not found.");
  }

  const existing = docSnap.data() as StudentComplaint;
  if (existing.schoolId !== schoolId && actor.role !== "super_admin") {
    throw new Error("Access Denied. Cross-school complaint modification rejected.");
  }

  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (notes !== undefined) {
    updateData.notes = notes.trim();
  }

  if (status === "RESOLVED" || status === "DISMISSED") {
    updateData.resolvedAt = serverTimestamp();
    updateData.resolvedByUid = actor.uid;
    updateData.resolvedByName = actor.name;
  }

  await updateDoc(docRef, updateData);

  // Audit event logging
  try {
    await logAuditEvent({
      action: "UPDATE" as any,
      entityType: "STUDENT" as any,
      entityId: existing.studentId,
      actorSchoolId: schoolId,
      actorId: actor.uid,
      actorRole: actor.role as any,
      actorName: actor.name,
      reason: `Updated complaint #${complaintId} status from ${existing.status} to ${status}`,
    });
  } catch (auditErr) {
    console.warn("[ComplaintService] Audit logging warning:", auditErr);
  }
}

/**
 * Real-time subscription to complaints for an individual student.
 */
export function subscribeToStudentComplaints(
  schoolId: string,
  studentUid: string,
  callback: (complaints: StudentComplaint[]) => void
): () => void {
  if (!schoolId || !studentUid) {
    callback([]);
    return () => {};
  }

  const db = getFirebaseDb();
  const complaintsColl = collection(db, COMPLAINT_COLLECTION);
  const q = query(
    complaintsColl,
    where("schoolId", "==", schoolId),
    where("studentUid", "==", studentUid),
    limit(25)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: StudentComplaint[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as StudentComplaint), id: docSnap.id });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      console.warn("[ComplaintService] Realtime subscription notice:", error);
      callback([]);
    }
  );
}
