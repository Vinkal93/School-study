import { NextResponse } from "next/server";
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
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const { inquiryId } = await params;
    if (!inquiryId) {
      return NextResponse.json({ error: "Inquiry ID is required." }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    let snap = await getDoc(doc(db, INQUIRY_COLLECTION, inquiryId));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, LEGACY_COLLECTION, inquiryId));
    }

    if (!snap.exists()) {
      return NextResponse.json({ error: `Inquiry '${inquiryId}' not found.` }, { status: 404 });
    }

    const inquiry = normalizeInquiry(snap.id, snap.data());

    // Fetch Internal Notes
    const notes: InquiryNote[] = [];
    try {
      const notesSnap = await getDocs(
        query(collection(db, INQUIRY_COLLECTION, inquiryId, "notes"), orderBy("createdAt", "desc"))
      );
      notesSnap.forEach((d) => {
        const data = d.data();
        notes.push({
          id: d.id,
          inquiryId,
          authorId: data.authorId || "admin",
          authorName: data.authorName || "Super Admin",
          authorEmail: data.authorEmail || "",
          note: data.note || "",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
    } catch (e) {
      console.warn("Notice: Internal notes fetch notice:", e);
    }

    // Fetch Activity Timeline
    const activities: InquiryActivity[] = [];
    try {
      const actSnap = await getDocs(
        query(collection(db, INQUIRY_COLLECTION, inquiryId, "activities"), orderBy("timestamp", "desc"))
      );
      actSnap.forEach((d) => {
        const data = d.data();
        activities.push({
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
        });
      });
    } catch (e) {
      console.warn("Notice: Activity timeline fetch notice:", e);
    }

    // Default timeline item if none present
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
    console.error("GET Inquiry Detail Error:", error);
    return NextResponse.json(
      { error: "Failed to load inquiry detail: " + (error.message || "") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/inquiries/[inquiryId]
 * Updates status, priority, admin assignment, view state, or archive status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const { inquiryId } = await params;
    const body = await request.json();

    const {
      status,
      priority,
      assignedTo,
      assignedToName,
      actionType, // "markViewed", "resolve", "close", "reopen", "archive"
      actorId = "super_admin",
      actorName = "Super Admin",
    } = body;

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const docRef = doc(db, INQUIRY_COLLECTION, inquiryId);
    let snap = await getDoc(docRef);
    let targetRef = docRef;

    if (!snap.exists()) {
      targetRef = doc(db, LEGACY_COLLECTION, inquiryId);
      snap = await getDoc(targetRef);
    }

    if (!snap.exists()) {
      return NextResponse.json({ error: `Inquiry '${inquiryId}' not found.` }, { status: 404 });
    }

    const currentInquiry = normalizeInquiry(snap.id, snap.data());
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: nowIso,
      lastUpdatedBy: actorId,
    };

    let logMessage = "";
    let activityAction: any = "INQUIRY_STATUS_CHANGED";
    const beforeState: any = {};
    const afterState: any = {};

    // 1. Action Type: Mark Viewed
    if (actionType === "markViewed") {
      if (!currentInquiry.viewedAt) {
        updatePayload.viewedAt = nowIso;
        updatePayload.viewedBy = actorId;
        logMessage = `${actorName} opened and viewed the inquiry.`;
        activityAction = "INQUIRY_VIEWED";
      }
    }

    // 2. Status Transition Validation
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

    // 3. Priority Transition
    if (priority && priority !== currentInquiry.priority) {
      const targetPriority = priority.toUpperCase() as InquiryPriority;
      beforeState.priority = currentInquiry.priority;
      afterState.priority = targetPriority;
      updatePayload.priority = targetPriority;
      logMessage = logMessage || `${actorName} updated priority to ${targetPriority}.`;
      if (activityAction === "INQUIRY_STATUS_CHANGED") activityAction = "INQUIRY_PRIORITY_CHANGED";
    }

    // 4. Assignment Transition
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

    // 5. Archive / Unarchive
    if (actionType === "archive") {
      updatePayload.isArchived = true;
      logMessage = `${actorName} archived the inquiry.`;
      activityAction = "INQUIRY_ARCHIVED";
    } else if (actionType === "unarchive") {
      updatePayload.isArchived = false;
      logMessage = `${actorName} restored the inquiry from archive.`;
      activityAction = "INQUIRY_REOPENED";
    }

    // Perform Update
    await updateDoc(targetRef, updatePayload);

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
      });
    }

    // Record Audit Log
    await createBillingAuditLog(
      actorId,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      inquiryId,
      { actionType: activityAction, before: beforeState, after: afterState }
    );

    // Return Updated Object
    const updatedSnap = await getDoc(targetRef);
    const updatedInquiry = normalizeInquiry(updatedSnap.id, updatedSnap.data());

    return NextResponse.json({
      success: true,
      inquiry: updatedInquiry,
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
