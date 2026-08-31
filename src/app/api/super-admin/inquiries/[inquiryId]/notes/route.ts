import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  increment,
} from "firebase/firestore";
import { INQUIRY_COLLECTION, logInquiryActivity } from "@/lib/inquiries";
import { createBillingAuditLog } from "@/lib/billing";

/**
 * POST /api/super-admin/inquiries/[inquiryId]/notes
 * Adds an internal note to an inquiry
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const { inquiryId } = await params;
    const { requireSuperAdmin } = await import("@/lib/auth/serverAuth");
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const authorId = auth.user!.uid;
    const authorEmail = auth.user!.email;
    const authorName = "Super Admin";
    const { note } = body;

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json({ error: "Note content cannot be empty." }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const inquiryRef = doc(db, INQUIRY_COLLECTION, inquiryId);
    const snap = await getDoc(inquiryRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: `Inquiry '${inquiryId}' not found.` }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const noteData = {
      inquiryId,
      authorId,
      authorName,
      authorEmail,
      note: note.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const notesRef = collection(db, INQUIRY_COLLECTION, inquiryId, "notes");
    const docRef = await addDoc(notesRef, noteData);

    // Update parent notesCount
    await updateDoc(inquiryRef, {
      notesCount: increment(1),
      updatedAt: nowIso,
      lastUpdatedBy: authorId,
    });

    // Record activity timeline item
    await logInquiryActivity(inquiryId, {
      actorId: authorId,
      actorName: authorName,
      actorRole: "super_admin",
      action: "INQUIRY_NOTE_ADDED",
      message: `${authorName} added an internal note: "${note.trim().slice(0, 50)}${note.trim().length > 50 ? "..." : ""}"`,
    });

    // Record audit log
    await createBillingAuditLog(
      authorId,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      docRef.id,
      { actionType: "INQUIRY_NOTE_ADDED", inquiryId }
    );

    return NextResponse.json({
      success: true,
      note: { id: docRef.id, ...noteData },
      message: "Internal note added successfully.",
    });
  } catch (error: any) {
    console.error("POST Inquiry Note Error:", error);
    return NextResponse.json(
      { error: "Failed to add internal note: " + (error.message || "") },
      { status: 500 }
    );
  }
}
