import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  normalizeInquiry,
  InquiryStatus,
  InquiryPriority,
  LEGAL_INQUIRY_TRANSITIONS,
  INQUIRY_COLLECTION,
  LEGACY_COLLECTION,
  logInquiryActivity,
  InquiryNote,
  InquiryActivity,
} from "@/lib/inquiries";
import { createBillingAuditLog } from "@/lib/billing";

/**
 * GET /api/super-admin/inquiries/[inquiryId]
 * Returns full inquiry detail + internal notes subcollection + activity timeline
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> | { inquiryId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ inquiryId: "" }));
    const inquiryId = resolvedParams?.inquiryId;
    if (!inquiryId) {
      return NextResponse.json({ error: "Inquiry ID is required." }, { status: 400 });
    }

    let inquiryData: any = null;
    let notes: InquiryNote[] = [];
    let activities: InquiryActivity[] = [];

    // Tier 1: Admin SDK
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      try {
        let snap = await adminDb.collection(INQUIRY_COLLECTION).doc(inquiryId).get();
        if (!snap.exists) {
          snap = await adminDb.collection(LEGACY_COLLECTION).doc(inquiryId).get();
        }
        if (snap.exists) {
          inquiryData = { id: snap.id, ...snap.data() };

          // Notes
          try {
            const notesSnap = await adminDb
              .collection(INQUIRY_COLLECTION)
              .doc(inquiryId)
              .collection("notes")
              .orderBy("createdAt", "desc")
              .get();
            notes = notesSnap.docs.map((d) => ({
              id: d.id,
              inquiryId,
              authorId: d.data().authorId || "admin",
              authorName: d.data().authorName || "Super Admin",
              authorEmail: d.data().authorEmail || "",
              note: d.data().note || "",
              createdAt: d.data().createdAt || new Date().toISOString(),
              updatedAt: d.data().updatedAt || new Date().toISOString(),
            }));
          } catch (ne) {
            // Non-blocking
          }

          // Activities
          try {
            const actSnap = await adminDb
              .collection(INQUIRY_COLLECTION)
              .doc(inquiryId)
              .collection("activities")
              .orderBy("timestamp", "desc")
              .get();
            activities = actSnap.docs.map((d) => ({
              id: d.id,
              inquiryId,
              actorId: d.data().actorId || "system",
              actorName: d.data().actorName || "System",
              actorRole: d.data().actorRole || "super_admin",
              action: d.data().action || "INQUIRY_CREATED",
              message: d.data().message || "",
              before: d.data().before,
              after: d.data().after,
              timestamp: d.data().timestamp || new Date().toISOString(),
            }));
          } catch (ae) {
            // Non-blocking
          }
        }
      } catch (adminErr) {
        console.warn("Notice: adminDb inquiry lookup notice:", adminErr);
      }
    }

    // Tier 2: Client SDK fallback
    if (!inquiryData) {
      try {
        const db = getFirebaseDb();
        if (db) {
          let snap = await getDoc(doc(db, INQUIRY_COLLECTION, inquiryId)).catch(() => null);
          if (!snap?.exists()) {
            snap = await getDoc(doc(db, LEGACY_COLLECTION, inquiryId)).catch(() => null);
          }
          if (snap?.exists()) {
            inquiryData = { id: snap.id, ...snap.data() };

            try {
              const notesSnap = await getDocs(
                query(collection(db, INQUIRY_COLLECTION, inquiryId, "notes"), orderBy("createdAt", "desc"))
              ).catch(() => null);
              if (notesSnap && notesSnap.docs) {
                notes = notesSnap.docs.map((d) => {
                  const data = d.data();
                  return {
                    id: d.id,
                    inquiryId,
                    authorId: data.authorId || "admin",
                    authorName: data.authorName || "Super Admin",
                    authorEmail: data.authorEmail || "",
                    note: data.note || "",
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || new Date().toISOString(),
                  };
                });
              }
            } catch (ne) {
              // Non-blocking
            }

            try {
              const actSnap = await getDocs(
                query(collection(db, INQUIRY_COLLECTION, inquiryId, "activities"), orderBy("timestamp", "desc"))
              ).catch(() => null);
              if (actSnap && actSnap.docs) {
                activities = actSnap.docs.map((d) => {
                  const data = d.data();
                  return {
                    id: d.id,
                    inquiryId,
                    actorId: data.actorId || "system",
                    actorName: data.actorName || "System",
                    actorRole: data.actorRole || "super_admin",
                    action: data.action || "INQUIRY_CREATED",
                    message: data.message || "",
                    before: data.before,
                    after: data.after,
                    timestamp: data.timestamp || new Date().toISOString(),
                  };
                });
              }
            } catch (ae) {
              // Non-blocking
            }
          }
        }
      } catch (clientErr) {
        console.warn("Notice: clientDb inquiry lookup notice:", clientErr);
      }
    }

    // Tier 3: Direct REST lookup
    if (!inquiryData) {
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${INQUIRY_COLLECTION}/${inquiryId}${apiKey ? `?key=${apiKey}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const fields = json.fields || {};
          const data: any = {};
          for (const [k, v] of Object.entries(fields) as any) {
            if (v.stringValue !== undefined) data[k] = v.stringValue;
            else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
            else if (v.integerValue !== undefined) data[k] = parseInt(v.integerValue, 10);
            else if (v.timestampValue !== undefined) data[k] = v.timestampValue;
          }
          inquiryData = { id: inquiryId, ...data };
        }
      } catch (restErr) {
        // Non-blocking
      }
    }

    if (!inquiryData) {
      return NextResponse.json({ error: `Inquiry '${inquiryId}' not found.` }, { status: 404 });
    }

    const inquiry = normalizeInquiry(inquiryData.id, inquiryData);

    if (activities.length === 0) {
      activities.push({
        id: "act_initial",
        inquiryId,
        actorId: "system",
        actorName: inquiry.name,
        actorRole: "user",
        action: "INQUIRY_CREATED",
        message: `Inquiry created from ${inquiry.source || "Contact Form"}`,
        timestamp: inquiry.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      inquiry,
      notes,
      activities,
    });
  } catch (error: any) {
    console.error("GET Inquiry Detail notice:", error);
    return NextResponse.json(
      { error: "Inquiry temporarily unavailable: " + (error.message || "") },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/super-admin/inquiries/[inquiryId]
 * Updates status, priority, admin assignment, view state, or archive status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> | { inquiryId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ inquiryId: "" }));
    const inquiryId = resolvedParams?.inquiryId;
    if (!inquiryId) {
      return NextResponse.json({ error: "Inquiry ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      status,
      priority,
      assignedTo,
      assignedToName,
      actionType,
      actorId = "super_admin",
      actorName = "Super Admin",
    } = body;

    let targetRef: any = null;
    let snapData: any = null;
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const snap = await adminDb.collection(INQUIRY_COLLECTION).doc(inquiryId).get();
      if (snap.exists) {
        snapData = snap.data();
      } else {
        const legSnap = await adminDb.collection(LEGACY_COLLECTION).doc(inquiryId).get();
        if (legSnap.exists) snapData = legSnap.data();
      }
    }

    const db = getFirebaseDb();
    if (!snapData && db) {
      const docRef = doc(db, INQUIRY_COLLECTION, inquiryId);
      let snap: any = await getDoc(docRef).catch(() => null);
      targetRef = docRef;
      if (!snap?.exists()) {
        targetRef = doc(db, LEGACY_COLLECTION, inquiryId);
        snap = await getDoc(targetRef).catch(() => null);
      }
      if (snap?.exists()) {
        snapData = snap.data();
      }
    }

    if (!snapData) {
      return NextResponse.json({ error: `Inquiry '${inquiryId}' not found.` }, { status: 404 });
    }

    const currentInquiry = normalizeInquiry(inquiryId, snapData);
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: nowIso,
      lastUpdatedBy: actorId,
    };

    let logMessage = "";
    let activityAction: any = "INQUIRY_STATUS_CHANGED";
    const beforeState: any = {};
    const afterState: any = {};

    if (actionType === "markViewed") {
      if (!currentInquiry.viewedAt) {
        updatePayload.viewedAt = nowIso;
        updatePayload.viewedBy = actorId;
        logMessage = `${actorName} opened and viewed the inquiry.`;
        activityAction = "INQUIRY_VIEWED";
      }
    }

    if (status && status !== currentInquiry.status) {
      const targetStatus = status.toUpperCase() as InquiryStatus;
      const allowedTransitions = LEGAL_INQUIRY_TRANSITIONS[currentInquiry.status] || [];

      if (!allowedTransitions.includes(targetStatus)) {
        return NextResponse.json(
          {
            error: `Illegal status transition from '${currentInquiry.status}' to '${targetStatus}'. Allowed: ${allowedTransitions.join(", ")}`,
          },
          { status: 400 }
        );
      }

      beforeState.status = currentInquiry.status;
      afterState.status = targetStatus;
      updatePayload.status = targetStatus;

      if (targetStatus === "RESOLVED") {
        updatePayload.resolvedAt = nowIso;
        updatePayload.resolvedBy = actorId;
        logMessage = `${actorName} marked the inquiry as RESOLVED.`;
        activityAction = "INQUIRY_RESOLVED";
      } else if (targetStatus === "CLOSED") {
        updatePayload.closedAt = nowIso;
        updatePayload.closedBy = actorId;
        logMessage = `${actorName} CLOSED the inquiry.`;
        activityAction = "INQUIRY_CLOSED";
      } else if (currentInquiry.status === "RESOLVED" || currentInquiry.status === "CLOSED") {
        updatePayload.resolvedAt = null;
        updatePayload.resolvedBy = null;
        updatePayload.closedAt = null;
        updatePayload.closedBy = null;
        logMessage = `${actorName} REOPENED the inquiry (Status: ${targetStatus}).`;
        activityAction = "INQUIRY_REOPENED";
      } else {
        logMessage = `${actorName} changed status from ${currentInquiry.status} to ${targetStatus}.`;
        activityAction = "INQUIRY_STATUS_CHANGED";
      }
    }

    if (priority && priority !== currentInquiry.priority) {
      const targetPriority = priority.toUpperCase() as InquiryPriority;
      beforeState.priority = currentInquiry.priority;
      afterState.priority = targetPriority;
      updatePayload.priority = targetPriority;
      logMessage = logMessage || `${actorName} updated priority to ${targetPriority}.`;
      if (activityAction === "INQUIRY_STATUS_CHANGED") activityAction = "INQUIRY_PRIORITY_CHANGED";
    }

    if (assignedTo !== undefined && assignedTo !== currentInquiry.assignedTo) {
      beforeState.assignedTo = currentInquiry.assignedTo;
      afterState.assignedTo = assignedTo;

      if (assignedTo === null || assignedTo === "") {
        updatePayload.assignedTo = null;
        updatePayload.assignedToName = null;
        updatePayload.assignedAt = null;
        updatePayload.assignedBy = null;
        logMessage = logMessage || `${actorName} unassigned the inquiry.`;
        activityAction = "INQUIRY_UNASSIGNED";
      } else {
        updatePayload.assignedTo = assignedTo;
        updatePayload.assignedToName = assignedToName || "Admin Member";
        updatePayload.assignedAt = nowIso;
        updatePayload.assignedBy = actorId;
        logMessage = logMessage || `${actorName} assigned inquiry to ${assignedToName || "Admin Member"}.`;
        activityAction = "INQUIRY_ASSIGNED";
      }
    }

    if (actionType === "archive") {
      updatePayload.isArchived = true;
      logMessage = `${actorName} archived the inquiry.`;
      activityAction = "INQUIRY_ARCHIVED";
    } else if (actionType === "unarchive") {
      updatePayload.isArchived = false;
      logMessage = `${actorName} restored the inquiry from archive.`;
      activityAction = "INQUIRY_REOPENED";
    }

    // Persist updates
    if (adminDb) {
      await adminDb.collection(INQUIRY_COLLECTION).doc(inquiryId).set(updatePayload, { merge: true }).catch(() => {});
    } else if (targetRef) {
      await updateDoc(targetRef, updatePayload).catch(() => {});
    }

    // Record Activity Timeline Item
    if (logMessage) {
      await logInquiryActivity(inquiryId, {
        actorId,
        actorName,
        actorRole: "super_admin",
        action: activityAction,
        message: logMessage,
        before: beforeState,
        after: afterState,
      }).catch(() => {});
    }

    // Record Audit Log
    await createBillingAuditLog(
      actorId,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      inquiryId,
      { actionType: activityAction, before: beforeState, after: afterState }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      inquiry: { ...currentInquiry, ...updatePayload },
      message: logMessage || "Inquiry updated successfully.",
    });
  } catch (error: any) {
    console.error("PATCH Inquiry Error:", error);
    return NextResponse.json(
      { error: "Failed to update inquiry: " + (error.message || "") },
      { status: 500 }
    );
  }
}
